import React, { useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonDatetime,
  IonButton,
  useIonRouter
} from '@ionic/react';

const Tab2: React.FC = () => {
  const [host, setHost] = useState('');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState('');
  const router = useIonRouter();

  const saveEvent = () => {
    if (!dateTime || !host || !location) {
      alert('Bitte alle Felder ausfüllen!');
      return;
    }

    const eventData = {
      date: new Date(dateTime).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      time: new Date(dateTime).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      host,
      location,
    };

    localStorage.setItem('nextGameEvent', JSON.stringify(eventData));
    alert('Spieltermin gespeichert!');
    router.push('/tab1', 'back'); // Zurück zu Tab1
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Neuen Spieltermin erstellen</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">

        <IonItem>
          <IonLabel position="stacked">Datum & Uhrzeit</IonLabel>
          <IonDatetime
            presentation="date-time"
            value={dateTime || undefined}
            onIonChange={e => {
              const value = e.detail.value;
              if (typeof value === 'string') {
                setDateTime(value);
              }
            }}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Gastgeber:in</IonLabel>
          <IonInput
            value={host}
            placeholder="z. B. Lisa"
            onIonChange={e => setHost(e.detail.value!)}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Adresse</IonLabel>
          <IonInput
            value={location}
            placeholder="z. B. Musterstraße 12"
            onIonChange={e => setLocation(e.detail.value!)}
          />
        </IonItem>

        <IonButton expand="block" onClick={saveEvent} className="ion-margin-top">
          Spieltermin speichern
        </IonButton>

      </IonContent>
    </IonPage>
  );
};

export default Tab2;
