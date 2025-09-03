import React, { useEffect, useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent,
  IonButton, IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonInput, IonLabel, IonItem, IonList, IonToast, IonModal,
  IonAlert, IonLoading
} from "@ionic/react";
import { useParams, useHistory } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  firestoreTimestampToDate, dateToFirestoreTimestamp,
} from "@/utils/timeFormatter";
import {
  getGroupEvents, deleteEvent, updateEvent, suggestGame, voteForGame,
} from "@/services/events";
import { GroupEventDoc, EventRating } from "@/interfaces/firestore";
import { trash, create } from "ionicons/icons";
import "./EventDetails.css";
import { getUserById } from "@/services/users";

interface RouteParams {
  groupId: string;
  eventId: string;
}

const EventDetails: React.FC = () => {
  const { groupId, eventId } = useParams<RouteParams>();
  const history = useHistory();
  const { user } = useAuth();

  const [event, setEvent] = useState<(GroupEventDoc & { id: string }) | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [suggestionInProgress, setSuggestionInProgress] = useState(false);
  const [showSuggestAlert, setShowSuggestAlert] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);

  const [userRating, setUserRating] = useState<EventRating>({ host: 0, food: 0, general: 0 });
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const events = await getGroupEvents(groupId);
      const current = events.find((e) => e.id === eventId);
      if (current) {
        setEvent(current);

        // Fetch host display name
        let hostDisplayName = current.host;
        try {
          const hostUser = await getUserById(current.host);
          if (hostUser?.displayName) {
            hostDisplayName = hostUser.displayName;
          }
        } catch (err) {
          console.warn("Fehler beim Laden des Host-Users:", err);
        }
        setHostName(hostDisplayName);

        if (user && current.ratings?.[user.uid]) {
          setUserRating(current.ratings[user.uid]);
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden des Events", err);
      setToastMessage("Fehler beim Laden");
      setShowToast(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvent();
  }, [groupId, eventId]);

  const handleRatingSubmit = async () => {
    if (!event || !user) return;
    setIsSubmittingRating(true);

    try {
      const updatedRatings = {
        ...(event.ratings || {}),
        [user.uid]: userRating,
      };

      await updateEvent(groupId, eventId, { ratings: updatedRatings });

      setEvent((prev) => prev ? { ...prev, ratings: updatedRatings } : prev);
      setToastMessage("Bewertung gespeichert!");
    } catch (err) {
      console.error("Fehler beim Speichern der Bewertung:", err);
      setToastMessage("Fehler beim Speichern");
    } finally {
      setShowToast(true);
      setIsSubmittingRating(false);
    }
  };



  const handleSave = async () => {
    if (!event || !event.name || !event.datetime) return;

    try {
      await updateEvent(groupId, eventId, {
        name: event.name,
        location: event.location,
        datetime: event.datetime,
      });

      setToastMessage("Event aktualisiert");
	  setShowToast(true);
      setShowEdit(false);
      fetchEvent();
    } catch (err) {
      console.error(err);
      setToastMessage("Aktualisierung fehlgeschlagen");
    } finally {
      setShowToast(true);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEvent(groupId, eventId);
      setToastMessage("Event gelöscht");
	  setShowToast(true);
      history.replace("/events");
    } catch (err) {
      console.error(err);
      setToastMessage("Fehler beim Löschen");
    } finally {
      setShowToast(true);
    }
  };

const handleSuggestSubmit = async (nameInput: string) => {
    const name = (nameInput ?? "").trim();
    if (!name) {
      setToastMessage("Spielname erforderlich");
      setShowToast(true);
      return false;
    }

    try {
      setSuggestionInProgress(true);
      await suggestGame(groupId, eventId, user!.uid, name);

      // Lokales Update statt fetchEvent()
      const newSuggestion = {
        name,
        createdBy: user!.uid,
        createdAt: dateToFirestoreTimestamp(new Date()),
        description: undefined,
        voterIds: [],
      };

      setEvent((prev) =>
        prev
          ? {
              ...prev,
              gameSuggestions: [...prev.gameSuggestions, newSuggestion],
            }
          : prev
      );

      setToastMessage("Spiel vorgeschlagen");
    } catch (err: any) {
      console.error("Fehler beim Vorschlagen:", err?.message ?? err);
      setToastMessage(
        "Fehler beim Vorschlagen: " + (err?.message || "Unbekannt")
      );
    } finally {
      setSuggestionInProgress(false);
      setShowSuggestAlert(false);
      setShowToast(true);
    }
  };

  if (loading || !event) return <IonLoading isOpen={true} message="Lädt..." />;

  const isPast =
    !!event?.datetime &&
    new Date(firestoreTimestampToDate(event.datetime)) < new Date();

  const sortedSuggestions = [...(event.gameSuggestions || [])].sort(
    (a, b) => b.voterIds.length - a.voterIds.length
  );

  const hasUserRated = !!(user && event.ratings?.[user.uid]);

  const ratingsMap = event.ratings || {};
const ratingList = Object.values(ratingsMap);
const ratingCount = ratingList.length;

const sums = ratingList.reduce(
  (acc, r) => ({
    host: acc.host + r.host,
    food: acc.food + r.food,
    general: acc.general + r.general,
  }),
  { host: 0, food: 0, general: 0 }
);

const avgHost = ratingCount ? (sums.host / ratingCount).toFixed(1) : "-";
const avgFood = ratingCount ? (sums.food / ratingCount).toFixed(1) : "-";
const avgGeneral = ratingCount ? (sums.general / ratingCount).toFixed(1) : "-";

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Event Details</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowEdit(true)}>
              <IonIcon icon={create} />
            </IonButton>
            <IonButton color="danger" onClick={() => setConfirmDelete(true)}>
              <IonIcon icon={trash} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>{event.name}</IonCardTitle>
            <IonCardSubtitle>
              {firestoreTimestampToDate(event.datetime).toLocaleString("de-DE")}
            </IonCardSubtitle>
          </IonCardHeader>
          <IonCardContent>            
			<p>
              <strong>Ort:</strong> {event.location || "–"}
            </p>
            <p>
              <strong>Gastgeber:</strong> {hostName}
            </p>
            <p>
              <strong>Teilnehmer:</strong> {event.participantIds?.length}
            </p>
          </IonCardContent>
        </IonCard>

        {!isPast && (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Spielvorschläge</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonButton
                expand="block"
                onClick={() => setShowSuggestAlert(true)}
                disabled={suggestionInProgress}
              >
                Neues Spiel vorschlagen
              </IonButton>
             {sortedSuggestions.length > 0 ? (
                <IonList className="suggestion-list">
                  {sortedSuggestions.map((game) => {
                    const voted = game.voterIds.includes(user?.uid || "");
                    return (
                      <IonItem key={game.name}>
                        <div className="vote-row">
                          <button
                            className={`vote-button ${voted ? "voted" : ""}`}
                            disabled={voted}
                            onClick={async () => {
                              try {
                                await voteForGame(
                                  groupId,
                                  eventId,
                                  user!.uid,
                                  game.name
                                );

                                // Update only the local state
                                setEvent((prev) => {
                                  if (!prev) return prev;

                                  const updatedSuggestions =
                                    prev.gameSuggestions.map((g) =>
                                      g.name === game.name
                                        ? {
                                            ...g,
                                            voterIds: [
                                              ...g.voterIds,
                                              user!.uid,
                                            ],
                                          }
                                        : g
                                    );

                                  return {
                                    ...prev,
                                    gameSuggestions: updatedSuggestions,
                                  };
                                });

                                setToastMessage("Abgestimmt!");
                              } catch (err) {
                                setToastMessage("Fehler beim Abstimmen");
                                console.error(err);
                              } finally {
                                setShowToast(true);
                              }
                            }}
                          />
                          <div className="vote-info">
                            <strong>{game.name}</strong>
                            <progress
                              max={event.participantIds.length}
                              value={game.voterIds.length}
                            ></progress>
                            <span>{game.voterIds.length} Stimme(n)</span>
                          </div>
                        </div>
                      </IonItem>
                    );
                  })}
                </IonList>
              ) : (
                <p>Noch keine Vorschläge vorhanden.</p>
              )}
            </IonCardContent>
          </IonCard>
        )}
		<IonAlert
          isOpen={showSuggestAlert}
          onDidDismiss={() => setShowSuggestAlert(false)}
          header="Spiel vorschlagen"
          inputs={[
            {
              name: "gameName",
              type: "text",
              placeholder: "Spielname",
            },
          ]}
          buttons={[
            {
              text: "Abbrechen",
              role: "cancel",
            },
            {
              text: "Vorschlagen",
              handler: (data) => {
                const name = (data?.gameName ?? "").trim();
                if (!name) {
                  setToastMessage("Spielname erforderlich");
                  setShowToast(true);
                  return false; // keeps alert open
                }
                handleSuggestSubmit(name);
                return true;
              },
            },
          ]}
        />
		
		        <IonModal isOpen={showEdit} onDidDismiss={() => setShowEdit(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Event bearbeiten</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonList>
              <IonItem>
                <IonLabel position="stacked">Name</IonLabel>
                <IonInput
                  value={event.name}
                  onIonInput={(e) =>
                    setEvent({ ...event, name: e.detail.value! })
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Ort</IonLabel>
                <IonInput
                  value={event.location}
                  onIonInput={(e) =>
                    setEvent({ ...event, location: e.detail.value! })
                  }
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Datum & Zeit</IonLabel>
                <IonInput
                  type="datetime-local"
                  value={firestoreTimestampToDate(event.datetime)
                    .toISOString()
                    .slice(0, 16)}
                  onIonChange={(e) =>
                    setEvent({
                      ...event,
                      datetime: dateToFirestoreTimestamp(
                        new Date(e.detail.value!)
                      ),
                    })
                  }
                />
              </IonItem>
            </IonList>
            <div className="ion-padding">
              <IonButton expand="block" onClick={handleSave}>
                Speichern
              </IonButton>
              <IonButton
                expand="block"
                color="medium"
                onClick={() => setShowEdit(false)}
              >
                Abbrechen
              </IonButton>
            </div>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
        />

        <IonAlert
          isOpen={confirmDelete}
          header="Event löschen?"
          message="Dieser Vorgang kann nicht rückgängig gemacht werden."
          buttons={[
            { text: "Abbrechen", role: "cancel" },
            {
              text: "Löschen",
              role: "destructive",
              handler: handleDelete,
            },
          ]}
          onDidDismiss={() => setConfirmDelete(false)}
        />

        {isPast && (
          <IonCard>
            <IonCardHeader><IonCardTitle>Bewertung</IonCardTitle></IonCardHeader>
            <IonCardContent>
              <RatingCategory label="Gastgeber" value={userRating.host} onChange={(val) => setUserRating((prev) => ({ ...prev, host: val }))} />
              <RatingCategory label="Essen & Snacks" value={userRating.food} onChange={(val) => setUserRating((prev) => ({ ...prev, food: val }))} />
              <RatingCategory label="Allgemein" value={userRating.general} onChange={(val) => setUserRating((prev) => ({ ...prev, general: val }))} />
             <IonButton
              expand="block"
              onClick={handleRatingSubmit}
              disabled={isSubmittingRating || hasUserRated}
            >
              {hasUserRated ? "Bewertung abgegeben" : "Bewertung abschicken"}
            </IonButton>
            </IonCardContent>
          </IonCard>
          
        )}

{isPast && ratingCount > 0 && (
  <IonCard>
    <IonCardHeader>
      <IonCardTitle>Durchschnittliche Bewertung</IonCardTitle>
    </IonCardHeader>
    <IonCardContent>
      <p>Gastgeber: {avgHost} ★</p>
      <p>Essen: {avgFood} ★</p>
      <p>Allgemein: {avgGeneral} ★</p>
      <p style={{ color: "var(--ion-color-medium)" }}>
        (basierend auf {ratingCount} Bewertung{ratingCount === 1 ? "" : "en"})
      </p>
    </IonCardContent>
  </IonCard>
)}


      </IonContent>
    </IonPage>
  );
};

export default EventDetails;

interface RatingCategoryProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

const RatingCategory: React.FC<RatingCategoryProps> = ({ label, value, onChange }) => {
  return (
    <div className="rating-category">
      <IonLabel>{label}</IonLabel>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((num) => (
          <span
            key={num}
            className={num <= value ? "star filled" : "star"}
            onClick={() => onChange(num)}
            style={{ cursor: "pointer", fontSize: "1.5rem" }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
};
