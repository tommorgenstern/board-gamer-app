// import { FirebaseFirestore } from "@capacitor-firebase/firestore";
// import { COLLECTIONS } from "@/constants/firebase";
// import { GroupDoc } from "@/interfaces/firestore";
// import { dateToFirestoreTimestamp } from "@/utils/timeFormatter";

// /**
//  * Creates a new game group with member rotation support.
//  * @param groupName Name of the group
//  * @param memberIds Array of user UIDs (Firebase Auth UIDs)
//  * @param createdBy UID of the creator
//  * @param groupId - Die Gruppen-ID.
//  */
// export const createGroup = async (
//   groupName: string,
//   memberIds: string[],
//   createdBy: string
// ): Promise<string> => {
//   if (!groupName || memberIds.length <= 0 || !createdBy) {
//     throw new Error("Missing required group fields");
//   }

//   try {
//     const group: GroupDoc = {
//       name: groupName,
//       memberIds,
//       createdBy,
//       createdAt: dateToFirestoreTimestamp(new Date()),
//     };

//     const docRef = await FirebaseFirestore.addDocument({
//       reference: COLLECTIONS.GROUPS,
//       data: group
//     });

//     // Extract document ID from the reference path
//     const pathParts = docRef.reference.path.split('/');
//     return pathParts[pathParts.length - 1];
    
//   } catch (error) {
//     console.error("Error creating group:", error);
//     throw new Error("Failed to create group");
//   }
// };

// export const getGroupById = async (groupId: string): Promise<GroupDoc & { id: string } | null> => {
//   try {
//     const groupDocPath = `${COLLECTIONS.GROUPS}/${groupId}`;
//     const groupDoc = await FirebaseFirestore.getDocument({
//       reference: groupDocPath
//     });
    
//     if (groupDoc.snapshot?.data) {
//       return {
//         id: groupId,
//         ...groupDoc.snapshot.data
//       } as GroupDoc & { id: string };
//     }
//     return null;
//   } catch (error) {
//     console.error('Error getting group:', error);
//     return null;
//   }
// };

// export const getAllGroups = async (): Promise<(GroupDoc & { id: string })[]> => {
//   try {
//     const result = await FirebaseFirestore.getCollection({
//       reference: COLLECTIONS.GROUPS,
//       queryConstraints: [
//         {
//           type: 'orderBy',
//           fieldPath: 'createdAt',
//           directionStr: 'desc',
//         },
//       ],
//     });
    
//     const groups: (GroupDoc & { id: string })[] = result.snapshots.map((doc: any) => ({
//       id: doc.id,
//       ...doc.data
//     } as GroupDoc & { id: string }));
    
//     return groups;
//   } catch (error) {
//     console.error('Error fetching groups:', error);
//     return [];
//   }
// };

// export const getUserGroups = async (userId: string): Promise<(GroupDoc & { id: string })[]> => {
//   try {
//     // Since Capacitor Firebase doesn't support 'where' in queryConstraints,
//     // we'll get all groups and filter them client-side
//     const result = await FirebaseFirestore.getCollection({
//       reference: COLLECTIONS.GROUPS,
//       queryConstraints: [
//         {
//           type: 'orderBy',
//           fieldPath: 'createdAt',
//           directionStr: 'desc',
//         },
//       ],
//     });
    
//     // Filter groups where the user is a member
//     const groups: (GroupDoc & { id: string })[] = result.snapshots
//       .map((doc: any) => ({
//         id: doc.id,
//         ...doc.data
//       } as GroupDoc & { id: string }))
//       .filter((group) => group.memberIds && group.memberIds.includes(userId));
    
//     return groups;
//   } catch (error) {
//     console.error('Error fetching user groups:', error);
//     return [];
//   }
// };

// export const updateGroup = async (groupId: string, data: Partial<GroupDoc>): Promise<void> => {
//   await FirebaseFirestore.setDocument({
//     reference: `${COLLECTIONS.GROUPS}/${groupId}`,
//     data,
//     merge: true
//   });
// };

// export const deleteGroup = async (groupId: string): Promise<void> => {
//   await FirebaseFirestore.deleteDocument({
//     reference: `${COLLECTIONS.GROUPS}/${groupId}`
//   });
// };

// import { db } from "@/services/firebase";
// import { COLLECTIONS } from "@/constants/firebase";
// import {
//   collection,
//   doc,
//   addDoc,
//   getDocs,
//   updateDoc,
//   deleteDoc,
//   DocumentData
// } from "firebase/firestore";

// src/services/groups.ts


import { FirebaseFirestore } from "@capacitor-firebase/firestore";
import { COLLECTIONS } from "@/constants/firebase";
import { GroupDoc } from "@/interfaces/firestore";
import { dateToFirestoreTimestamp } from "@/utils/timeFormatter";

/**
 * Creates a new game group with member rotation support.
 * @param groupName Name of the group
 * @param memberIds Array of user UIDs (Firebase Auth UIDs)
 * @param createdBy UID of the creator
 */

// Create group
export const createGroup = async (
  groupName: string,
  memberIds: string[],
  createdBy: string,
  description?: string,
  location?: string
): Promise<string> => {
  if (!groupName || memberIds.length === 0 || !createdBy) {
    throw new Error("Missing required group fields");
  }

  const group: GroupDoc = {
    name: groupName,
    memberIds,
    description: description ?? "",
    location: location ?? "",
    createdBy,
    createdAt: dateToFirestoreTimestamp(new Date()),
  };

  const result = await FirebaseFirestore.addDocument({
    reference: COLLECTIONS.GROUPS,
    data: group,
  });

  const pathParts = result.reference.path.split("/");
  return pathParts[pathParts.length - 1];
};

// Get single group by ID
export const getGroupById = async (groupId: string): Promise<(GroupDoc & { id: string }) | null> => {
  try {
    const result = await FirebaseFirestore.getDocument({
      reference: `${COLLECTIONS.GROUPS}/${groupId}`,
    });

    if (!result?.snapshot?.data) return null;

    return {
      id: groupId,
      ...result.snapshot.data,
    } as GroupDoc & { id: string };
  } catch (err) {
    console.error("Error loading group:", err);
    return null;
  }
};

// Get all groups (global list)
export const getAllGroups = async (): Promise<(GroupDoc & { id: string })[]> => {
  const result = await FirebaseFirestore.getCollection({
    reference: COLLECTIONS.GROUPS,
    queryConstraints: [
      {
        type: "orderBy",
        fieldPath: "createdAt",
        directionStr: "desc",
      },
    ],
  });

  return result.snapshots.map((doc) => ({
    id: doc.id,
    ...doc.data,
  })) as (GroupDoc & { id: string })[];
};

export const getUserGroups = async (userId: string): Promise<(GroupDoc & { id: string })[]> => {
  try {
    // Since Capacitor Firebase doesn't support 'where' in queryConstraints,
    // we'll get all groups and filter them client-side
    const result = await FirebaseFirestore.getCollection({
      reference: COLLECTIONS.GROUPS,
      queryConstraints: [
        {
          type: 'orderBy',
          fieldPath: 'createdAt',
          directionStr: 'desc',
        },
      ],
    });
    
    // Filter groups where the user is a member
    const groups: (GroupDoc & { id: string })[] = result.snapshots
      .map((doc: any) => ({
        id: doc.id,
        ...doc.data
      } as GroupDoc & { id: string }))
      .filter((group) => group.memberIds && group.memberIds.includes(userId));
    
    return groups;
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return [];
  }
};


// Update group
export const updateGroup = async (
  groupId: string,
  data: Partial<GroupDoc>
): Promise<void> => {
  await FirebaseFirestore.setDocument({
    reference: `${COLLECTIONS.GROUPS}/${groupId}`,
    data,
    merge: true,
  });
};

// Delete group
export const deleteGroup = async (groupId: string): Promise<void> => {
  await FirebaseFirestore.deleteDocument({
    reference: `${COLLECTIONS.GROUPS}/${groupId}`,
  });
};

export const joinGroup = async (groupId: string, userId: string): Promise<void> => {
  try {
    const ref = `${COLLECTIONS.GROUPS}/${groupId}`;

    // Gruppe laden
    const res = await FirebaseFirestore.getDocument({ reference: ref });
    const group = res.snapshot?.data as GroupDoc | undefined;
    if (!group) {
      throw new Error("Gruppe nicht gefunden.");
    }

    const existing = Array.isArray(group.memberIds) ? group.memberIds : [];
    if (existing.includes(userId)) {
      // Already member – nicht als Fehler behandeln, aber deutlich loggen
      console.log("[joinGroup] User ist bereits Mitglied, nichts zu tun.");
      return;
    }

    const updated = Array.from(new Set([...existing, userId]));

    // Merge-Update nur memberIds
    await FirebaseFirestore.setDocument({
      reference: ref,
      data: { memberIds: updated },
      merge: true,
    });

    console.log("[joinGroup] Erfolgreich beigetreten:", { groupId, userId });
  } catch (e) {
    console.error("[joinGroup] Fehler:", e);
    throw e;
  }
};

export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
  const result = await FirebaseFirestore.getDocument({
    reference: `${COLLECTIONS.GROUPS}/${groupId}`,
  });
  const data = result.snapshot?.data as GroupDoc | undefined;
  if (!data?.memberIds) throw new Error("Gruppe nicht gefunden.");

  const next = (data.memberIds || []).filter((id) => id !== userId);
  // nicht erlauben, wenn man der letzte Member wäre
  if (next.length === 0) throw new Error("Du kannst nicht als letzter die Gruppe verlassen.");

  await FirebaseFirestore.setDocument({
    reference: `${COLLECTIONS.GROUPS}/${groupId}`,
    data: { memberIds: next },
    merge: true,
  });
};






// export interface GroupDoc {
//   name: string;
//   memberIds: string[];
//   createdBy: string;
//   createdAt: Date;
// }

// // Gruppe erstellen
// export const createGroup = async (
//   name: string,
//   members: string[],
//   createdBy: string
// ): Promise<string> => {
//   const data: GroupDoc = {
//     name,
//     memberIds: members,
//     createdBy,
//     createdAt: new Date()
//   };

//   const groupRef = await addDoc(collection(db, COLLECTIONS.GROUPS), data);
//   return groupRef.id;
// };

// // Alle Gruppen lesen
// export const getAllGroups = async (): Promise<(GroupDoc & { id: string })[]> => {
//   const snapshot = await getDocs(collection(db, COLLECTIONS.GROUPS));
//   return snapshot.docs.map((doc) => ({
//     id: doc.id,
//     ...(doc.data() as DocumentData)
//   })) as (GroupDoc & { id: string })[];
// };

// // Gruppe löschen
// export const deleteGroup = async (groupId: string): Promise<void> => {
//   await deleteDoc(doc(db, COLLECTIONS.GROUPS, groupId));
// };
