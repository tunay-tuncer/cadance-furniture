"use client";

import React, { useState, useRef, useEffect, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserProject, ProjectItem } from "@/lib/firebase/projectService";
import { addFurnitureToProject } from "@/lib/firebase/furnitureService";
import { exportFurnitureModel, ExportFormat } from "@/lib/exporters/exportModel";
import { FurnitureParams, KitchenCabinetUnit } from "@/components/modeler/FurnitureMesh";
import ModelerControls from "@/components/modeler/ModelerControls";
import ModelerToolbar from "@/components/modeler/ModelerToolbar";
import { FaChevronLeft } from "react-icons/fa";
import styles from "@/components/modeler/modeler.module.css";

const ModelerCanvas = dynamic(
  () => import("@/components/modeler/ModelerCanvas"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "#0d0d12",
          color: "var(--textMuted)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid rgba(41, 114, 245, 0.2)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: "0.85rem", letterSpacing: "0.05em" }}>
          INITIALIZING 3D STUDIO...
        </span>
      </div>
    ),
  }
);


const DEFAULT_KITCHEN_UNITS: KitchenCabinetUnit[] = [
  {
    id: "base-1",
    name: "Base Cabinet 1",
    type: "base",
    width: 600,
    height: 720,
    depth: 600,
    doorType: "singleLeft",
    drawerCount: 0,
    internalShelves: 2,
    handleType: "bar",
    handleFinish: "black",
  },
  {
    id: "base-2",
    name: "Base Cabinet 2",
    type: "base",
    width: 800,
    height: 720,
    depth: 600,
    doorType: "double",
    drawerCount: 0,
    internalShelves: 2,
    handleType: "bar",
    handleFinish: "black",
  },
  {
    id: "wall-1",
    name: "Wall Cabinet 1",
    type: "wall",
    width: 600,
    height: 720,
    depth: 350,
    doorType: "singleLeft",
    drawerCount: 0,
    internalShelves: 2,
    handleType: "bar",
    handleFinish: "black",
  },
  {
    id: "wall-2",
    name: "Wall Cabinet 2",
    type: "wall",
    width: 800,
    height: 720,
    depth: 350,
    doorType: "double",
    drawerCount: 0,
    internalShelves: 2,
    handleType: "bar",
    handleFinish: "black",
  },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ModelerPage({ params }: PageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectItem | null>(null);

  const groupRef = useRef<THREE.Group | null>(null);

  const [furnitureParams, setFurnitureParams] = useState<FurnitureParams>({
    name: "Minimalist Dining Table",
    category: "Table",
    width: 1400,
    height: 750,
    depth: 800,
    materialType: "oak",
    showDimensions: true,
    wireframe: false,
    boardThickness: 30,
    topOverhang: 25,
    legType: "square",
    legThickness: 50,
    legInset: 25,
    hasDrawers: false,
    drawerCount: 1,
    drawerOpenPercent: 0,
    baseType: "plinth",
    plinthHeight: 80,
    plinthRecess: 40,
    doorType: "double",
    doorOpenPercent: 0,
    handleType: "bar",
    handleFinish: "black",
    internalColumns: 1,
    internalShelves: 2,
    hasBackPanel: true,
    kitchenUnits: DEFAULT_KITCHEN_UNITS,
    selectedUnitId: "base-1",
  });

  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isParallel, setIsParallel] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.uid || !projectId) return;
    const unsub = subscribeToUserProject(user.uid, projectId, (proj) => {
      setProject(proj);
    });
    
  return () => unsub();
  }, [user?.uid, projectId]);

  const handleSelectUnit = (id: string) => {
    setFurnitureParams((prev) => ({
      ...prev,
      selectedUnitId: id,
    }));
  };

  const handleAddAdjacentUnit = (
    sourceId: string,
    direction: "left" | "right" | "top"
  ) => {
    setFurnitureParams((prev) => {
      const list = prev.kitchenUnits || DEFAULT_KITCHEN_UNITS;
      const source = list.find((u) => u.id === sourceId);
      if (!source) return prev;

      if (direction === "top") {
        const newWall: KitchenCabinetUnit = {
          id: `wall-${Date.now()}`,
          name: `Wall Unit (${source.width}mm)`,
          type: "wall",
          width: source.width,
          height: 720,
          depth: 350,
          doorType: source.width >= 800 ? "double" : "singleLeft",
          drawerCount: 0,
          internalShelves: 2,
          handleType: source.handleType,
          handleFinish: source.handleFinish,
        };
        return {
          ...prev,
          kitchenUnits: [...list, newWall],
          selectedUnitId: newWall.id,
        };
      } else {
        const newBase: KitchenCabinetUnit = {
          id: `base-${Date.now()}`,
          name: `Base Cabinet ${list.filter((u) => u.type === "base").length + 1}`,
          type: "base",
          width: 600,
          height: 720,
          depth: 600,
          doorType: "singleLeft",
          drawerCount: 0,
          internalShelves: 2,
          handleType: source.handleType,
          handleFinish: source.handleFinish,
        };
        const idx = list.findIndex((u) => u.id === sourceId);
        const updated = [...list];
        if (direction === "left") {
          updated.splice(idx, 0, newBase);
        } else {
          updated.splice(idx + 1, 0, newBase);
        }
        return {
          ...prev,
          kitchenUnits: updated,
          selectedUnitId: newBase.id,
        };
      }
    });
  };

  const handleExport = async (format: ExportFormat) => {
    if (!groupRef.current) {
      alert("3D scene is still loading. Please wait a second.");
      return;
    }
    const filename = `${furnitureParams.name}_${furnitureParams.width}x${furnitureParams.height}x${furnitureParams.depth}`;
    await exportFurnitureModel(groupRef.current, filename, format);
  };

  const handleSave = async () => {
    if (!user?.uid || !projectId) {
      alert("Please sign in to save this furniture to your project.");
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      const areaM2 = Number(
        (
          ((furnitureParams.width * furnitureParams.depth * 2 +
            furnitureParams.width * furnitureParams.height * 2 +
            furnitureParams.depth * furnitureParams.height * 2) /
            1_000_000) *
          0.45
        ).toFixed(2)
      );

      const panelCount =
        furnitureParams.category === "Shelf"
          ? Math.max(2, Math.floor(furnitureParams.height / 350)) + 3
          : furnitureParams.category === "Cabinet"
          ? 8
          : 5;

      const estWeight = Number(
        (
          ((furnitureParams.width * furnitureParams.depth * furnitureParams.height) /
            1_000_000_000) *
          650 *
          0.06
        ).toFixed(1)
      );

      await addFurnitureToProject(user.uid, projectId, {
        projectId,
        name: furnitureParams.name || "Untitled Furniture",
        category: furnitureParams.category,
        width: furnitureParams.width,
        height: furnitureParams.height,
        depth: furnitureParams.depth,
        material: `${furnitureParams.materialType.toUpperCase()} (18-25mm)`,
        panelCount,
        surfaceArea: areaM2,
        estimatedWeight: estWeight,
        estimatedCost: 0,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/projects/${projectId}`);
      }, 1200);
    } catch (err) {
      console.error("Error saving furniture:", err);
      alert("Failed to save furniture.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.studioContainer}>
      <div className={styles.canvasArea}>
        <div className={styles.topOverlayBar}>
          <Link href={`/projects/${projectId}`} className={styles.backBtn}>
            <FaChevronLeft size={10} />
            <span>Project Furnitures</span>
          </Link>
          {project?.name && (
            <span className={styles.projectBadge}>{project.name}</span>
          )}
        </div>

        <ModelerToolbar
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showDimensions={Boolean(furnitureParams.showDimensions)}
          setShowDimensions={(updater) =>
            setFurnitureParams((prev) => ({
              ...prev,
              showDimensions:
                typeof updater === "function"
                  ? updater(Boolean(prev.showDimensions))
                  : updater,
            }))
          }
          wireframe={Boolean(furnitureParams.wireframe)}
          setWireframe={(updater) =>
            setFurnitureParams((prev) => ({
              ...prev,
              wireframe:
                typeof updater === "function"
                  ? updater(Boolean(prev.wireframe))
                  : updater,
            }))
          }
          isParallel={isParallel}
          setIsParallel={setIsParallel}
        />

        <ModelerCanvas
          params={furnitureParams}
          groupRef={groupRef}
          showGrid={showGrid}
          isParallel={isParallel}
          setIsParallel={setIsParallel}
          onSelectUnit={handleSelectUnit}
          onAddAdjacentUnit={handleAddAdjacentUnit}
        />
      </div>

      <ModelerControls
        params={furnitureParams}
        setParams={setFurnitureParams}
        onSave={handleSave}
        onExport={handleExport}
        saving={saving}
        saveSuccess={saveSuccess}
      />
    </div>
  );
}
