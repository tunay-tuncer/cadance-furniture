import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./client";

import type { FurnitureParams } from "@/components/modeler/FurnitureMesh";

export type FurnitureCategory = "Table" | "Shelf" | "Cabinet" | "Wardrobe" | "Chair" | "Desk" | "Custom";

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
  params?: FurnitureParams;
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
          params: data.params,
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

export const getFurnitureItem = async (
  userId: string,
  projectId: string,
  furnitureId: string
): Promise<FurnitureItem | null> => {
  if (!userId || !projectId || !furnitureId) return null;
  const docRef = doc(
    db,
    "users",
    userId,
    "projects",
    projectId,
    "furnitures",
    furnitureId
  );
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
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
    params: data.params,
    createdAt: data.createdAt,
  };
};

export const subscribeToFurnitureItem = (
  userId: string,
  projectId: string,
  furnitureId: string,
  callback: (furniture: FurnitureItem | null) => void
) => {
  if (!userId || !projectId || !furnitureId) return () => {};
  const docRef = doc(
    db,
    "users",
    userId,
    "projects",
    projectId,
    "furnitures",
    furnitureId
  );
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      const data = snap.data();
      callback({
        id: snap.id,
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
        params: data.params,
        createdAt: data.createdAt,
      });
    },
    (err) => {
      console.error("Error subscribing to furniture item:", err);
      callback(null);
    }
  );
};

export const updateFurnitureInProject = async (
  userId: string,
  projectId: string,
  furnitureId: string,
  updates: Partial<NewFurnitureInput>
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
  return await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
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
