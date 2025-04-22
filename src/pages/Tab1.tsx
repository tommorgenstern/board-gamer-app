import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonActionSheet,
  IonRouterLink,
  useIonViewWillEnter
} from '@ionic/react';

const Tab1: React.FC = () => {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [nextEvent, setNextEvent] = useState<null | {
    date: string;
    time: string;
    host: string;
    location: string;
  }>(null);

  useIonViewWillEnter(() => {
    const storedEvent = localStorage.getItem('nextGameEvent');
    if (storedEvent) {
      setNextEvent(JSON.parse(storedEvent));
    }
  });

  const actionSheetButtons = [
    {
      text: 'Absagen',
      role: 'destructive',
      handler: () => {
        console.log('Absage geschickt');
      }
    },
    {
      text: 'Nachricht senden',
      handler: () => {
        console.log('Nachricht gesendet');
      }
    },
    {
      text: 'Abbrechen',
      role: 'cancel'
    }
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Spieltermin</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        {nextEvent ? (
          <IonCard>
            <IonCardHeader>
              <IonCardSubtitle>Nächster Termin</IonCardSubtitle>
              <IonCardTitle>{nextEvent.date} – {nextEvent.time}</IonCardTitle>
            </IonCardHeader>
            <div className="ion-padding">
              <p><strong>Gastgeber:</strong> {nextEvent.host}</p>
              <p><strong>Adresse:</strong> {nextEvent.location}</p>
              <IonButton expand="block" onClick={() => setShowActionSheet(true)}>
                Ich komme zu spät
              </IonButton>
            </div>
          </IonCard>
        ) : (
          <p className="ion-padding">Noch kein Spieltermin eingetragen.</p>
        )}

        <IonRouterLink routerLink="/tab2" routerDirection="forward">
          <IonButton expand="block" color="medium">
            Neuen Termin erstellen
          </IonButton>
        </IonRouterLink>


        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          header="Aktion wählen"
          buttons={actionSheetButtons}
        />
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
