import { FirebaseFirestore } from "@capacitor-firebase/firestore";
import { COLLECTIONS } from "@/constants/firebase";
import { GroupEventDoc, GameSuggestion } from "@/interfaces/firestore";
import { dateToFirestoreTimestamp, firestoreTimestampToDate } from "@/utils/timeFormatter";
import { getGroupById } from "./groups";
import { EventRating } from "@/interfaces/firestore";

/**
 * Create a new event inside a group
 * Rotation logic for host can optionally be added here.
 */
export const createEvent = async (
  groupId: string,
  event: Omit<GroupEventDoc, "host">
): Promise<string> => {
  if (!groupId || !event || !event.name || !event.datetime) {
    throw new Error("Missing required event fields");
  }

  try {
    // get group to determine next host
    const group = await getGroupById(groupId);
    if (!group || !group.memberIds || group.memberIds.length === 0) {
      throw new Error("Group not found or has no members");
    }

    const memberIds = group.memberIds;

    // get last created event to determine next host
    const result = await FirebaseFirestore.getCollection({
      reference: `${COLLECTIONS.GROUPS}/${groupId}/events`,
      queryConstraints: [
        { type: "orderBy", fieldPath: "createdAt", directionStr: "desc" },
        { type: "limit", limit: 1 },
      ],
    });

    let nextHost = memberIds[0]; // Standard: first member as host

    if (result.snapshots.length > 0) {
      const lastEvent = result.snapshots[0].data as GroupEventDoc;
      const lastHost = lastEvent.host;
      const index = memberIds.indexOf(lastHost);
      const nextIndex = (index + 1) % memberIds.length;
      nextHost = memberIds[nextIndex];
    }

    // store Event with next host
    console.log("Next host for event:", nextHost);
    const eventData: GroupEventDoc = {
      ...event,
      createdAt: dateToFirestoreTimestamp(new Date()),
      host: nextHost,
    };

    const docRef = await FirebaseFirestore.addDocument({
      reference: `${COLLECTIONS.GROUPS}/${groupId}/events`,
      data: eventData,
    });

    const pathParts = docRef.reference.path.split("/");
    return pathParts[pathParts.length - 1];
  } catch (error) {
    console.error("Error creating event with rotation:", error);
    throw new Error("Failed to create event");
  }
};

/**
 * Load all events from all groups (for Events Tab)
 */
export const getAllEvents = async (): Promise<({ id: string; groupId: string } & GroupEventDoc)[]> => {
  try {
    const groupResult = await FirebaseFirestore.getCollection({
      reference: COLLECTIONS.GROUPS,
    });

    const allEvents: ({ id: string; groupId: string } & GroupEventDoc)[] = [];

    for (const groupDoc of groupResult.snapshots) {
      const groupId = groupDoc.id;
      const eventsRef = `${COLLECTIONS.GROUPS}/${groupId}/events`;

      const eventsResult = await FirebaseFirestore.getCollection({
      reference: eventsRef,
      queryConstraints: [
        { type: "orderBy", fieldPath: "datetime", directionStr: "asc" },
      ],
    });

      for (const eventDoc of eventsResult.snapshots) {
        allEvents.push({
          id: eventDoc.id,
          groupId,
          ...eventDoc.data,
        } as GroupEventDoc & { id: string; groupId: string });
      }
    }

    return allEvents;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};

/**
 * Load all events for a specific group (for GroupDetails)
 */
export const getGroupEvents = async (
  groupId: string
): Promise<(GroupEventDoc & { id: string })[]> => {
  try {
    const result = await FirebaseFirestore.getCollection({
      reference: `${COLLECTIONS.GROUPS}/${groupId}/events`,
      queryConstraints: [
        { type: "orderBy", fieldPath: "datetime", directionStr: "asc" },
      ],
    });

    return result.snapshots.map((doc: any) => ({
      id: doc.id,
      ...doc.data,
    }));
  } catch (error) {
    console.error("Error fetching group events:", error);
    return [];
  }
};

/**
 * Allow updating of events
 */

export const updateEvent = async (
  groupId: string,
  eventId: string,
  updatedData: Partial<GroupEventDoc>
): Promise<void> => {
  await FirebaseFirestore.updateDocument({
    reference: `${COLLECTIONS.GROUPS}/${groupId}/events/${eventId}`,
    data: updatedData,
  });
};


/**
 * Allow deletion of events
 */
export const deleteEvent = async (groupId: string, eventId: string): Promise<void> => {
  await FirebaseFirestore.deleteDocument({
    reference: `${COLLECTIONS.GROUPS}/${groupId}/events/${eventId}`
  });
};

/**
 * Suggest a game for an event
 */
export const suggestGame = async (
  groupId: string,
  eventId: string,
  userId: string,
  gameName: string,
  description?: string
) => {
  const eventRef = `${COLLECTIONS.GROUPS}/${groupId}/events/${eventId}`;
  const result = await FirebaseFirestore.getDocument({ reference: eventRef });
  const event = result.snapshot?.data as GroupEventDoc;

  console.log("Event: " + JSON.stringify(event, null, 2));
  console.log("eventRef:", eventRef);


  if (!event || !event.datetime || !Array.isArray(event.gameSuggestions)) {
    throw new Error("Fehlerhafte Eventdaten – bitte aktualisieren und erneut versuchen.");
  }

  if (firestoreTimestampToDate(event.datetime) < new Date()) {
    throw new Error("Spielvorschläge sind nur für zukünftige Spieltermine möglich.");
  }

  const alreadyExists = event.gameSuggestions.some(
    g => g.name.toLowerCase() === gameName.toLowerCase()
  );
  if (alreadyExists) {
    throw new Error("Dieses Spiel wurde bereits vorgeschlagen.");
  }

  const newGame: GameSuggestion = {
    name: gameName,
    createdBy: userId,
    createdAt: dateToFirestoreTimestamp(new Date()),
    description,
    voterIds: []
  };

  const updatedSuggestions = [...event.gameSuggestions, newGame];

  await FirebaseFirestore.updateDocument({
    reference: eventRef,
    data: { gameSuggestions: updatedSuggestions }
  });
};

/**
 * Vote for a game suggestion in an event
 */
export const voteForGame = async (
  groupId: string,
  eventId: string,
  userId: string,
  gameName: string
) => {
  const eventRef = `${COLLECTIONS.GROUPS}/${groupId}/events/${eventId}`;
  const result = await FirebaseFirestore.getDocument({ reference: eventRef });
  const event = result.snapshot?.data as GroupEventDoc;

  if (firestoreTimestampToDate(event.datetime) < new Date()) {
    throw new Error("Spielabstimmung ist nur für zukünftige Spieltermine möglich.");
  }

  const updatedSuggestions = event.gameSuggestions.map((game) => {
    if (game.name.toLowerCase() === gameName.toLowerCase()) {
      if (game.voterIds.includes(userId)) return game;
      return { ...game, voterIds: [...game.voterIds, userId] };
    }
    return game;
  });

  await FirebaseFirestore.updateDocument({
    reference: eventRef,
    data: { gameSuggestions: updatedSuggestions }
  });
};

/**
 * Submit or update a user rating (1–5) for a past event
 */
export const submitEventRating = async (
  groupId: string,
  eventId: string,
  userId: string,
  rating: EventRating
): Promise<void> => {
  const eventRef = `${COLLECTIONS.GROUPS}/${groupId}/events/${eventId}`;
  const result = await FirebaseFirestore.getDocument({ reference: eventRef });
  const event = result.snapshot?.data as GroupEventDoc;

  if (!event) {
    throw new Error("Event nicht gefunden.");
  }

  const eventDate = firestoreTimestampToDate(event.datetime);
  if (eventDate >= new Date()) {
    throw new Error("Bewertungen sind nur für vergangene Termine möglich.");
  }

  const existingRatings = event.ratings ?? {};

  const updatedRatings = {
    ...existingRatings,
    [userId]: rating,
  };

  await FirebaseFirestore.updateDocument({
    reference: eventRef,
    data: { ratings: updatedRatings },
  });
};

// add new Group user for future events

export const addUserToFutureEvents = async (groupId: string, userId: string): Promise<void> => {
  try {
    const result = await FirebaseFirestore.getCollection({
      reference: `${COLLECTIONS.GROUPS}/${groupId}/events`,
    });
    const now = new Date();

    for (const snap of result.snapshots) {
      const data = snap.data as GroupEventDoc;
      if (!data?.datetime) continue;

      const when = firestoreTimestampToDate(data.datetime);
      if (when < now) continue;

      const current = new Set<string>(data.participantIds || []);
      if (current.has(userId)) continue;

      current.add(userId);
      await FirebaseFirestore.updateDocument({
        reference: `${COLLECTIONS.GROUPS}/${groupId}/events/${snap.id}`,
        data: { participantIds: Array.from(current) },
      });
    }
    console.log("[addUserToFutureEvents] OK", { groupId, userId });
  } catch (e) {
    console.error("[addUserToFutureEvents] Fehler:", e);
    throw e;
  }
};

export const removeUserFromFutureEvents = async (
  groupId: string,
  userId: string
): Promise<void> => {
  const res = await FirebaseFirestore.getCollection({
    reference: `${COLLECTIONS.GROUPS}/${groupId}/events`,
  });

  const now = new Date();

  for (const snap of res.snapshots) {
    const data = snap.data as GroupEventDoc;
    const eid = snap.id;
    if (!data?.datetime) continue;

    const when = firestoreTimestampToDate(data.datetime);
    if (when < now) continue; // nur zukünftige

    const current = new Set<string>(data.participantIds || []);
    if (!current.has(userId)) continue;

    current.delete(userId);

    await FirebaseFirestore.updateDocument({
      reference: `${COLLECTIONS.GROUPS}/${groupId}/events/${eid}`,
      data: { participantIds: Array.from(current) },
    });
  }
};

