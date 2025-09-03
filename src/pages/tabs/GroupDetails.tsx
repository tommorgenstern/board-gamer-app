import React, { useEffect, useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
  IonButton, IonList, IonItem, IonLabel, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonIcon, IonToast, IonLoading, IonModal, IonInput
} from "@ionic/react";
import { calendar, people, pencil } from "ionicons/icons";

import { useParams } from "react-router";
import { getGroupById, updateGroup, joinGroup, leaveGroup } from "@/services/groups";
import { addUserToFutureEvents, getGroupEvents, removeUserFromFutureEvents } from "@/services/events";
import { useAuth } from "@/hooks/useAuth";
import { firestoreTimestampToDate } from "@/utils/timeFormatter";
import { GroupDoc, GroupEventDoc } from "@/interfaces/firestore";
import { getUserById } from "@/services/users";

interface RouteParams {
  groupId: string;
}

interface GroupWithId extends GroupDoc {
  id: string;
}

interface EventWithId extends GroupEventDoc {
  id: string;
}

interface MemberWithName {
  id: string;
  displayName: string;
}

const GroupDetails: React.FC = () => {
  const { groupId } = useParams<RouteParams>();
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupWithId | null>(null);
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [members, setMembers] = useState<MemberWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const groupData = await getGroupById(groupId);
      if (groupData) {
        setGroup(groupData);
        setEditedGroupName(groupData.name);
        
        // Fetch member display names
        const memberPromises = groupData.memberIds.map(async (memberId) => {
          let displayName = memberId; // fallback to ID
          try {
            const user = await getUserById(memberId);
            if (user?.displayName) {
              displayName = user.displayName;
            }
          } catch (err) {
            console.warn("Fehler beim Laden des Members:", err);
          }
          return { id: memberId, displayName };
        });
        
        const membersWithNames = await Promise.all(memberPromises);
        setMembers(membersWithNames);
      }
      const eventData = await getGroupEvents(groupId);
      setEvents(eventData);
    } catch (err) {
      console.error(err);
      setToastMessage("Fehler beim Laden der Gruppendaten.");
      setShowToast(true);
    }
    setLoading(false);
  };

  const handleSaveChanges = async () => {
    if (!group) return;
    try {
      await updateGroup(groupId, { name: editedGroupName });
      setShowEditModal(false);
      setToastMessage("Gruppe aktualisiert");
      setShowToast(true);
      await loadGroup();
    } catch (err) {
      console.error(err);
      setToastMessage("Fehler beim Aktualisieren");
      setShowToast(true);
    }
  };


const handleJoinGroup = async () => {
  if (!group || !user) return;
  try {
    await joinGroup(group.id, user.uid);          // Service: User zur Gruppe hinzufügen
    await addUserToFutureEvents(group.id, user.uid); // Service: User auch in zukünftige Events eintragen
    await loadGroup(); // Gruppe + Mitglieder neu laden
    setToastMessage("Beitritt erfolgreich!");
  } catch (err) {
    console.error("Fehler beim Beitreten:", err);
    setToastMessage("Beitritt fehlgeschlagen.");
  } finally {
    setShowToast(true);
  }
};

const handleLeaveGroup = async () => {
  if (!user || !group) return;
  try {
    await leaveGroup(group.id, user.uid);
    await removeUserFromFutureEvents(group.id, user.uid);
    setToastMessage("Du hast die Gruppe verlassen.");
    setShowToast(true);
    await loadGroup(); // Ansicht aktualisieren
  } catch (err: any) {
    console.error("[leaveGroup] Fehler:", err);
    setToastMessage(err?.message || "Austritt fehlgeschlagen");
    setShowToast(true);
  }
};


const isMember = !!(group && user && group.memberIds?.includes(user.uid));


  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Gruppendetails</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {loading ? (
          <IonLoading isOpen={loading} message="Lade Daten..." />
        ) : group ? (
          <>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{group.name}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p><IonIcon icon={people} /> Mitglieder: {group.memberIds?.length}</p>
            <p><IonIcon icon={calendar} /> Erstellt am: {firestoreTimestampToDate(group.createdAt).toLocaleDateString("de-DE")}</p>

            {/* Wenn User noch kein Mitglied ist: Beitritts-Button */}
            {!isMember && user && (
              <IonButton expand="block" onClick={handleJoinGroup}>
                Gruppe beitreten
              </IonButton>
            )}

            {group && user && group.memberIds?.includes(user.uid) && (
              <IonButton color="danger" fill="outline" onClick={handleLeaveGroup} style={{ marginTop: 8 }}>
                Gruppe verlassen
              </IonButton>
            )}


            <IonButton fill="outline" onClick={() => setShowEditModal(true)} style={{ marginLeft: 8 }}>
              <IonIcon icon={pencil} slot="start" />
              Gruppe bearbeiten
            </IonButton>
          </IonCardContent>
        </IonCard>


            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Mitglieder</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonList>
                  {members.map((member) => (
                    <IonItem key={member.id}>
                      <IonLabel>{member.displayName}</IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Events</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
              <IonList>
                {events.length > 0 ? (
                  events.map(event => (
                    <IonItem
                      key={event.id}
                      routerLink={`/groups/${groupId}/events/${event.id}`}
                      detail
                    >
                      <IonLabel>
                        <h2>{event.name}</h2>
                        <p>{firestoreTimestampToDate(event.datetime).toLocaleString("de-DE")}</p>
                        <p>{event.location}</p>
                      </IonLabel>
                    </IonItem>
                  ))
                ) : (
                  <p>Keine Events vorhanden</p>
                )}
              </IonList>
              </IonCardContent>
            </IonCard>

            {/* Edit Modal */}
            <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)}>
              <IonHeader>
                <IonToolbar>
                  <IonTitle>Gruppe bearbeiten</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setShowEditModal(false)}>Schließen</IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>
              <IonContent>
                <IonList>
                  <IonItem>
                    <IonLabel position="stacked">Gruppenname</IonLabel>
                    <IonInput
                      value={editedGroupName}
                      onIonInput={(e) => setEditedGroupName(e.detail.value || "")}
                    />
                  </IonItem>
                </IonList>
                <div className="ion-padding">
                  <IonButton expand="block" onClick={handleSaveChanges}>Speichern</IonButton>
                </div>
              </IonContent>
            </IonModal>
          </>
        ) : (
          <p>Gruppe nicht gefunden.</p>
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
        />
      </IonContent>
    </IonPage>
  );
};

export default GroupDetails;
