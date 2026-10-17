"use client";

import React, { useState, useRef, useEffect, useCallback, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { useAuth } from "@/context/AuthContext";
import { subscribeToUserProject, ProjectItem } from "@/lib/firebase/projectService";
import { addFurnitureToProject } from "@/lib/firebase/furnitureService";
import { exportFurnitureModel, ExportFormat } from "@/lib/exporters/exportModel";
import { FurnitureParams, KitchenCabinetUnit, WardrobeUnit, SelectedDivision } from "@/components/modeler/FurnitureMesh";
import { calculateProductionMetrics } from "@/lib/production/productionCalculator";
import ModelerControls from "@/components/modeler/ModelerControls";
import ModelerToolbar from "@/components/modeler/ModelerToolbar";
import CadActionToolbar from "@/components/modeler/CadActionToolbar";
import TechnicalDrawingWorkspace from "@/components/technical-drawing/TechnicalDrawingWorkspace";
import { FaChevronLeft } from "react-icons/fa";
import { Md3dRotation, MdDesignServices, MdTune } from "react-icons/md";
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



const DEFAULT_WARDROBE_UNITS: WardrobeUnit[] = [
  {
    id: "wardrobe-1",
    name: "Wardrobe Division 1",
    type: "main",
    width: 900,
    height: 2100,
    depth: 600,
    doorType: "sliding",
    doorOpenPercent: 0,
    hasMirror: false,
    mirrorType: "full",
    hasDrawers: true,
    drawerType: "externalBottom",
    drawerCount: 2,
    drawerOpenPercent: 0,
    hasClothesHangerRail: true,
    internalShelves: 1,
    hasInternalDivider: false,
    partitionOffset: 0,
    partitionSpan: "underTopShelf",
    hangerZone: "left",
    shelfOffsets: [],
    slidingDoorActivePanel: "right",
    handleType: "edgePull",
    handleFinish: "black",
  },
];

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
  const [modelReadyVersion, setModelReadyVersion] = useState(0);
  const handleModelReady = useCallback(() => {
    setModelReadyVersion((version) => version + 1);
  }, []);

  const [furnitureParams, setFurnitureParams] = useState<FurnitureParams>({
    name: "Minimalist Dining Table",
    category: "Table",
    width: 1400,
    height: 750,
    depth: 800,
    materialType: "oak",
    showDimensions: true,
    wireframe: false,
    boardThickness: 18,
    tableTopThickness: 18,
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
    hasCountertop: false,
    countertopThickness: 30,
    hasBacksplash: false,
    kitchenUnits: DEFAULT_KITCHEN_UNITS,
    selectedUnitId: "base-1",
    selectedUnitIds: ["base-1"],
    wardrobeUnits: DEFAULT_WARDROBE_UNITS,
    selectedWardrobeUnitId: "wardrobe-1",
  });

  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isParallel, setIsParallel] = useState<boolean>(false);
  const [workspaceMode, setWorkspaceMode] = useState<"3d" | "2d">("3d");
  const [inspectorTab, setInspectorTab] = useState<"3d" | "2d">("3d");
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!user?.uid || !projectId) return;
    const unsub = subscribeToUserProject(user.uid, projectId, (proj) => {
      setProject(proj);
    });
    
  return () => unsub();
  }, [user?.uid, projectId]);

  const handleSelectUnit = useCallback((id: string) => {
    setFurnitureParams((prev) => {
      if (
        prev.selectedUnitId === id &&
        prev.selectedUnitIds?.length === 1 &&
        prev.selectedUnitIds[0] === id
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedUnitId: id,
        selectedUnitIds: [id],
      };
    });
  }, []);

  const handleSelectUnits = useCallback((ids: string[]) => {
    setFurnitureParams((prev) => {
      const prevIds = prev.selectedUnitIds || [];
      if (
        prevIds.length === ids.length &&
        prevIds.every((v, i) => v === ids[i]) &&
        prev.selectedUnitId === ids[0]
      ) {
        return prev;
      }
      return {
        ...prev,
        selectedUnitIds: ids,
        selectedUnitId: ids[0] || prev.selectedUnitId,
      };
    });
  }, []);

  const handleSelectWardrobeUnit = (id: string) => {
    setFurnitureParams((prev) => ({
      ...prev,
      selectedWardrobeUnitId: id,
    }));
  };

  const handleSelectDivision = (div: SelectedDivision | null) => {
    setFurnitureParams((prev) => ({
      ...prev,
      selectedDivision: div,
    }));
  };

  const handleRemoveDivision = (div: SelectedDivision) => {
    setFurnitureParams((prev) => {
      if (prev.category === "Cabinet") {
        const units = prev.kitchenUnits || DEFAULT_KITCHEN_UNITS;
        if (div.type === "shelf") {
          const updated = units.map((u) => {
            if (u.id === div.unitId) {
              return {
                ...u,
                internalShelves: Math.max(0, (u.internalShelves ?? 0) - 1),
              };
            }
            return u;
          });
          return { ...prev, kitchenUnits: updated, selectedDivision: null };
        }
      } else if (prev.category === "Wardrobe") {
        const units = prev.wardrobeUnits || DEFAULT_WARDROBE_UNITS;
        if (div.type === "shelf") {
          const updated = units.map((u) => {
            if (u.id === div.unitId) {
              const newOffsets = [...(u.shelfOffsets || [])];
              if (div.index !== undefined && div.index < newOffsets.length) {
                newOffsets.splice(div.index, 1);
              }
              return {
                ...u,
                internalShelves: Math.max(0, (u.internalShelves ?? 0) - 1),
                shelfOffsets: newOffsets,
              };
            }
            return u;
          });
          return { ...prev, wardrobeUnits: updated, selectedDivision: null };
        } else if (div.type === "partition") {
          const updated = units.map((u) => {
            if (u.id === div.unitId) {
              return { ...u, hasInternalDivider: false, partitionOffset: 0 };
            }
            return u;
          });
          return { ...prev, wardrobeUnits: updated, selectedDivision: null };
        }
      } else if (prev.category === "Shelf") {
        return {
          ...prev,
          internalShelves: Math.max(0, (prev.internalShelves ?? 2) - 1),
          selectedDivision: null,
        };
      }
      return { ...prev, selectedDivision: null };
    });
  };

  const handleAddAdjacentWardrobeUnit = (
    sourceId: string,
    direction: "left" | "right" | "top"
  ) => {
    setFurnitureParams((prev) => {
      const list = prev.wardrobeUnits || DEFAULT_WARDROBE_UNITS;
      const source = list.find((u) => u.id === sourceId);
      if (!source) return prev;

      if (direction === "top") {
        const newTop: WardrobeUnit = {
          id: `wardrobe-top-${Date.now()}`,
          name: `Top Bridge (${source.width}mm)`,
          type: "top",
          width: source.width,
          height: 450,
          depth: source.depth,
          doorType: "hingedDouble",
          doorOpenPercent: 0,
          hasMirror: false,
          internalShelves: 1,
          drawerCount: 0,
          handleType: source.handleType,
          handleFinish: source.handleFinish,
        };
        return {
          ...prev,
          wardrobeUnits: [...list, newTop],
          selectedWardrobeUnitId: newTop.id,
        };
      } else {
        const mainCount = list.filter((u) => u.type === "main").length;
        const newMain: WardrobeUnit = {
          id: `wardrobe-${Date.now()}`,
          name: `Division ${mainCount + 1}`,
          type: "main",
          width: 800,
          height: source.height,
          depth: source.depth,
          doorType: source.doorType,
          doorOpenPercent: 0,
          hasMirror: false,
          mirrorType: "full",
          hasDrawers: true,
          drawerType: "externalBottom",
          drawerCount: 2,
          drawerOpenPercent: 0,
          hasClothesHangerRail: true,
          internalShelves: 2,
          hasInternalDivider: false,
          handleType: source.handleType,
          handleFinish: source.handleFinish,
        };
        const idx = list.findIndex((u) => u.id === sourceId);
        const updated = [...list];
        if (direction === "left") {
          updated.splice(idx, 0, newMain);
        } else {
          updated.splice(idx + 1, 0, newMain);
        }
        return {
          ...prev,
          wardrobeUnits: updated,
          selectedWardrobeUnitId: newMain.id,
        };
      }
    });
  };

  const handleAddDivision = (unitId: string, type: "vertical" | "horizontal") => {
    if (furnitureParams.category === "Cabinet") {
      setFurnitureParams((prev) => {
        const units = prev.kitchenUnits || DEFAULT_KITCHEN_UNITS;
        const target = units.find((u) => u.id === unitId);
        if (!target) return prev;
        if (type === "horizontal") {
          const updated = units.map((u) =>
            u.id === unitId ? { ...u, internalShelves: Math.min(6, (u.internalShelves ?? 0) + 1) } : u
          );
          return { ...prev, kitchenUnits: updated };
        } else {
          // Vertical division: split into two base units
          const newW = Math.max(300, Math.round(target.width / 2));
          const idx = units.findIndex((u) => u.id === unitId);
          const newUnit: KitchenCabinetUnit = {
            id: `base-${Date.now()}`,
            name: `Base Cabinet ${units.length + 1}`,
            type: target.type,
            width: newW,
            height: target.height,
            depth: target.depth,
            doorType: "singleRight",
            drawerCount: 0,
            internalShelves: target.internalShelves ?? 2,
            handleType: target.handleType,
            handleFinish: target.handleFinish,
          };
          const nextUnits = [...units];
          nextUnits[idx] = { ...target, width: newW, doorType: "singleLeft" };
          nextUnits.splice(idx + 1, 0, newUnit);
          return { ...prev, kitchenUnits: nextUnits, selectedUnitId: newUnit.id };
        }
      });
    } else if (furnitureParams.category === "Wardrobe") {
      setFurnitureParams((prev) => {
        const units = prev.wardrobeUnits || DEFAULT_WARDROBE_UNITS;
        const target = units.find((u) => u.id === unitId);
        if (!target) return prev;
        if (type === "horizontal") {
          const updated = units.map((u) =>
            u.id === unitId ? { ...u, internalShelves: Math.min(6, (u.internalShelves ?? 0) + 1) } : u
          );
          return { ...prev, wardrobeUnits: updated };
        } else {
          // Vertical division: if no internal divider, add one; otherwise split section
          if (!target.hasInternalDivider) {
            const updated = units.map((u) =>
              u.id === unitId ? { ...u, hasInternalDivider: true } : u
            );
            return { ...prev, wardrobeUnits: updated };
          } else {
            const newW = Math.max(450, Math.round(target.width / 2));
            const idx = units.findIndex((u) => u.id === unitId);
            const newUnit: WardrobeUnit = {
              ...target,
              id: `wardrobe-${Date.now()}`,
              name: `Division ${units.length + 1}`,
              width: newW,
              hasInternalDivider: false,
            };
            const nextUnits = [...units];
            nextUnits[idx] = { ...target, width: newW, hasInternalDivider: false };
            nextUnits.splice(idx + 1, 0, newUnit);
            return { ...prev, wardrobeUnits: nextUnits, selectedWardrobeUnitId: newUnit.id };
          }
        }
      });
    }
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
        if (source.type === "corner-base") {
          const newCornerWall: KitchenCabinetUnit = {
            id: `corner-wall-${Date.now()}`,
            name: `Corner Wall (90°)`,
            type: "corner-wall",
            orientation: source.orientation || "corner-right",
            materialType: source.materialType || prev.materialType,
            width: 600,
            height: 720,
            depth: 600,
            cornerDepth: 350,
            bottomOffset: 600,
            doorType: "cornerDouble",
            drawerCount: 0,
            internalShelves: 2,
            handleType: source.handleType,
            handleFinish: source.handleFinish,
          };
          const run1WallIdx = list.findIndex((u) => u.type === "wall" && u.runAxis === "run1");
          const updated = [...list];
          if (run1WallIdx !== -1) {
            updated.splice(run1WallIdx, 0, newCornerWall);
          } else {
            updated.push(newCornerWall);
          }
          return {
            ...prev,
            kitchenUnits: updated,
            selectedUnitId: newCornerWall.id,
            selectedUnitIds: [newCornerWall.id],
          };
        }

        const cornerIdx = list.findIndex((u) => u.type === "corner-base");
        const sourceIdx = list.findIndex((u) => u.id === sourceId);
        const isOnRun1 = cornerIdx !== -1 && sourceIdx > cornerIdx;

        const newWall: KitchenCabinetUnit = {
          id: `wall-${Date.now()}`,
          name: `Wall Unit (${source.width}mm)${isOnRun1 ? " (Turned)" : ""}`,
          type: "wall",
          runAxis: isOnRun1 ? "run1" : "run0",
          materialType: source.materialType || prev.materialType,
          width: source.width,
          height: 720,
          depth: 350,
          bottomOffset: 600,
          doorType: source.width >= 800 ? "double" : "singleLeft",
          drawerCount: 0,
          internalShelves: 2,
          handleType: source.handleType,
          handleFinish: source.handleFinish,
        };

        // Align position with the corresponding base cabinet in the same run
        const baseUnitsInSameRun = list.filter((u) => {
          if (u.type !== "base" && u.type !== "corner-base") return false;
          const uIdx = list.indexOf(u);
          const uIsOnRun1 = cornerIdx !== -1 && uIdx > cornerIdx;
          return uIsOnRun1 === isOnRun1 && u.type === "base";
        });
        const sourceBasePosInRun = baseUnitsInSameRun.findIndex((u) => u.id === sourceId);
        const wallUnitsInSameRun = list.filter((u) => (u.type === "wall" || u.type === "corner-wall") && (isOnRun1 ? u.runAxis === "run1" : u.runAxis !== "run1"));

        const updated = [...list];
        if (wallUnitsInSameRun.length > 0 && sourceBasePosInRun !== -1) {
          const targetWall = wallUnitsInSameRun[sourceBasePosInRun];
          if (targetWall) {
            const targetIdx = updated.findIndex((u) => u.id === targetWall.id);
            updated.splice(targetIdx, 0, newWall);
          } else {
            const lastWall = wallUnitsInSameRun[wallUnitsInSameRun.length - 1];
            const lastIdx = updated.findIndex((u) => u.id === lastWall.id);
            updated.splice(lastIdx + 1, 0, newWall);
          }
        } else {
          updated.push(newWall);
        }

        return {
          ...prev,
          kitchenUnits: updated,
          selectedUnitId: newWall.id,
          selectedUnitIds: [newWall.id],
        };
      } else {
        const isWall = source.type === "wall" || source.type === "corner-wall";

        // Smart Paired Handing: In real-life cabinetry, adjacent single doors are handed in opposing pairs
        const adjacentDoorType = direction === "right"
          ? (source.doorType === "singleLeft" ? "singleRight" : "singleLeft")
          : (source.doorType === "singleRight" ? "singleLeft" : "singleRight");

        const idx = list.findIndex((u) => u.id === sourceId);
        const updated = [...list];

        if (isWall) {
          const wallCount = list.filter((u) => u.type === "wall" || u.type === "corner-wall").length;
          const resolvedRunAxis = source.type === "wall"
            ? (source.runAxis || "run0")
            : (direction === "right" ? "run1" : "run0");

          const newWall: KitchenCabinetUnit = {
            id: `wall-${Date.now()}`,
            name: `Upper Wall Unit ${wallCount + 1}${resolvedRunAxis === "run1" ? " (Turned)" : ""}`,
            type: "wall",
            runAxis: resolvedRunAxis,
            materialType: source.materialType || prev.materialType,
            width: source.width || 600,
            height: source.height || 720,
            depth: source.depth || 350,
            bottomOffset: source.bottomOffset ?? 600,
            doorType: (source.width || 600) >= 800 ? "double" : adjacentDoorType,
            drawerCount: 0,
            internalShelves: source.internalShelves ?? 2,
            handleType: source.handleType || "bar",
            handleFinish: source.handleFinish || "black",
          };

          if (direction === "left") {
            updated.splice(idx, 0, newWall);
          } else {
            updated.splice(idx + 1, 0, newWall);
          }

          return {
            ...prev,
            kitchenUnits: updated,
            selectedUnitId: newWall.id,
            selectedUnitIds: [newWall.id],
          };
        } else {
          const baseCount = list.filter((u) => u.type === "base" || u.type === "corner-base").length;
          const newBase: KitchenCabinetUnit = {
            id: `base-${Date.now()}`,
            name: `Base Cabinet ${baseCount + 1}`,
            type: "base",
            orientation: "straight",
            materialType: source.materialType || prev.materialType,
            width: source.width || 600,
            height: source.height || 720,
            depth: source.depth || 600,
            doorType: (source.width || 600) >= 800 ? "double" : adjacentDoorType,
            drawerCount: 0,
            internalShelves: source.internalShelves ?? 2,
            handleType: source.handleType || "bar",
            handleFinish: source.handleFinish || "black",
          };

          if (direction === "left") {
            updated.splice(idx, 0, newBase);
          } else {
            updated.splice(idx + 1, 0, newBase);
          }

          return {
            ...prev,
            kitchenUnits: updated,
            selectedUnitId: newBase.id,
            selectedUnitIds: [newBase.id],
          };
        }
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
      const metrics = calculateProductionMetrics(furnitureParams);

      await addFurnitureToProject(user.uid, projectId, {
        projectId,
        name: furnitureParams.name || "Untitled Furniture",
        category: furnitureParams.category,
        width: furnitureParams.width,
        height: furnitureParams.height,
        depth: furnitureParams.depth,
        material: `${furnitureParams.materialType.toUpperCase()} (${furnitureParams.boardThickness || 18}mm)`,
        panelCount: metrics.panelCount,
        surfaceArea: metrics.totalSurfaceArea,
        estimatedWeight: metrics.estimatedWeight,
        estimatedCost: 0,
        params: furnitureParams,
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

          {/* Top Workspace Mode Switcher (3D Modeler vs 2D Technical Drawing) */}
          <div className={styles.workspaceModeSwitcher}>
            <button
              type="button"
              onClick={() => {
                setWorkspaceMode("3d");
                setInspectorTab("3d");
              }}
              className={`${styles.workspaceModeBtn} ${
                workspaceMode === "3d" ? styles.workspaceModeBtnActive : ""
              }`}
              title="3D Parametric Workspace"
            >
              <Md3dRotation size={15} />
              <span>3D Studio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceMode("2d");
                setInspectorTab("2d");
              }}
              className={`${styles.workspaceModeBtn} ${
                workspaceMode === "2d" ? styles.workspaceModeBtnActive : ""
              }`}
              title="2D Vector Technical Drawing Sheet"
            >
              <MdDesignServices size={15} />
              <span>2D Technical View</span>
            </button>
          </div>
        </div>

        <div
          aria-hidden={workspaceMode !== "3d"}
          style={{
            position: "absolute",
            inset: 0,
            opacity: workspaceMode === "3d" ? 1 : 0,
            pointerEvents: workspaceMode === "3d" ? "auto" : "none",
            zIndex: workspaceMode === "3d" ? 2 : 1,
            isolation: "isolate",
          }}
        >
            <CadActionToolbar
              params={{
                ...furnitureParams,
                onSelectDivision: handleSelectDivision,
                onRemoveDivision: handleRemoveDivision,
              }}
              setParams={setFurnitureParams}
            />

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
              params={{
                ...furnitureParams,
                onSelectDivision: handleSelectDivision,
                onRemoveDivision: handleRemoveDivision,
              }}
              groupRef={groupRef}
              onModelReady={handleModelReady}
              showGrid={showGrid}
              isParallel={isParallel}
              setIsParallel={setIsParallel}
              onSelectUnit={handleSelectUnit}
              onSelectUnits={handleSelectUnits}
              onAddAdjacentUnit={handleAddAdjacentUnit}
              onSelectWardrobeUnit={handleSelectWardrobeUnit}
              onAddAdjacentWardrobeUnit={handleAddAdjacentWardrobeUnit}
              onAddDivision={handleAddDivision}
              onSelectDivision={handleSelectDivision}
              onRemoveDivision={handleRemoveDivision}
            />
        </div>
        <div
          aria-hidden={workspaceMode !== "2d"}
          style={{
            position: "absolute",
            inset: 0,
            opacity: workspaceMode === "2d" ? 1 : 0,
            pointerEvents: workspaceMode === "2d" ? "auto" : "none",
            zIndex: workspaceMode === "2d" ? 2 : 1,
            isolation: "isolate",
          }}
        >
          <TechnicalDrawingWorkspace
            params={furnitureParams}
            modelGroupRef={groupRef}
            modelReadyVersion={modelReadyVersion}
            projectionEnabled={workspaceMode === "2d"}
            setParams={setFurnitureParams}
            projectName={project?.name || "Parametric Furniture Project"}
            clientName="Cadance Studio"
            onOpenSettings={() => {
              setInspectorTab("2d");
              setIsMobileControlsOpen(true);
            }}
          />
        </div>

        {/* Floating Mobile Trigger for Parameters & Inspector */}
        <button
          type="button"
          className={styles.mobileInspectorToggleBtn}
          onClick={() => setIsMobileControlsOpen(true)}
          aria-label="Open Inspector Controls"
        >
          {workspaceMode === "3d" ? <MdTune size={16} /> : <MdDesignServices size={16} />}
          <span>{workspaceMode === "3d" ? "CAD Inspector" : "Sheet Settings"}</span>
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`${styles.sidebarBackdrop} ${
          isMobileControlsOpen ? styles.sidebarBackdropActive : ""
        }`}
        onClick={() => setIsMobileControlsOpen(false)}
        aria-hidden="true"
      />

      <ModelerControls
        params={{
          ...furnitureParams,
          onSelectDivision: handleSelectDivision,
          onRemoveDivision: handleRemoveDivision,
        }}
        setParams={setFurnitureParams}
        onSave={handleSave}
        onExport={handleExport}
        saving={saving}
        saveSuccess={saveSuccess}
        inspectorTab={inspectorTab}
        setInspectorTab={setInspectorTab}
        isMobileOpen={isMobileControlsOpen}
        onCloseMobile={() => setIsMobileControlsOpen(false)}
      />
    </div>
  );
}
