import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./client";

export type FurnitureCategory = "Table" | "Shelf" | "Cabinet" | "Chair" | "Desk" | "Custom";

export interface FurnitureItem {
  id: string;
  projectId: string;
  name: string;
  category: FurnitureCategory;
  width: number;  // mm
  depth: number;  // mm
  height: number; // mm
  material: string;
  panelCount: number; // Basic optimization info (number of cut panels)
  surfaceArea: number; // in m² (total sheet area required)
  estimatedWeight: number; // kg
  estimatedCost: number; // currency
  notes?: string;
  createdAt?: Timestamp | unknown;
}

export type NewFurnitureInput = Omit<FurnitureItem, "id" | "createdAt">;

export const subscribeToProjectFurnitures = (
  userId: string,
  projectId: string,
  callback: (furnitures: FurnitureItem[]) => void
) => {
  if (!userId || !projectId) return () => {};

  const furnituresRef = collection(
    db,
    "users",
    userId,
    "projects",
    projectId,
    "furnitures"
  );
  const q = query(furnituresRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: FurnitureItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          projectId: data.projectId || projectId,
          name: data.name || "Untitled Furniture",
          category: data.category || "Custom",
          width: Number(data.width) || 1000,
          depth: Number(data.depth) || 600,
          height: Number(data.height) || 750,
          material: data.material || "18mm Birch Plywood",
          panelCount: Number(data.panelCount) || 6,
          surfaceArea: Number(data.surfaceArea) || 1.8,
          estimatedWeight: Number(data.estimatedWeight) || 15,
          estimatedCost: Number(data.estimatedCost) || 0,
          notes: data.notes || "",
          createdAt: data.createdAt,
        };
      });
      callback(items);
    },
    (err) => {
      console.error("Error subscribing to furnitures:", err);
      callback([]);
    }
  );
};

export const addFurnitureToProject = async (
  userId: string,
  projectId: string,
  input: NewFurnitureInput
) => {
  if (!userId || !projectId) return null;
  const furnituresRef = collection(
    db,
    "users",
    userId,
    "projects",
    projectId,
    "furnitures"
  );
  return await addDoc(furnituresRef, {
    ...input,
    createdAt: serverTimestamp(),
  });
};

export const deleteFurnitureFromProject = async (
  userId: string,
  projectId: string,
  furnitureId: string
) => {
  if (!userId || !projectId || !furnitureId) return;
  const docRef = doc(
    db,
    "users",
    userId,
    "projects",
    projectId,
    "furnitures",
    furnitureId
  );
  return await deleteDoc(docRef);
};
