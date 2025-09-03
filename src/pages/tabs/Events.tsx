// src/pages/tabs/Events.tsx

import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonModal,
  IonInput,
  IonLabel,
  IonItem,
  IonList,
  IonToast,
  IonSelect,
  IonSelectOption,
  IonIcon,
  useIonViewWillEnter,
  IonFab,
  IonFabButton,
  IonSkeletonText,
} from "@ionic/react";
import { add } from "ionicons/icons";
import { useAuth } from "@/hooks/useAuth";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { getAllGroups } from "@/services/groups";
import { createEvent, getAllEvents } from "@/services/events";
import { getUserById } from "@/services/users";
import {
  firestoreTimestampToDate,
  dateToFirestoreTimestamp,
} from "@/utils/timeFormatter";
import { GroupDoc, GroupEventDoc } from "@/interfaces/firestore";
import { calendarOutline, people } from "ionicons/icons";
import "./Events.css";
import { generateHashedGradient } from "@/utils/colorGenerator";

interface EventWithId extends GroupEventDoc {
  id: string;
  groupId: string;
  groupName?: string;
  hostName?: string;
  group: GroupDoc;
}

const Events: React.FC = () => {
  const { user } = useAuth();

  const [events, setEvents] = useState<EventWithId[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [groupId, setGroupId] = useState("");
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>(
    []
  );

  useIonViewWillEnter(() => {
    fetchEvents();
    fetchGroups();
  });

  // Events laden
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const fetchedEvents = await getAllEvents();
      const allGroups = await getAllGroups();

      const groupMap = allGroups.reduce((acc, group) => {
        acc[group.id] = group;
        return acc;
      }, {} as Record<string, GroupDoc>);

      const enrichedEvents = await Promise.all(
        fetchedEvents.map(async (event) => {
          const group = groupMap[event.groupId];
          let hostName = event.host;
          try {
            const user = await getUserById(event.host);
            if (user?.displayName) {
              hostName = user.displayName;
            }
          } catch (err) {
            console.warn("Fehler beim Laden des Host-Users:", err);
          }

          return {
            ...event,
            group: group || { id: event.groupId, name: "Unbekannte Gruppe" }, // fallback
            groupName: group?.name || "Unbekannte Gruppe",
            hostName,
          };
        })
      );
      
      enrichedEvents.sort(
  (a, b) =>
    firestoreTimestampToDate(a.datetime).getTime() -
    firestoreTimestampToDate(b.datetime).getTime()
);

      setEvents(enrichedEvents);
    } catch (err) {
      console.error(err);
      setToastMessage("Fehler beim Laden der Termine");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  // Gruppen laden
  const fetchGroups = async () => {
    try {
      const groups = await getAllGroups();
      setAllGroups(groups.map((group) => ({ id: group.id, name: group.name })));
    } catch (err) {
      console.error(err);
      setToastMessage("Fehler beim Laden der Gruppen");
      setShowToast(true);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    await fetchEvents();
    await fetchGroups();
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const handleRefresh = async (event: CustomEvent) => {
    await fetchEvents();
    event.detail.complete();
  };

  const handleSubmit = async () => {
    if (!user || !name || !date || !location || !groupId) {
      setToastMessage("Bitte alle Felder ausfüllen.");
      setShowToast(true);
      return;
    }

    const parsedDate = new Date(date);

    const newEvent: Omit<GroupEventDoc, "host"> = {
      name,
      datetime: dateToFirestoreTimestamp(parsedDate),
      location,
      createdAt: dateToFirestoreTimestamp(new Date()),
      gameSuggestions: [],
      participantIds: [user.uid],
    };

    try {
      await createEvent(groupId, newEvent); // Event wird erstellt
      await fetchEvents(); // Events neu laden
      setToastMessage("Termin erfolgreich erstellt!");
      setShowModal(false);
    } catch (error) {
      console.error(error);
      setToastMessage("Fehler beim Erstellen des Termins");
    } finally {
      setShowToast(true);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Spieltermine</IonTitle>
          <IonButtons slot="end">
            <UserProfileDropdown user={user} />
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading ? (
          <div className="events-list">
            {[...Array(3)].map((_, i) => (
              <IonCard key={i} className="event-card">
                <IonCardHeader>
                  <IonSkeletonText animated style={{ width: "60%" }} />
                  <IonSkeletonText animated style={{ width: "40%" }} />
                </IonCardHeader>
                <IonCardContent>
                  <IonSkeletonText animated style={{ width: "80%" }} />
                  <IonSkeletonText animated style={{ width: "50%" }} />
                  <IonSkeletonText animated style={{ width: "70%" }} />
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="events-list">
            {events.map((event) => (
              <IonCard
                key={event.id}
                className="event-card"
                routerLink={`/groups/${event.groupId}/events/${event.id}`}
                button
              >
                <div className="event-card-header">
                  {event.group.imageURL ? (
                    <img
                      src={event.group.imageURL}
                      alt={event.group.name}
                      className="group-image"
                    />
                  ) : (
                    <div
                      className="default-event-image"
                      style={{
                        background: generateHashedGradient(event.group.id || event.id),
                      }}
                    >
                      <IonIcon icon={people} />
                    </div>
                  )}
                </div>
                <IonCardHeader>
                  <IonCardTitle>{event.name}</IonCardTitle>
                  <IonCardSubtitle>
                    {event.group.name}
                  </IonCardSubtitle>
                </IonCardHeader>
                <IonCardContent className="event-card-content">
                  <p className="event-info">
                    <strong>Datum:</strong>{" "}
                    {firestoreTimestampToDate(event.datetime).toLocaleString("de-DE")}
                  </p>
                  <p className="event-info">
                    <strong>Ort:</strong> {event.location}
                  </p>
                  <p className="event-info">
                    <strong>Gastgeber:</strong> {event.hostName || event.host}  
                  </p>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        ) : (
          <div className="empty-events-container">
            <IonIcon icon={calendarOutline} className="empty-icon" />
            <h2>Keine Termine</h2>
            <p>Du kannst jetzt einen neuen Spieltermin anlegen.</p>
          </div>
        )}

        {/* FAB Button for creating new event */}
        {user && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed" className="fab-padding">
            <IonFabButton onClick={() => setShowModal(true)}>
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}

        {/* Modal für neuen Termin */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Neuer Spieltermin</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Abbrechen</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Name des Events</IonLabel>
                <IonInput value={name} onIonChange={(e) => setName(e.detail.value!)} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Datum & Uhrzeit</IonLabel>
                <IonInput type="datetime-local" value={date} onIonChange={(e) => setDate(e.detail.value!)} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Ort</IonLabel>
                <IonInput value={location} onIonChange={(e) => setLocation(e.detail.value!)} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Gruppe</IonLabel>
                <IonSelect value={groupId} onIonChange={(e) => setGroupId(e.detail.value)}>
                  <IonSelectOption value="">Bitte wählen</IonSelectOption>
                  {allGroups.map((group) => (
                    <IonSelectOption key={group.id} value={group.id}>
                      {group.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </IonList>
            <div className="ion-padding">
              <IonButton expand="block" onClick={handleSubmit}>
                Termin erstellen
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

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

export default Events;
