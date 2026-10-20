"use client";

import React, { useState } from "react";
import { FurnitureParams, KitchenCabinetUnit, WardrobeUnit } from "./FurnitureMesh";
import CadNumberInput from "./CadNumberInput";
import { calculateProductionMetrics } from "@/lib/production/productionCalculator";
import { getDefaultFabricationNotes } from "../technical-drawing/technicalDrawingUtils";
import {
  MdSave,
  MdDownload,
  MdStraighten,
  MdLayers,
  MdDoorSliding,
  MdGridGoldenratio,
  MdTune,
  MdPalette,
  MdAnalytics,
  MdCheck,
  MdChevronRight,
  MdExpandMore,
  MdAdd,
  MdDeleteOutline,
  MdContentCopy,
  MdTurnRight,
  MdDesignServices,
  Md3dRotation,
  MdScreenRotation,
  MdEditNote,
  MdClose,
} from "react-icons/md";
import styles from "./modeler.module.css";
import { TechnicalDrawingSettings } from "./FurnitureMesh";

interface ModelerControlsProps {
  params: FurnitureParams;
  setParams: React.Dispatch<React.SetStateAction<FurnitureParams>>;
  onSave: () => Promise<void>;
  onExport: (format: "obj" | "gltf" | "stl") => void;
  saving: boolean;
  saveSuccess?: boolean;
  inspectorTab?: "3d" | "2d";
  setInspectorTab?: (tab: "3d" | "2d") => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const CATEGORIES: FurnitureParams["category"][] = [
  "Table",
  "Shelf",
  "Cabinet",
  "Wardrobe",
];

const MATERIALS: { id: FurnitureParams["materialType"]; name: string; color: string }[] = [
  { id: "oak", name: "Natural Oak", color: "#b8905e" },
  { id: "walnut", name: "American Walnut", color: "#4a3525" },
  { id: "plywood", name: "Birch Plywood", color: "#dec8a2" },
  { id: "blackSteel", name: "Matte Steel", color: "#1c1f26" },
  { id: "whiteStudio", name: "Matte White", color: "#e6e8ec" },
];

export default function ModelerControls({
  params,
  setParams,
  onSave,
  onExport,
  saving,
  saveSuccess,
  inspectorTab: propInspectorTab,
  setInspectorTab: propSetInspectorTab,
  isMobileOpen = false,
  onCloseMobile,
}: ModelerControlsProps) {
  const [internalTab, setInternalTab] = useState<"3d" | "2d">("3d");
  const activeTab = propInspectorTab ?? internalTab;
  const setActiveTab = propSetInspectorTab ?? setInternalTab;

  const updateDrawingParam = <K extends keyof TechnicalDrawingSettings>(
    key: K,
    val: TechnicalDrawingSettings[K]
  ) => {
    setParams((prev) => ({
      ...prev,
      drawingSettings: {
        ...(prev.drawingSettings || {}),
        [key]: val,
      },
    }));
  };

  // Collapsible Accordion Sections State
  const [selectedSubItem, setSelectedSubItem] = useState<string>("carcass");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    kitchenUnits: true,
    wardrobeUnits: true,
    dimensions: true,
    geometry: true,
    openings: true,
    divisions: true,
    hardware: false,
    materials: false,
    production: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateParam = <K extends keyof FurnitureParams>(
    key: K,
    value: FurnitureParams[K]
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  // Kitchen Modular Unit Management
  const kitchenUnits = params.kitchenUnits || [];
  const selectedUnit = kitchenUnits.find((u) => u.id === params.selectedUnitId) || kitchenUnits[0];
  const selectedWallAnchor = selectedUnit?.mountedAboveUnitId
    ? kitchenUnits.find((unit) => unit.id === selectedUnit.mountedAboveUnitId)
    : undefined;
  const showWallClearance = !selectedUnit?.mountedAboveUnitId || !selectedWallAnchor ||
    selectedWallAnchor.type === "base" || selectedWallAnchor.type === "corner-base" || selectedWallAnchor.type === "dishwasher";
  const selectedUnitIds = params.selectedUnitIds && params.selectedUnitIds.length > 0
    ? params.selectedUnitIds
    : (selectedUnit ? [selectedUnit.id] : []);
  const isMultiSelected = selectedUnitIds.length > 1;

  const updateSelectedUnit = (updates: Partial<KitchenCabinetUnit>) => {
    if (isMultiSelected) {
      const newUnits = kitchenUnits.map((u) =>
        selectedUnitIds.includes(u.id) ? { ...u, ...updates } : u
      );
      setParams((prev) => ({
        ...prev,
        kitchenUnits: newUnits,
      }));
    } else if (selectedUnit) {
      const newUnits = kitchenUnits.map((u) =>
        u.id === selectedUnit.id ? { ...u, ...updates } : u
      );
      setParams((prev) => ({
        ...prev,
        kitchenUnits: newUnits,
      }));
    }
  };

  const addKitchenUnit = (
    type: "base" | "wall" | "corner-base" | "corner-wall" | "tall" | "fridge" | "dishwasher",
    runAxis?: "run0" | "run1"
  ) => {
    const isCorner = type === "corner-base" || type === "corner-wall";
    const existingCount = kitchenUnits.filter((u) => u.type === type).length;
    const wallAnchor = type === "wall"
      ? (selectedUnit || kitchenUnits.find((unit) => unit.type === "base" || unit.type === "fridge" || unit.type === "tall"))
      : undefined;
    let resolvedRunAxis: "run0" | "run1" | undefined = runAxis;
    if (type === "wall" && !resolvedRunAxis) {
      if (selectedUnit?.type === "wall" && selectedUnit.runAxis) {
        resolvedRunAxis = selectedUnit.runAxis;
      } else if (wallAnchor) {
        const cornerIndex = kitchenUnits.findIndex((unit) => unit.type === "corner-base");
        const anchorIndex = kitchenUnits.findIndex((unit) => unit.id === wallAnchor.id);
        resolvedRunAxis = cornerIndex !== -1 && anchorIndex > cornerIndex ? "run1" : "run0";
      }
    }
    const isFridgeTop = wallAnchor?.type === "fridge";
    const isSecondWallLayer = wallAnchor?.type === "wall" || wallAnchor?.type === "corner-wall";

    const newUnit: KitchenCabinetUnit = {
      id: `${type}-${Date.now()}`,
      name:
        type === "corner-base"
          ? `Corner Base ${existingCount + 1} (90°)`
          : type === "corner-wall"
          ? `Corner Wall ${existingCount + 1} (90°)`
          : type === "base"
          ? `Base Cabinet ${existingCount + 1}`
          : type === "tall"
          ? `Tall Pantry ${existingCount + 1}`
          : type === "fridge"
          ? `Fridge Housing ${existingCount + 1}`
          : type === "dishwasher"
          ? `Dishwasher Unit ${existingCount + 1}`
          : isFridgeTop
          ? `Fridge Top Cabinet ${existingCount + 1}`
          : isSecondWallLayer
          ? `Second Wall Layer ${existingCount + 1}`
          : `Upper Wall Unit ${existingCount + 1}${resolvedRunAxis === "run1" ? " (Turned)" : ""}`,
      type,
      runAxis: type === "wall" ? (resolvedRunAxis || "run0") : undefined,
      mountedAboveUnitId: type === "wall" ? wallAnchor?.id : undefined,
      orientation: isCorner ? "corner-right" : "straight",
      materialType: selectedUnit?.materialType || params.materialType,
      width: type === "corner-base" ? 900 : type === "corner-wall" ? 600 : type === "fridge" ? 700 : (type === "wall" && wallAnchor) ? wallAnchor.width : 600,
      height: type === "tall" ? 2100 : type === "fridge" ? 2000 : isFridgeTop ? 420 : isSecondWallLayer ? 450 : 720,
      depth: type === "corner-base" ? 900 : type === "corner-wall" ? 600 : (type === "base" || type === "tall" || type === "dishwasher") ? 600 : type === "fridge" ? 650 : isFridgeTop ? wallAnchor.depth : 350,
      cornerDepth: isCorner ? (type === "corner-wall" ? 350 : 600) : undefined,
      bottomOffset: (type === "wall" || type === "corner-wall") && !isFridgeTop && !isSecondWallLayer ? 600 : undefined,
      doorType: isCorner ? "cornerDouble" : (type === "tall" ? "double" : "singleLeft"),
      doorStyle: selectedUnit?.doorStyle || "slab",
      hasNoBottom: type === "fridge" || type === "dishwasher",
      hasNoCountertop: type === "tall" || type === "fridge",
      drawerCount: 0,
      internalShelves: isCorner ? (type === "corner-wall" ? 2 : 1) : (type === "tall" ? 4 : (type === "fridge" || type === "dishwasher" ? 0 : 2)),
      handleType: selectedUnit?.handleType || "bar",
      handleFinish: selectedUnit?.handleFinish || "black",
    };
    setParams((prev) => ({
      ...prev,
      kitchenUnits: [...(prev.kitchenUnits || []), newUnit],
      selectedUnitId: newUnit.id,
      selectedUnitIds: [newUnit.id],
    }));
  };

  const deleteSelectedUnit = () => {
    if (kitchenUnits.length <= 1 || !selectedUnit) return;
    const targetIds = isMultiSelected ? selectedUnitIds : [selectedUnit.id];
    const filtered = kitchenUnits.filter((u) => !targetIds.includes(u.id));
    const remaining = filtered.length > 0 ? filtered : [kitchenUnits[0]];
    setParams((prev) => ({
      ...prev,
      kitchenUnits: remaining,
      selectedUnitId: remaining[0].id,
      selectedUnitIds: [remaining[0].id],
    }));
  };

  const duplicateSelectedUnit = () => {
    if (!selectedUnit) return;
    const targetUnits = isMultiSelected
      ? kitchenUnits.filter((u) => selectedUnitIds.includes(u.id))
      : [selectedUnit];

    const clones: KitchenCabinetUnit[] = targetUnits.map((u) => ({
      ...u,
      id: `${u.type}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${u.name} (Copy)`,
    }));

    setParams((prev) => ({
      ...prev,
      kitchenUnits: [...(prev.kitchenUnits || []), ...clones],
      selectedUnitId: clones[0].id,
      selectedUnitIds: clones.map((c) => c.id),
    }));
  };

  // Wardrobe Modular Unit Management
  const wardrobeUnits = params.wardrobeUnits || [];
  const selectedWardrobeUnit = wardrobeUnits.find((u) => u.id === params.selectedWardrobeUnitId) || wardrobeUnits[0];

  const updateSelectedWardrobeUnit = (updates: Partial<WardrobeUnit>) => {
    if (!selectedWardrobeUnit) return;
    const newUnits = wardrobeUnits.map((u) =>
      u.id === selectedWardrobeUnit.id ? { ...u, ...updates } : u
    );
    setParams((prev) => ({
      ...prev,
      wardrobeUnits: newUnits,
    }));
  };

  const addWardrobeUnit = (type: "main" | "top") => {
    const existingCount = wardrobeUnits.filter((u) => u.type === type).length;
    const newUnit: WardrobeUnit = {
      id: `${type}-${Date.now()}`,
      name: `${type === "main" ? "Division" : "Top Bridge"} ${existingCount + 1}`,
      type,
      width: 800,
      height: type === "main" ? 2100 : 450,
      depth: 600,
      doorType: type === "main" ? "sliding" : "hingedDouble",
      doorOpenPercent: 0,
      hasMirror: false,
      mirrorType: "full",
      hasDrawers: type === "main",
      drawerType: "externalBottom",
      drawerCount: type === "main" ? 2 : 0,
      drawerOpenPercent: 0,
      hasClothesHangerRail: type === "main",
      internalShelves: type === "main" ? 2 : 1,
      hasInternalDivider: false,
      partitionOffset: 0,
      partitionSpan: "underTopShelf",
      hangerZone: "left",
      shelfOffsets: [],
      slidingDoorActivePanel: "right",
      handleType: "edgePull",
      handleFinish: "black",
    };
    setParams((prev) => ({
      ...prev,
      wardrobeUnits: [...(prev.wardrobeUnits || []), newUnit],
      selectedWardrobeUnitId: newUnit.id,
    }));
  };

  const deleteSelectedWardrobeUnit = () => {
    if (wardrobeUnits.length <= 1 || !selectedWardrobeUnit) return;
    const filtered = wardrobeUnits.filter((u) => u.id !== selectedWardrobeUnit.id);
    setParams((prev) => ({
      ...prev,
      wardrobeUnits: filtered,
      selectedWardrobeUnitId: filtered[0].id,
    }));
  };

  const duplicateSelectedWardrobeUnit = () => {
    if (!selectedWardrobeUnit) return;
    const clone: WardrobeUnit = {
      ...selectedWardrobeUnit,
      id: `${selectedWardrobeUnit.type}-${Date.now()}`,
      name: `${selectedWardrobeUnit.name} (Copy)`,
    };
    setParams((prev) => ({
      ...prev,
      wardrobeUnits: [...(prev.wardrobeUnits || []), clone],
      selectedWardrobeUnitId: clone.id,
    }));
  };


  // Optimization & Production Metrics Calculation (Turkish MDF-Lam standard plate: 2800x2100mm)
  const metrics = calculateProductionMetrics(params);

  return (
    <aside className={`${styles.sidebarControls} ${isMobileOpen ? styles.sidebarControlsOpen : ""}`}>
      <div className={styles.sidebarHeader}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "0.25rem" }}>
          <h2 className={styles.sidebarTitle}>
            {activeTab === "3d" ? "CAD Inspector" : "2D Drawing Settings"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600 }}>
              {params.category === "Cabinet" ? "KITCHEN STUDIO" : params.category === "Wardrobe" ? "WARDROBE STUDIO" : "PARAMETRIC CAD"}
            </span>
            {onCloseMobile && (
              <button
                type="button"
                className={styles.sidebarCloseBtn}
                onClick={onCloseMobile}
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                <MdClose size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher between 3D Model Parameters & 2D Technical Sheet Settings */}
        <div className={styles.sidebarTabGroup}>
          <button
            type="button"
            onClick={() => setActiveTab("3d")}
            className={`${styles.sidebarTabBtn} ${activeTab === "3d" ? styles.sidebarTabBtnActive : ""}`}
            title="Edit 3D Model Parameters & Dimensions"
          >
            <MdTune size={14} />
            <span>3D Model & Specs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("2d")}
            className={`${styles.sidebarTabBtn} ${activeTab === "2d" ? styles.sidebarTabBtnActive : ""}`}
            title="Edit 2D Drawing Layout, Title Block & Isometric View"
          >
            <MdDesignServices size={14} />
            <span>2D Sheet & Drawing</span>
          </button>
        </div>
      </div>

      <div className={styles.sidebarContent}>
        {activeTab === "3d" ? (
          <>
        {/* Selected Division Status & Quick Move/Delete Card */}
        {params.selectedDivision && (
          <div className={styles.selectedDivisionCard}>
            <div className={styles.divisionCardHeader}>
              <span className={styles.divisionBadge}>
                Selected {params.selectedDivision.type === "shelf" ? `Shelf #${(params.selectedDivision.index ?? 0) + 1}` : `Vertical Divider #${(params.selectedDivision.index ?? 0) + 1}`}
              </span>
              <button
                type="button"
                className={styles.deleteDivisionBtn}
                onClick={() => {
                  if (params.category === "Shelf") {
                    if (params.selectedDivision!.type === "partition") {
                      updateParam("internalColumns", Math.max(1, (params.internalColumns || 2) - 1));
                    } else {
                      updateParam("internalShelves", Math.max(0, (params.internalShelves ?? 3) - 1));
                    }
                    setParams((p) => ({ ...p, selectedDivision: null }));
                  } else {
                    params.onRemoveDivision?.(params.selectedDivision!);
                  }
                }}
                title="Remove selected division"
              >
                <MdDeleteOutline size={14} /> Remove
              </button>
            </div>

            {/* If Shelf: Move Slider & CadNumberInput */}
            {params.category === "Shelf" && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "#cbd5e1", fontWeight: 600 }}>
                    {params.selectedDivision.type === "partition" ? "Horizontal Move (X)" : "Vertical Move (Y)"}
                  </span>
                  <CadNumberInput
                    value={
                      params.selectedDivision.type === "partition"
                        ? (params.shelfColumnOffsets?.[params.selectedDivision.index ?? 0] ?? 0)
                        : (params.shelfRowOffsets?.[params.selectedDivision.index ?? 0] ?? 0)
                    }
                    onChange={(val) => {
                      const idx = params.selectedDivision!.index ?? 0;
                      if (params.selectedDivision!.type === "partition") {
                        const cur = [...(params.shelfColumnOffsets || [])];
                        cur[idx] = val;
                        updateParam("shelfColumnOffsets", cur);
                      } else {
                        const cur = [...(params.shelfRowOffsets || [])];
                        cur[idx] = val;
                        updateParam("shelfRowOffsets", cur);
                      }
                    }}
                    min={-250}
                    max={250}
                    step={5}
                    unit="mm"
                  />
                </div>
                <input
                  type="range"
                  min={-250}
                  max={250}
                  step={5}
                  value={
                    params.selectedDivision.type === "partition"
                      ? (params.shelfColumnOffsets?.[params.selectedDivision.index ?? 0] ?? 0)
                      : (params.shelfRowOffsets?.[params.selectedDivision.index ?? 0] ?? 0)
                  }
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const idx = params.selectedDivision!.index ?? 0;
                    if (params.selectedDivision!.type === "partition") {
                      const cur = [...(params.shelfColumnOffsets || [])];
                      cur[idx] = val;
                      updateParam("shelfColumnOffsets", cur);
                    } else {
                      const cur = [...(params.shelfRowOffsets || [])];
                      cur[idx] = val;
                      updateParam("shelfRowOffsets", cur);
                    }
                  }}
                  className={styles.rangeSlider}
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = params.selectedDivision!.index ?? 0;
                      if (params.selectedDivision!.type === "partition") {
                        const cur = [...(params.shelfColumnOffsets || [])];
                        cur[idx] = Math.max(-250, (cur[idx] ?? 0) - 15);
                        updateParam("shelfColumnOffsets", cur);
                      } else {
                        const cur = [...(params.shelfRowOffsets || [])];
                        cur[idx] = Math.max(-250, (cur[idx] ?? 0) - 15);
                        updateParam("shelfRowOffsets", cur);
                      }
                    }}
                    className={styles.cadSubBtn}
                    style={{ flex: 1, padding: "4px 6px", fontSize: "11px", justifyContent: "center" }}
                    title="Nudge -15mm"
                  >
                    -15mm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = params.selectedDivision!.index ?? 0;
                      if (params.selectedDivision!.type === "partition") {
                        const cur = [...(params.shelfColumnOffsets || [])];
                        cur[idx] = 0;
                        updateParam("shelfColumnOffsets", cur);
                      } else {
                        const cur = [...(params.shelfRowOffsets || [])];
                        cur[idx] = 0;
                        updateParam("shelfRowOffsets", cur);
                      }
                    }}
                    className={styles.cadSubBtn}
                    style={{ flex: 1, padding: "4px 6px", fontSize: "11px", justifyContent: "center", color: "#60a5fa" }}
                    title={params.selectedDivision.type === "partition" ? "Center (0mm)" : "Reset (0mm)"}
                  >
                    {params.selectedDivision.type === "partition" ? "Center (0mm)" : "Reset (0mm)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = params.selectedDivision!.index ?? 0;
                      if (params.selectedDivision!.type === "partition") {
                        const cur = [...(params.shelfColumnOffsets || [])];
                        cur[idx] = Math.min(250, (cur[idx] ?? 0) + 15);
                        updateParam("shelfColumnOffsets", cur);
                      } else {
                        const cur = [...(params.shelfRowOffsets || [])];
                        cur[idx] = Math.min(250, (cur[idx] ?? 0) + 15);
                        updateParam("shelfRowOffsets", cur);
                      }
                    }}
                    className={styles.cadSubBtn}
                    style={{ flex: 1, padding: "4px 6px", fontSize: "11px", justifyContent: "center" }}
                    title="Nudge +15mm"
                  >
                    +15mm
                  </button>
                </div>
              </div>
            )}

            {/* If Wardrobe: Move Slider & CadNumberInput for Partition (X) and Shelves (Y) */}
            {params.category === "Wardrobe" && (() => {
              const wardUnits = params.wardrobeUnits || [];
              const targetUnit = wardUnits.find((u) => u.id === params.selectedDivision?.unitId) ||
                wardUnits.find((u) => u.id === params.selectedWardrobeUnitId) ||
                wardUnits[0];
              if (!targetUnit) return null;

              const isPartition = params.selectedDivision.type === "partition";
              const shelfIdx = params.selectedDivision.index ?? 0;

              const curVal = isPartition
                ? (targetUnit.partitionOffset ?? 0)
                : (targetUnit.shelfOffsets?.[shelfIdx] ?? 0);

              const updateWardUnitVal = (newVal: number) => {
                const clamped = Math.max(-250, Math.min(250, Math.round(newVal)));
                const updated = wardUnits.map((u) => {
                  if (u.id !== targetUnit.id) return u;
                  if (isPartition) {
                    return { ...u, partitionOffset: clamped };
                  } else {
                    const curOffsets = [...(u.shelfOffsets || [])];
                    curOffsets[shelfIdx] = clamped;
                    return { ...u, shelfOffsets: curOffsets };
                  }
                });
                updateParam("wardrobeUnits", updated);
              };

              return (
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "#cbd5e1", fontWeight: 600 }}>
                      {isPartition ? "Horizontal Move (X)" : "Vertical Move (Y)"}
                    </span>
                    <CadNumberInput
                      value={curVal}
                      onChange={updateWardUnitVal}
                      min={-250}
                      max={250}
                      step={5}
                      unit="mm"
                    />
                  </div>
                  <input
                    type="range"
                    min={-250}
                    max={250}
                    step={5}
                    value={curVal}
                    onChange={(e) => updateWardUnitVal(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div style={{ display: "flex", gap: "6px", marginTop: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => updateWardUnitVal(curVal - 15)}
                      className={styles.cadSubBtn}
                      style={{ flex: 1, padding: "4px 6px", fontSize: "11px", justifyContent: "center" }}
                      title="Nudge -15mm"
                    >
                      -15mm
                    </button>
                    <button
                      type="button"
                      onClick={() => updateWardUnitVal(0)}
                      className={styles.cadSubBtn}
                      style={{ flex: 1, padding: "4px 6px", fontSize: "11px", justifyContent: "center", color: "#60a5fa" }}
                      title={isPartition ? "Center Partition (0mm)" : "Reset Shelf (0mm)"}
                    >
                      {isPartition ? "Center (0mm)" : "Reset (0mm)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateWardUnitVal(curVal + 15)}
                      className={styles.cadSubBtn}
                      style={{ flex: 1, padding: "4px 6px", fontSize: "11px", justifyContent: "center" }}
                      title="Nudge +15mm"
                    >
                      +15mm
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {/* Basic Info: Name & Category */}
        <div className={styles.controlGroup}>
          <label className={styles.groupLabel}>Furniture Name</label>
          <input
            type="text"
            value={params.name}
            onChange={(e) => updateParam("name", e.target.value)}
            placeholder="e.g. Master Chef Kitchen"
            className={styles.textInput}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.groupLabel}>Furniture Type</label>
          <div className={styles.categoryPills}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => updateParam("category", cat)}
                className={`${styles.categoryPill} ${
                  params.category === cat ? styles.categoryPillActive : ""
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        
        {/* KITCHEN MULTI-CABINET OUTLINER TREE (When category is Cabinet) */}
        {params.category === "Cabinet" && (
          <>
            {/* Dedicated Batch Editing Card when Multiple Cabinets are Selected */}
            {isMultiSelected && (
              <div className={styles.batchSelectionCard}>
                <div className={styles.batchHeader}>
                  <div className={styles.batchTitleGroup}>
                    <span className={styles.batchIcon}>🔲</span>
                    <div>
                      <div className={styles.batchTitle}>
                        BATCH EDITING ({selectedUnitIds.length} Cabinets Selected)
                      </div>
                      <div className={styles.batchSub}>
                        Changes below apply simultaneously to all selected cabinets
                      </div>
                    </div>
                  </div>
                  <div className={styles.batchBtnRow}>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = kitchenUnits.map((u) => u.id);
                        setParams((p) => ({ ...p, selectedUnitIds: allIds }));
                      }}
                      className={styles.batchBtn}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setParams((p) => ({ ...p, selectedUnitIds: [selectedUnit.id] }));
                      }}
                      className={styles.batchBtn}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Selected Unit Chips */}
                <div className={styles.batchChips}>
                  {selectedUnitIds.map((id) => {
                    const u = kitchenUnits.find((k) => k.id === id);
                    return (
                      <span key={id} className={styles.batchChip}>
                        {u?.type === "corner-base" ? "🔄" : u?.type === "corner-wall" ? "🔃" : u?.type === "wall" ? "⬆️" : "📦"} {u?.name || id}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = selectedUnitIds.filter((x) => x !== id);
                            if (next.length > 0) {
                              setParams((p) => ({ ...p, selectedUnitIds: next, selectedUnitId: next[0] }));
                            }
                          }}
                          style={{ cursor: "pointer", marginLeft: "5px", color: "#f87171", fontWeight: 700 }}
                          title="Remove from batch selection"
                        >
                          ×
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div
              className={`${styles.accordionSection} ${
                openSections.kitchenUnits ? styles.accordionSectionOpen : ""
              }`}
            >
            <button
              type="button"
              className={styles.accordionHeader}
              onClick={() => toggleSection("kitchenUnits")}
            >
              <div className={styles.accordionTitleGroup}>
                <MdLayers size={16} color="var(--accent)" />
                <span>Cabinets & Nested Divisions ({kitchenUnits.length})</span>
              </div>
              {openSections.kitchenUnits ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
            </button>

            {openSections.kitchenUnits && (
              <div className={styles.accordionBody}>
                {/* Outliner Hierarchy Tree */}
                <div className={styles.hierarchyTree}>
                  {kitchenUnits.map((u) => {
                    const isMulti = selectedUnitIds.includes(u.id);
                    const isSelected = selectedUnit?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`${styles.treeUnitBlock} ${isMulti ? styles.treeUnitBlockActive : ""}`}
                      >
                        {/* Unit Parent Row */}
                        <div
                          className={`${styles.treeUnitHeader} ${isMulti ? styles.treeUnitHeaderActive : ""}`}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              const next = selectedUnitIds.includes(u.id)
                                ? selectedUnitIds.filter((id) => id !== u.id)
                                : [...selectedUnitIds, u.id];
                              const finalIds = next.length > 0 ? next : [u.id];
                              setParams((p) => ({ ...p, selectedUnitIds: finalIds, selectedUnitId: finalIds[finalIds.length - 1] }));
                            } else {
                              setParams((p) => ({ ...p, selectedUnitIds: [u.id], selectedUnitId: u.id }));
                            }
                          }}
                        >
                          <div className={styles.treeUnitInfo}>
                            <input
                              type="checkbox"
                              checked={isMulti}
                              onChange={(e) => {
                                e.stopPropagation();
                                const next = isMulti
                                  ? selectedUnitIds.filter((id) => id !== u.id)
                                  : [...selectedUnitIds, u.id];
                                const finalIds = next.length > 0 ? next : [u.id];
                                setParams((p) => ({ ...p, selectedUnitIds: finalIds, selectedUnitId: finalIds[finalIds.length - 1] }));
                              }}
                              style={{ cursor: "pointer", accentColor: "#0284c7" }}
                            />
                            <span>
                              {u.type === "corner-base"
                                ? "🔄"
                                : u.type === "corner-wall"
                                ? "🔃"
                                : u.type === "base"
                                ? "📦"
                                : u.type === "tall"
                                ? "🚪"
                                : u.type === "fridge"
                                ? "🧊"
                                : u.type === "dishwasher"
                                ? "🧼"
                                : "⬆️"}
                            </span>
                            <span className={styles.treeUnitName}>
                              {u.name ||
                                (u.type === "corner-base"
                                  ? "Corner Base"
                                  : u.type === "corner-wall"
                                  ? "Corner Wall"
                                  : u.type === "base"
                                  ? "Base"
                                  : u.type === "tall"
                                  ? "Tall Pantry"
                                  : u.type === "fridge"
                                  ? "Fridge Housing"
                                  : u.type === "dishwasher"
                                  ? "Dishwasher"
                                  : "Wall")}
                            </span>
                            <span className={styles.treeUnitDim}>({u.width}×{u.height}×{u.depth}mm)</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            {isMulti && <span className={styles.treeActiveBadge}>SELECTED</span>}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateSelectedUnit();
                                }}
                                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
                                title="Duplicate cabinet"
                              >
                                <MdContentCopy size={13} />
                              </button>
                              {kitchenUnits.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSelectedUnit();
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                                  title="Delete cabinet"
                                >
                                <MdDeleteOutline size={14} />
                              </button>
                              )}
                            </div>
                        </div>

                        {/* Nested Divisions (Shown for Selected Unit) */}
                        {isSelected && (
                          <div className={styles.treeChildren}>
                            {/* Node 1: Carcass Dimensions Summary */}
                            <div className={styles.treeNode}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setOpenSections((prev) => ({ ...prev, dimensions: true }))}
                                title="Adjust dimensions in Dimensions section below"
                              >
                                <span>📏 Carcass Dimensions</span>
                                <span className={styles.treeNodeBadge}>{u.width} × {u.height} × {u.depth} mm</span>
                              </div>
                            </div>

                            {/* Node 2: Door Facade */}
                            <div className={`${styles.treeNode} ${selectedSubItem === "doors" ? styles.treeNodeActive : ""}`}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setSelectedSubItem(selectedSubItem === "doors" ? "" : "doors")}
                              >
                                <span>🚪 Door Facade</span>
                                <span className={styles.treeNodeBadge}>
                                  {u.doorType === "none" ? "Open" : u.doorType === "singleLeft" ? "Single L" : u.doorType === "singleRight" ? "Single R" : u.doorType === "double" ? "Double" : u.doorType === "cornerDouble" ? "Corner 90°" : "Flip-Up"}
                                </span>
                              </div>
                              {selectedSubItem === "doors" && (
                                <div className={styles.treeNodeDrawer}>
                                  <div className={styles.segmentedGrid3}>
                                    {[
                                      ...(u.type === "corner-base" || u.type === "corner-wall"
                                        ? [{ id: "cornerDouble", label: "Corner 90°" }]
                                        : []),
                                      { id: "none", label: "Open" },
                                      { id: "singleLeft", label: "Single L" },
                                      { id: "singleRight", label: "Single R" },
                                      { id: "double", label: "Double" },
                                      { id: "flipUp", label: "Flip-Up" },
                                    ].map((d) => (
                                      <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => updateSelectedUnit({ doorType: d.id as KitchenCabinetUnit["doorType"] })}
                                        className={`${styles.segmentedBtn} ${u.doorType === d.id ? styles.segmentedBtnActive : ""}`}
                                      >
                                        {d.label}
                                      </button>
                                    ))}
                                  </div>


                                </div>
                              )}
                            </div>

                            {/* Node 3: Interior Shelves */}
                            <div className={`${styles.treeNode} ${selectedSubItem === "shelves" ? styles.treeNodeActive : ""}`}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setSelectedSubItem(selectedSubItem === "shelves" ? "" : "shelves")}
                              >
                                <span>📚 Interior Shelves</span>
                                <span className={styles.treeNodeBadge}>{u.internalShelves ?? 0} Shelves</span>
                              </div>
                              {selectedSubItem === "shelves" && (
                                <div className={styles.treeNodeDrawer}>
                                  <div className={styles.segmentedGrid6}>
                                    {[0, 1, 2, 3, 4, 5].map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => updateSelectedUnit({ internalShelves: s })}
                                        className={`${styles.segmentedBtn} ${(u.internalShelves ?? 0) === s ? styles.segmentedBtnActive : ""}`}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>

                                  {(u.internalShelves ?? 0) > 0 && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.35rem" }}>
                                      {Array.from({ length: u.internalShelves ?? 0 }).map((_, si) => {
                                        const isShelfSelected =
                                          params.selectedDivision?.unitId === u.id &&
                                          params.selectedDivision?.type === "shelf" &&
                                          params.selectedDivision?.index === si;
                                        return (
                                          <div
                                            key={`shelf-item-${si}`}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              padding: "0.25rem 0.5rem",
                                              background: isShelfSelected ? "rgba(245, 158, 11, 0.15)" : "rgba(255,255,255,0.03)",
                                              border: isShelfSelected ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255,255,255,0.06)",
                                              borderRadius: "5px",
                                              fontSize: "0.72rem",
                                            }}
                                          >
                                            <span
                                              style={{ cursor: "pointer", color: isShelfSelected ? "#f59e0b" : "#cbd5e1", flex: 1 }}
                                              onClick={() => params.onSelectDivision?.({ unitId: u.id, type: "shelf", index: si })}
                                            >
                                              Shelf {si + 1}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => params.onRemoveDivision?.({ unitId: u.id, type: "shelf", index: si })}
                                              style={{
                                                background: "transparent",
                                                border: "none",
                                                color: "#f87171",
                                                cursor: "pointer",
                                                padding: "2px",
                                                display: "flex",
                                                alignItems: "center",
                                              }}
                                              title={`Delete Shelf ${si + 1}`}
                                            >
                                              <MdDeleteOutline size={14} />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Node 4: Drawers */}
                            <div className={`${styles.treeNode} ${selectedSubItem === "drawers" ? styles.treeNodeActive : ""}`}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setSelectedSubItem(selectedSubItem === "drawers" ? "" : "drawers")}
                              >
                                <span>🗄️ Drawers</span>
                                <span className={styles.treeNodeBadge}>{(u.drawerCount || 0) > 0 ? `${u.drawerCount} Drawers` : "None"}</span>
                              </div>
                              {selectedSubItem === "drawers" && (
                                <div className={styles.treeNodeDrawer}>
                                  <div className={styles.segmentedGrid5}>
                                    {[0, 1, 2, 3, 4].map((cnt) => (
                                      <button
                                        key={cnt}
                                        type="button"
                                        onClick={() => updateSelectedUnit({ drawerCount: cnt })}
                                        className={`${styles.segmentedBtn} ${(u.drawerCount || 0) === cnt ? styles.segmentedBtnActive : ""}`}
                                      >
                                        {cnt === 0 ? "None" : `${cnt}x`}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Actions */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("base")}
                    className={styles.unitAddBtn}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Base</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("corner-base")}
                    className={styles.unitAddBtn}
                    style={{ borderColor: "rgba(52, 211, 153, 0.4)", color: "#34d399" }}
                  >
                    <MdTurnRight size={14} color="#34d399" />
                    <span>+ Add 90° Corner Base</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("corner-wall")}
                    className={styles.unitAddBtn}
                    style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#c084fc" }}
                  >
                    <MdTurnRight size={14} color="#c084fc" />
                    <span>+ Add 90° Corner Wall</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("wall", "run0")}
                    className={styles.unitAddBtn}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Wall Unit</span>
                  </button>
                  {kitchenUnits.some((u) => u.type === "corner-base" || u.type === "corner-wall") && (
                    <button
                      type="button"
                      onClick={() => addKitchenUnit("wall", "run1")}
                      className={styles.unitAddBtn}
                      style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}
                    >
                      <MdAdd size={14} />
                      <span>+ Add Wall (Turned Run 1)</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("tall")}
                    className={styles.unitAddBtn}
                    style={{ borderColor: "rgba(251, 146, 60, 0.4)", color: "#fb923c" }}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Tall / Pantry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("fridge")}
                    className={styles.unitAddBtn}
                    style={{ borderColor: "rgba(34, 211, 238, 0.4)", color: "#22d3ee" }}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Fridge</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("dishwasher")}
                    className={styles.unitAddBtn}
                    style={{ borderColor: "rgba(129, 140, 248, 0.4)", color: "#818cf8" }}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Dishwasher</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        )}


        
        {/* WARDROBE MULTI-SECTION OUTLINER TREE (When category is Wardrobe) */}
        {params.category === "Wardrobe" && (
          <div
            className={`${styles.accordionSection} ${
              openSections.wardrobeUnits ? styles.accordionSectionOpen : ""
            }`}
          >
            <button
              type="button"
              className={styles.accordionHeader}
              onClick={() => toggleSection("wardrobeUnits")}
            >
              <div className={styles.accordionTitleGroup}>
                <MdLayers size={16} color="var(--accent)" />
                <span>Wardrobe & Nested Divisions ({wardrobeUnits.length})</span>
              </div>
              {openSections.wardrobeUnits ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
            </button>

            {openSections.wardrobeUnits && (
              <div className={styles.accordionBody}>
                {/* Outliner Hierarchy Tree */}
                <div className={styles.hierarchyTree}>
                  {wardrobeUnits.map((u) => {
                    const isSelected = selectedWardrobeUnit?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`${styles.treeUnitBlock} ${isSelected ? styles.treeUnitBlockActive : ""}`}
                      >
                        {/* Parent Division Row */}
                        <div
                          className={`${styles.treeUnitHeader} ${isSelected ? styles.treeUnitHeaderActive : ""}`}
                          onClick={() => updateParam("selectedWardrobeUnitId", u.id)}
                        >
                          <div className={styles.treeUnitInfo}>
                            <span>{u.type === "main" ? "🚪" : "⬆️"}</span>
                            <span className={styles.treeUnitName}>{u.name || (u.type === "main" ? "Division" : "Top Bridge")}</span>
                            <span className={styles.treeUnitDim}>({u.width}×{u.height}×{u.depth}mm)</span>
                          </div>
                          {isSelected && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              <span className={styles.treeActiveBadge}>ACTIVE</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateSelectedWardrobeUnit();
                                }}
                                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
                                title="Duplicate division"
                              >
                                <MdContentCopy size={13} />
                              </button>
                              {wardrobeUnits.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSelectedWardrobeUnit();
                                  }}
                                  style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                                  title="Delete division"
                                >
                                <MdDeleteOutline size={14} />
                              </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Nested Divisions (Shown for Selected Division) */}
                        {isSelected && (
                          <div className={styles.treeChildren}>
                            {/* Node 1: Division Dimensions Summary */}
                            <div className={styles.treeNode}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setOpenSections((prev) => ({ ...prev, dimensions: true }))}
                                title="Adjust dimensions in Dimensions section below"
                              >
                                <span>📏 Division Dimensions</span>
                                <span className={styles.treeNodeBadge}>{u.width} × {u.height} mm</span>
                              </div>
                            </div>

                            {/* Node 2: Door Style & Mirror */}
                            <div className={`${styles.treeNode} ${selectedSubItem === "doors" ? styles.treeNodeActive : ""}`}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setSelectedSubItem(selectedSubItem === "doors" ? "" : "doors")}
                              >
                                <span>🚪 Door Facade & Mirror</span>
                                <span className={styles.treeNodeBadge}>
                                  {u.doorType === "sliding" ? "Sliding" : u.doorType === "hingedDouble" ? "Hinged 2x" : u.doorType === "hingedSingle" ? "Hinged 1x" : "Open"}
                                  {u.hasMirror ? " (Mirror)" : ""}
                                </span>
                              </div>
                              {selectedSubItem === "doors" && (
                                <div className={styles.treeNodeDrawer}>
                                  <div className={styles.segmentedGrid4}>
                                    {[
                                      { id: "sliding", label: "Sliding" },
                                      { id: "hingedDouble", label: "Hinged 2x" },
                                      { id: "hingedSingle", label: "Hinged 1x" },
                                      { id: "open", label: "Open" },
                                    ].map((d) => (
                                      <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => updateSelectedWardrobeUnit({ doorType: d.id as WardrobeUnit["doorType"] })}
                                        className={`${styles.segmentedBtn} ${u.doorType === d.id ? styles.segmentedBtnActive : ""}`}
                                      >
                                        {d.label}
                                      </button>
                                    ))}
                                  </div>

                                  {u.doorType !== "open" && (
                                    <>


                                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.45rem", marginBottom: "0.25rem", fontWeight: 600 }}>
                                        Ayna Seçeneği (Mirror Option)
                                      </div>
                                      <div className={styles.segmentedGrid3}>
                                        {[
                                          { label: "Wood Door", mirror: false, type: "full" },
                                          { label: "Silver Mirror", mirror: true, type: "full" },
                                          { label: "Center Mirror", mirror: true, type: "center" },
                                          { label: "Bronze Mirror", mirror: true, type: "bronze" },
                                          { label: "Smoked Mirror", mirror: true, type: "smoked" },
                                        ].map((m, mi) => {
                                          const isMatch = !m.mirror ? !u.hasMirror : u.hasMirror && (u.mirrorType || "full") === m.type;
                                          return (
                                            <button
                                              key={mi}
                                              type="button"
                                              onClick={() => updateSelectedWardrobeUnit({ hasMirror: m.mirror, mirrorType: m.type as WardrobeUnit["mirrorType"] })}
                                              className={`${styles.segmentedBtn} ${isMatch ? styles.segmentedBtnActive : ""}`}
                                            >
                                              {m.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Node 3: Hanging Rod & Partition */}
                            <div className={`${styles.treeNode} ${selectedSubItem === "interior" ? styles.treeNodeActive : ""}`}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setSelectedSubItem(selectedSubItem === "interior" ? "" : "interior")}
                              >
                                <span>👔 Hanging Rod & Partition</span>
                                <span className={styles.treeNodeBadge}>
                                  {u.hasClothesHangerRail ? "Rod On" : "No Rod"}
                                </span>
                              </div>
                              {selectedSubItem === "interior" && (
                                <div className={styles.treeNodeDrawer}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>Clothes Hanging Rod</span>
                                    <button
                                      type="button"
                                      onClick={() => updateSelectedWardrobeUnit({ hasClothesHangerRail: !u.hasClothesHangerRail })}
                                      className={`${styles.toggleSwitch} ${u.hasClothesHangerRail ? styles.toggleSwitchActive : ""}`}
                                    >
                                      <div className={`${styles.toggleKnob} ${u.hasClothesHangerRail ? styles.toggleKnobActive : ""}`} />
                                    </button>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.3rem" }}>
                                    <span style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>Center Vertical Partition</span>
                                    <button
                                      type="button"
                                      onClick={() => updateSelectedWardrobeUnit({ hasInternalDivider: !u.hasInternalDivider })}
                                      className={`${styles.toggleSwitch} ${u.hasInternalDivider ? styles.toggleSwitchActive : ""}`}
                                    >
                                      <div className={`${styles.toggleKnob} ${u.hasInternalDivider ? styles.toggleKnobActive : ""}`} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Node 4: Shelves */}
                            <div className={`${styles.treeNode} ${selectedSubItem === "shelves" ? styles.treeNodeActive : ""}`}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setSelectedSubItem(selectedSubItem === "shelves" ? "" : "shelves")}
                              >
                                <span>📚 Shelves</span>
                                <span className={styles.treeNodeBadge}>{u.internalShelves ?? 0} Shelves</span>
                              </div>
                              {selectedSubItem === "shelves" && (
                                <div className={styles.treeNodeDrawer}>
                                  <div className={styles.segmentedGrid6}>
                                    {[0, 1, 2, 3, 4, 5].map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => updateSelectedWardrobeUnit({ internalShelves: s })}
                                        className={`${styles.segmentedBtn} ${(u.internalShelves ?? 0) === s ? styles.segmentedBtnActive : ""}`}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Node 5: Drawers */}
                            <div className={`${styles.treeNode} ${selectedSubItem === "drawers" ? styles.treeNodeActive : ""}`}>
                              <div
                                className={styles.treeNodeRow}
                                onClick={() => setSelectedSubItem(selectedSubItem === "drawers" ? "" : "drawers")}
                              >
                                <span>🗄️ Drawers</span>
                                <span className={styles.treeNodeBadge}>{u.hasDrawers ? `${u.drawerCount} Drawers` : "None"}</span>
                              </div>
                              {selectedSubItem === "drawers" && (
                                <div className={styles.treeNodeDrawer}>
                                  <div className={styles.segmentedGrid2} style={{ marginBottom: "0.4rem" }}>
                                    {[
                                      { id: "externalBottom", label: "External Bottom" },
                                      { id: "internal", label: "Internal" },
                                    ].map((p) => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => updateSelectedWardrobeUnit({ drawerType: p.id as WardrobeUnit["drawerType"] })}
                                        className={`${styles.segmentedBtn} ${(u.drawerType || "externalBottom") === p.id ? styles.segmentedBtnActive : ""}`}
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className={styles.segmentedGrid5}>
                                    {[0, 1, 2, 3, 4].map((cnt) => (
                                      <button
                                        key={cnt}
                                        type="button"
                                        onClick={() => updateSelectedWardrobeUnit({ hasDrawers: cnt > 0, drawerCount: cnt })}
                                        className={`${styles.segmentedBtn} ${(u.drawerCount || 0) === cnt ? styles.segmentedBtnActive : ""}`}
                                      >
                                        {cnt === 0 ? "None" : `${cnt}x`}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Actions */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => addWardrobeUnit("main")}
                    className={styles.unitAddBtn}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Division</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addWardrobeUnit("top")}
                    className={styles.unitAddBtn}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Top Bridge</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* SECTION 1: DIMENSIONS */}
        <div
          className={`${styles.accordionSection} ${
            openSections.dimensions ? styles.accordionSectionOpen : ""
          }`}
        >
          <button
            type="button"
            className={styles.accordionHeader}
            onClick={() => toggleSection("dimensions")}
          >
            <div className={styles.accordionTitleGroup}>
              <MdStraighten size={16} color="var(--accent)" />
              <span>
                {params.category === "Cabinet" && selectedUnit
                  ? `Dimensions: ${selectedUnit.name}`
                  : params.category === "Wardrobe" && selectedWardrobeUnit
                  ? `Dimensions: ${selectedWardrobeUnit.name}`
                  : "Dimensions (X, Y, Z)"}
              </span>
            </div>
            {openSections.dimensions ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
          </button>

          {openSections.dimensions && (
            <div className={styles.accordionBody}>
              
              {params.category === "Wardrobe" && selectedWardrobeUnit ? (
                <>
                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Division Width (X)</span>
                      <CadNumberInput
                        value={selectedWardrobeUnit.width}
                        onChange={(val) => updateSelectedWardrobeUnit({ width: val })}
                        min={400}
                        max={2500}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={2500}
                      step={20}
                      value={selectedWardrobeUnit.width}
                      onChange={(e) => updateSelectedWardrobeUnit({ width: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Height (Y)</span>
                      <CadNumberInput
                        value={selectedWardrobeUnit.height}
                        onChange={(val) => updateSelectedWardrobeUnit({ height: val })}
                        min={selectedWardrobeUnit.type === "top" ? 300 : 1600}
                        max={selectedWardrobeUnit.type === "top" ? 900 : 2600}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={selectedWardrobeUnit.type === "top" ? 300 : 1600}
                      max={selectedWardrobeUnit.type === "top" ? 900 : 2600}
                      step={20}
                      value={selectedWardrobeUnit.height}
                      onChange={(e) => updateSelectedWardrobeUnit({ height: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Depth (Z)</span>
                      <CadNumberInput
                        value={selectedWardrobeUnit.depth}
                        onChange={(val) => updateSelectedWardrobeUnit({ depth: val })}
                        min={450}
                        max={800}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={450}
                      max={800}
                      step={10}
                      value={selectedWardrobeUnit.depth}
                      onChange={(e) => updateSelectedWardrobeUnit({ depth: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
                  </div>
                </>
              ) : params.category === "Cabinet" && selectedUnit ? (
                <>
                  {/* Cabinet Type & Run Orientation Switcher */}
                  <div className={styles.controlGroup}>
                    <label className={styles.groupLabel}>Cabinet Type & Orientation</label>
                    <div className={styles.segmentedGrid4}>
                      {[
                        { id: "base", label: "Straight Base" },
                        { id: "corner-base", label: "90° Corner Base" },
                        { id: "wall", label: "Straight Wall" },
                        { id: "corner-wall", label: "90° Corner Wall" },
                        { id: "tall", label: "Full Height (Pantry)" },
                        { id: "fridge", label: "Fridge Housing" },
                        { id: "dishwasher", label: "Dishwasher" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (t.id === "tall") {
                              updateSelectedUnit({
                                type: "tall",
                                orientation: "straight",
                                width: selectedUnit.width || 600,
                                height: selectedUnit.height < 1200 ? 2100 : selectedUnit.height,
                                depth: selectedUnit.depth < 500 ? 600 : selectedUnit.depth,
                                hasNoBottom: false,
                                hasNoCountertop: true,
                              });
                            } else if (t.id === "fridge") {
                              updateSelectedUnit({
                                type: "fridge",
                                orientation: "straight",
                                width: selectedUnit.width < 600 ? 700 : selectedUnit.width,
                                height: selectedUnit.height < 1200 ? 2000 : selectedUnit.height,
                                depth: selectedUnit.depth < 500 ? 650 : selectedUnit.depth,
                                hasNoBottom: true,
                                hasNoCountertop: true,
                              });
                            } else if (t.id === "dishwasher") {
                              updateSelectedUnit({
                                type: "dishwasher",
                                orientation: "straight",
                                width: 600,
                                height: 720,
                                depth: 600,
                                hasNoBottom: true,
                                hasNoCountertop: false,
                              });
                            } else if (t.id === "corner-base") {
                              updateSelectedUnit({
                                type: "corner-base",
                                orientation: "corner-right",
                                width: 900,
                                depth: 900,
                                doorType: "cornerDouble",
                                hasNoBottom: false,
                                hasNoCountertop: false,
                              });
                            } else if (t.id === "corner-wall") {
                              updateSelectedUnit({
                                type: "corner-wall",
                                orientation: "corner-right",
                                width: 600,
                                height: selectedUnit.height > 1200 ? 720 : (selectedUnit.height || 720),
                                depth: 600,
                                doorType: "cornerDouble",
                                internalShelves: 2,
                                hasNoBottom: false,
                                hasNoCountertop: false,
                              });
                            } else if (t.id === "base") {
                              updateSelectedUnit({
                                type: "base",
                                orientation: "straight",
                                width: selectedUnit.width === 900 ? 600 : selectedUnit.width,
                                height: selectedUnit.height > 1200 ? 720 : selectedUnit.height,
                                depth: 600,
                                doorType: "singleLeft",
                                hasNoBottom: false,
                                hasNoCountertop: false,
                              });
                            } else {
                              updateSelectedUnit({
                                type: "wall",
                                runAxis: selectedUnit.runAxis || "run0",
                                orientation: "straight",
                                width: selectedUnit.width === 900 ? 600 : selectedUnit.width,
                                height: selectedUnit.height > 1200 ? 720 : selectedUnit.height,
                                depth: 350,
                                doorType: "singleLeft",
                                hasNoBottom: false,
                                hasNoCountertop: false,
                              });
                            }
                          }}
                          className={`${styles.segmentedBtn} ${
                            (selectedUnit.type || "base") === t.id ? styles.segmentedBtnActive : ""
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Turn Direction (If Corner Base or Corner Wall) */}
                  {(selectedUnit.type === "corner-base" || selectedUnit.type === "corner-wall") && (
                    <div className={styles.controlGroup}>
                      <label className={styles.groupLabel}>L-Shape Corner Direction</label>
                      <div className={styles.segmentedGrid2}>
                        {[
                          { id: "corner-right", label: "Turn Right (+90°)" },
                          { id: "corner-left", label: "Turn Left (-90°)" },
                        ].map((dir) => (
                          <button
                            key={dir.id}
                            type="button"
                            onClick={() => updateSelectedUnit({ orientation: dir.id as KitchenCabinetUnit["orientation"] })}
                            className={`${styles.segmentedBtn} ${
                              (selectedUnit.orientation || "corner-right") === dir.id ? styles.segmentedBtnActive : ""
                            }`}
                          >
                            {dir.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wall Placement Axis (If Straight Wall Unit) */}
                  {selectedUnit.type === "wall" && (
                    <div className={styles.controlGroup}>
                      <label className={styles.groupLabel}>Wall Placement Axis</label>
                      <div className={styles.segmentedGrid2}>
                        {[
                          { id: "run0", label: "Main Wall (Run 0)" },
                          { id: "run1", label: "Turned Wall (Run 1)" },
                        ].map((axis) => (
                          <button
                            key={axis.id}
                            type="button"
                            onClick={() => updateSelectedUnit({ runAxis: axis.id as "run0" | "run1", mountedAboveUnitId: undefined })}
                            className={`${styles.segmentedBtn} ${
                              (selectedUnit.runAxis || "run0") === axis.id ? styles.segmentedBtnActive : ""
                            }`}
                          >
                            {axis.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUnit.type === "wall" && (
                    <div className={styles.controlGroup}>
                      <label className={styles.groupLabel}>Mounted Above</label>
                      <select
                        value={selectedUnit.mountedAboveUnitId || ""}
                        onChange={(e) => updateSelectedUnit({ mountedAboveUnitId: e.target.value || undefined })}
                        style={{ width: "100%", padding: "0.45rem", background: "#111827", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.3)", borderRadius: "5px" }}
                      >
                        <option value="">Automatic wall layout</option>
                        {kitchenUnits
                          .slice(0, kitchenUnits.findIndex((unit) => unit.id === selectedUnit.id))
                          .filter((unit) => unit.type !== "dishwasher")
                          .map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name} ({unit.type === "wall" || unit.type === "corner-wall" ? "stack above" : "align above"})
                            </option>
                          ))}
                      </select>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "3px" }}>
                        Anchored units stay aligned when the lower cabinet changes size or position.
                      </div>
                    </div>
                  )}

                  {(selectedUnit.type === "fridge" || selectedUnit.type === "wall") && (
                    <button
                      type="button"
                      onClick={() => addKitchenUnit("wall")}
                      className={styles.unitAddBtn}
                      style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8", marginTop: "0.5rem" }}
                    >
                      <MdAdd size={14} />
                      <span>{selectedUnit.type === "fridge" ? "+ Add Fridge Top Cabinet" : "+ Add Second Wall Layer"}</span>
                    </button>
                  )}



                  {/* Selected Kitchen Cabinet Dimensions */}
                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>
                        {selectedUnit.type === "corner-base" || selectedUnit.type === "corner-wall"
                          ? "Width (Wing 1 / Run 0)"
                          : "Width (X)"}
                      </span>
                      <CadNumberInput
                        value={selectedUnit.width}
                        onChange={(val) => updateSelectedUnit({ width: val })}
                        min={300}
                        max={1400}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={300}
                      max={1400}
                      step={10}
                      value={selectedUnit.width}
                      onChange={(e) => updateSelectedUnit({ width: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Height (Y)</span>
                      <CadNumberInput
                        value={selectedUnit.height}
                        onChange={(val) => updateSelectedUnit({ height: val })}
                        min={350}
                        max={selectedUnit.type === "tall" || selectedUnit.type === "fridge" ? 2600 : 1200}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={350}
                      max={selectedUnit.type === "tall" || selectedUnit.type === "fridge" ? 2600 : 1200}
                      step={10}
                      value={selectedUnit.height}
                      onChange={(e) => updateSelectedUnit({ height: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>
                        {selectedUnit.type === "corner-base" || selectedUnit.type === "corner-wall"
                          ? "Length (Wing 2 / Run 1)"
                          : "Depth (Z)"}
                      </span>
                      <CadNumberInput
                        value={selectedUnit.depth}
                        onChange={(val) => updateSelectedUnit({ depth: val })}
                        min={250}
                        max={1400}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={250}
                      max={1400}
                      step={10}
                      value={selectedUnit.depth}
                      onChange={(e) => updateSelectedUnit({ depth: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
                  </div>

                  {/* Corner Cabinet Actual Body / Return Depth Controller */}
                  {(selectedUnit.type === "corner-base" || selectedUnit.type === "corner-wall") && (
                    <div className={styles.sliderCard}>
                      <div className={styles.sliderHead}>
                        <span className={styles.sliderName}>Carcass Return Depth (Actual Depth)</span>
                        <CadNumberInput
                          value={selectedUnit.cornerDepth ?? (selectedUnit.type === "corner-wall" ? 350 : 600)}
                          onChange={(val) => updateSelectedUnit({ cornerDepth: val })}
                          min={200}
                          max={Math.min(selectedUnit.width, selectedUnit.depth) - 50}
                          unit="mm"
                        />
                      </div>
                      <input
                        type="range"
                        min={200}
                        max={Math.min(selectedUnit.width, selectedUnit.depth) - 50}
                        step={10}
                        value={selectedUnit.cornerDepth ?? (selectedUnit.type === "corner-wall" ? 350 : 600)}
                        onChange={(e) => updateSelectedUnit({ cornerDepth: Number(e.target.value) })}
                        className={styles.rangeSlider}
                      />
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "3px" }}>
                        Actual depth of the cabinet body arms meeting adjoining cabinets
                      </div>
                    </div>
                  )}

                  {/* Upper Wall Cabinet Distance From Bottom Cabinet Controller */}
                  {(selectedUnit.type === "wall" || selectedUnit.type === "corner-wall") && showWallClearance && (
                    <div className={styles.sliderCard}>
                      <div className={styles.sliderHead}>
                        <span className={styles.sliderName}>Distance from Bottom Cabinet</span>
                        <CadNumberInput
                          value={selectedUnit.bottomOffset ?? 600}
                          onChange={(val) => updateSelectedUnit({ bottomOffset: val })}
                          min={250}
                          max={1100}
                          unit="mm"
                        />
                      </div>
                      <input
                        type="range"
                        min={250}
                        max={1100}
                        step={10}
                        value={selectedUnit.bottomOffset ?? 600}
                        onChange={(e) => updateSelectedUnit({ bottomOffset: Number(e.target.value) })}
                        className={styles.rangeSlider}
                      />
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "3px" }}>
                        Clearance gap from countertop / base cabinet to this upper unit (backsplash height)
                      </div>
                    </div>
                  )}

                  {/* Selected Unit Carcass Construction & Countertop Flags */}
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div
                      className={styles.toggleRow}
                      title={selectedUnit.type === "fridge" || selectedUnit.type === "dishwasher"
                        ? "Appliance cabinets always omit the bottom panel and toe kick."
                        : undefined}
                      onClick={() => {
                        if (selectedUnit.type === "fridge" || selectedUnit.type === "dishwasher") return;
                        updateSelectedUnit({ hasNoBottom: !selectedUnit.hasNoBottom });
                      }}
                    >
                      <span className={styles.toggleLabel}>No Bottom Panel or Toe Kick (Sits on Floor / Appliance)</span>
                      <div
                        className={`${styles.toggleSwitch} ${
                          (selectedUnit.hasNoBottom || selectedUnit.type === "fridge" || selectedUnit.type === "dishwasher")
                            ? styles.toggleSwitchActive
                            : ""
                        }`}
                      >
                        <div
                          className={`${styles.toggleKnob} ${
                            (selectedUnit.hasNoBottom || selectedUnit.type === "fridge" || selectedUnit.type === "dishwasher")
                              ? styles.toggleKnobActive
                              : ""
                          }`}
                        />
                      </div>
                    </div>

                    <div
                      className={styles.toggleRow}
                      onClick={() => updateSelectedUnit({ hasNoCountertop: !selectedUnit.hasNoCountertop })}
                    >
                      <span className={styles.toggleLabel}>Exclude From Countertop (No Worktop Over This)</span>
                      <div
                        className={`${styles.toggleSwitch} ${
                          selectedUnit.hasNoCountertop ? styles.toggleSwitchActive : ""
                        }`}
                      >
                        <div
                          className={`${styles.toggleKnob} ${
                            selectedUnit.hasNoCountertop ? styles.toggleKnobActive : ""
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Kitchen Countertop (Worktop) & Backsplash Options */}
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div
                      className={styles.toggleRow}
                      onClick={() => updateParam("hasCountertop", !params.hasCountertop)}
                    >
                      <span className={styles.toggleLabel}>Add Countertop (Worktop)</span>
                      <div
                        className={`${styles.toggleSwitch} ${
                          params.hasCountertop ? styles.toggleSwitchActive : ""
                        }`}
                      >
                        <div
                          className={`${styles.toggleKnob} ${
                            params.hasCountertop ? styles.toggleKnobActive : ""
                          }`}
                        />
                      </div>
                    </div>

                    {params.hasCountertop && (
                      <div className={styles.sliderCard} style={{ marginTop: "0.4rem" }}>
                        <div className={styles.sliderHead}>
                          <span className={styles.sliderName}>Countertop Slab Thickness</span>
                          <CadNumberInput
                            value={params.countertopThickness ?? 30}
                            onChange={(val) => updateParam("countertopThickness", val)}
                            min={12}
                            max={100}
                            unit="mm"
                          />
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={100}
                          step={2}
                          value={params.countertopThickness ?? 30}
                          onChange={(e) => updateParam("countertopThickness", Number(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>
                    )}

                    <div
                      className={styles.toggleRow}
                      onClick={() => updateParam("hasBacksplash", !params.hasBacksplash)}
                      style={{ marginTop: "0.5rem" }}
                    >
                      <span className={styles.toggleLabel}>Cover Wall Gap (Backsplash Panel)</span>
                      <div
                        className={`${styles.toggleSwitch} ${
                          params.hasBacksplash ? styles.toggleSwitchActive : ""
                        }`}
                      >
                        <div
                          className={`${styles.toggleKnob} ${
                            params.hasBacksplash ? styles.toggleKnobActive : ""
                          }`}
                        />
                      </div>
                    </div>

                    {params.hasBacksplash && (
                      <div className={styles.sliderCard} style={{ marginTop: "0.4rem" }}>
                        <div className={styles.sliderHead}>
                          <span className={styles.sliderName}>Cover Wall Height</span>
                          <CadNumberInput
                            value={params.backsplashHeight ?? 600}
                            onChange={(val) => updateParam("backsplashHeight", val)}
                            min={100}
                            max={1200}
                            step={10}
                            unit="mm"
                          />
                        </div>
                        <input
                          type="range"
                          min={100}
                          max={1200}
                          step={10}
                          value={params.backsplashHeight ?? 600}
                          onChange={(e) => updateParam("backsplashHeight", Number(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Global Furniture Dimensions (Table / Shelf) */}
                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Width (X)</span>
                      <CadNumberInput
                        value={params.width}
                        onChange={(val) => updateParam("width", val)}
                        min={400}
                        max={3600}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={400}
                      max={3600}
                      step={10}
                      value={params.width}
                      onChange={(e) => updateParam("width", Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Height (Y)</span>
                      <CadNumberInput
                        value={params.height}
                        onChange={(val) => updateParam("height", val)}
                        min={350}
                        max={2600}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={350}
                      max={2600}
                      step={10}
                      value={params.height}
                      onChange={(e) => updateParam("height", Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Depth (Z)</span>
                      <CadNumberInput
                        value={params.depth}
                        onChange={(val) => updateParam("depth", val)}
                        min={200}
                        max={1600}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={200}
                      max={1600}
                      step={10}
                      value={params.depth}
                      onChange={(e) => updateParam("depth", Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>
                </>
              )}

              {/* Board Thickness (Default 18mm) */}
              <div className={styles.sliderCard}>
                <div className={styles.sliderHead}>
                  <span className={styles.sliderName}>
                    {params.category === "Table" || params.category === "Desk" ? "Frame / Apron Thickness" : "Board Thickness"}
                  </span>
                  <CadNumberInput
                    value={params.boardThickness || 18}
                    onChange={(val) => updateParam("boardThickness", val)}
                    min={12}
                    max={60}
                    unit="mm"
                  />
                </div>
                <input
                  type="range"
                  min={12}
                  max={60}
                  step={2}
                  value={params.boardThickness || 18}
                  onChange={(e) => updateParam("boardThickness", Number(e.target.value))}
                  className={styles.rangeSlider}
                />
              </div>

              {/* Table Top Board Thickness Option */}
              {(params.category === "Table" || params.category === "Desk") && (
                <>
                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Top Board Thickness</span>
                      <CadNumberInput
                        value={params.tableTopThickness ?? 25}
                        onChange={(val) => updateParam("tableTopThickness", val)}
                        min={12}
                        max={80}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={80}
                      step={1}
                      value={params.tableTopThickness ?? 25}
                      onChange={(e) => updateParam("tableTopThickness", Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Apron Rail Height</span>
                      <CadNumberInput
                        value={params.apronHeight ?? 65}
                        onChange={(val) => updateParam("apronHeight", val)}
                        min={30}
                        max={120}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={120}
                      step={5}
                      value={params.apronHeight ?? 65}
                      onChange={(e) => updateParam("apronHeight", Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: BASE & LEGS & DESK PEDESTAL */}
        <div
          className={`${styles.accordionSection} ${
            openSections.geometry ? styles.accordionSectionOpen : ""
          }`}
        >
          <button
            type="button"
            className={styles.accordionHeader}
            onClick={() => toggleSection("geometry")}
          >
            <div className={styles.accordionTitleGroup}>
              <MdLayers size={16} color="var(--accent)" />
              <span>Base & Legs</span>
            </div>
            {openSections.geometry ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
          </button>

          {openSections.geometry && (
            <div className={styles.accordionBody}>
              {(params.category === "Cabinet" || params.category === "Wardrobe" || params.category === "Shelf") && (
                <>
                  <div className={styles.controlGroup}>
                    <label className={styles.groupLabel}>Toe Kick / Base Type</label>
                    <div className={styles.segmentedGrid3}>
                      {[
                        { id: "plinth", label: "Plinth" },
                        { id: "legs", label: "Corner Feet" },
                        { id: "floating", label: "Flush Base" },
                      ].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => updateParam("baseType", b.id as FurnitureParams["baseType"])}
                          className={`${styles.segmentedBtn} ${
                            (params.baseType || (params.category === "Cabinet" || params.category === "Wardrobe" ? "plinth" : "floating")) === b.id ? styles.segmentedBtnActive : ""
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {params.baseType !== "floating" && (
                    <>
                      <div className={styles.sliderCard}>
                        <div className={styles.sliderHead}>
                          <span className={styles.sliderName}>Plinth Height</span>
                          <CadNumberInput
                            value={params.plinthHeight || 80}
                            onChange={(val) => updateParam("plinthHeight", val)}
                            min={40}
                            max={160}
                            unit="mm"
                          />
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={160}
                          step={5}
                          value={params.plinthHeight || 80}
                          onChange={(e) => updateParam("plinthHeight", Number(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>

                      <div className={styles.sliderCard}>
                        <div className={styles.sliderHead}>
                          <span className={styles.sliderName}>Plinth Recess / Offset</span>
                          <CadNumberInput
                            value={params.plinthRecess ?? (params.category === "Shelf" ? 30 : 40)}
                            onChange={(val) => updateParam("plinthRecess", val)}
                            min={params.category === "Wardrobe" || params.category === "Shelf" ? 0 : 10}
                            max={params.category === "Wardrobe" || params.category === "Shelf" ? 100 : 80}
                            unit="mm"
                          />
                        </div>
                        <input
                          type="range"
                          min={params.category === "Wardrobe" || params.category === "Shelf" ? 0 : 10}
                          max={params.category === "Wardrobe" || params.category === "Shelf" ? 100 : 80}
                          step={5}
                          value={params.plinthRecess ?? (params.category === "Shelf" ? 30 : 40)}
                          onChange={(e) => updateParam("plinthRecess", Number(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>
                    </>
                  )}

                  {/* Solid Back Board Toggle for Cabinets */}
                  <div
                    className={styles.toggleRow}
                    onClick={() => updateParam("hasBackPanel", !params.hasBackPanel)}
                  >
                    <span className={styles.toggleLabel}>Solid Back Board</span>
                    <div
                      className={`${styles.toggleSwitch} ${
                        params.hasBackPanel !== false ? styles.toggleSwitchActive : ""
                      }`}
                    >
                      <div
                        className={`${styles.toggleKnob} ${
                          params.hasBackPanel !== false ? styles.toggleKnobActive : ""
                        }`}
                      />
                    </div>
                  </div>
                </>
              )}

              {(params.category === "Table" || params.category === "Desk") && (
                <>
                  {/* Leg Structure */}
                  <div className={styles.controlGroup}>
                    <label className={styles.groupLabel}>Leg Structure</label>
                    <div className={styles.segmentedGrid4}>
                      {[
                        { id: "square", label: "Square" },
                        { id: "tapered", label: "Tapered" },
                        { id: "round", label: "Round" },
                        { id: "trestle", label: "U-Trestle" },
                      ].map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => updateParam("legType", l.id as FurnitureParams["legType"])}
                          className={`${styles.segmentedBtn} ${
                            (params.legType || "square") === l.id ? styles.segmentedBtnActive : ""
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {params.legType !== "trestle" && (
                    <div className={styles.sliderCard}>
                      <div className={styles.sliderHead}>
                        <span className={styles.sliderName}>Leg Thickness</span>
                        <CadNumberInput
                          value={params.legThickness || 50}
                          onChange={(val) => updateParam("legThickness", val)}
                          min={30}
                          max={90}
                          unit="mm"
                        />
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={90}
                        step={5}
                        value={params.legThickness || 50}
                        onChange={(e) => updateParam("legThickness", Number(e.target.value))}
                        className={styles.rangeSlider}
                      />
                    </div>
                  )}

                  {/* FIX 1: Top Overhang can be 0 */}
                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Top Overhang</span>
                      <CadNumberInput
                        value={params.topOverhang ?? 25}
                        onChange={(val) => updateParam("topOverhang", val)}
                        min={0}
                        max={120}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={5}
                      value={params.topOverhang ?? 25}
                      onChange={(e) => updateParam("topOverhang", Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>
                </>
              )}

              {/* Solid Back Board Toggle for Shelf */}
              {params.category === "Shelf" && (
                <div
                  className={styles.toggleRow}
                  onClick={() => updateParam("hasBackPanel", !params.hasBackPanel)}
                >
                  <span className={styles.toggleLabel}>Solid Back Board</span>
                  <div
                    className={`${styles.toggleSwitch} ${
                      params.hasBackPanel ? styles.toggleSwitchActive : ""
                    }`}
                  >
                    <div
                      className={`${styles.toggleKnob} ${
                        params.hasBackPanel ? styles.toggleKnobActive : ""
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 3: DOORS, LIDS & DRAWERS (Hidden for Shelf!) */}
        {params.category !== "Shelf" && (
          <div
            className={`${styles.accordionSection} ${
              openSections.openings ? styles.accordionSectionOpen : ""
            }`}
          >
            <button
              type="button"
              className={styles.accordionHeader}
              onClick={() => toggleSection("openings")}
            >
              <div className={styles.accordionTitleGroup}>
                <MdDoorSliding size={16} color="var(--accent)" />
                <span>
                  {params.category === "Cabinet" && selectedUnit
                    ? `Doors & Drawers: ${selectedUnit.name}`
                    : params.category === "Wardrobe" && selectedWardrobeUnit
                    ? `Doors & Facade: ${selectedWardrobeUnit.name}`
                    : "Doors & Drawers"}
                </span>
              </div>
              {openSections.openings ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
            </button>

            {openSections.openings && (
              <div className={styles.accordionBody}>
                {params.category === "Wardrobe" && selectedWardrobeUnit && (
                  <>
                    {/* Door Type: Sliding, Hinged Single, Hinged Double, Open */}
                    <div className={styles.controlGroup}>
                      <label className={styles.groupLabel}>Door Style</label>
                      <div className={styles.segmentedGrid4}>
                        {[
                          { id: "sliding", label: "Sliding" },
                          { id: "hingedDouble", label: "Hinged 2x" },
                          { id: "hingedSingle", label: "Hinged 1x" },
                          { id: "open", label: "Open Front" },
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => updateSelectedWardrobeUnit({ doorType: d.id as WardrobeUnit["doorType"], doorOpenPercent: 0 })}
                            className={`${styles.segmentedBtn} ${
                              selectedWardrobeUnit.doorType === d.id ? styles.segmentedBtnActive : ""
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Door / Front Style (Kapak Modeli) */}
                    {selectedWardrobeUnit.doorType !== "open" && (
                      <div className={styles.controlGroup}>
                        <label className={styles.groupLabel}>Door / Front Style (Kapak Modeli)</label>
                        <div className={styles.segmentedGrid3}>
                          {[
                            { id: "slab", label: "Slab (Flat)" },
                            { id: "slimShaker", label: "Slim Shaker" },
                            { id: "shaker", label: "Classic Shaker" },
                            { id: "fluted", label: "CNC Fluted" },
                            { id: "framedGlass", label: "Framed Glass" },
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                updateSelectedWardrobeUnit({ doorStyle: st.id as WardrobeUnit["doorStyle"] });
                              }}
                              className={`${styles.segmentedBtn} ${
                                (selectedWardrobeUnit.doorStyle || "slab") === st.id
                                  ? styles.segmentedBtnActive
                                  : ""
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mirror on Doors Option */}
                    {selectedWardrobeUnit.doorType !== "open" && (
                      <div className={styles.controlGroup}>
                        <label className={styles.groupLabel}>Door Mirror Option</label>
                        <div className={styles.segmentedGrid3}>
                          {[
                            { id: "none", label: "Wood Door", mirror: false, type: "full" },
                            { id: "full", label: "Silver Mirror", mirror: true, type: "full" },
                            { id: "center", label: "Center Panel", mirror: true, type: "center" },
                            { id: "bronze", label: "Bronze Mirror", mirror: true, type: "bronze" },
                            { id: "smoked", label: "Smoked Mirror", mirror: true, type: "smoked" },
                          ].map((m) => {
                            const isMatch = m.id === "none"
                              ? !selectedWardrobeUnit.hasMirror
                              : selectedWardrobeUnit.hasMirror && (selectedWardrobeUnit.mirrorType || "full") === m.type;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() =>
                                  updateSelectedWardrobeUnit({
                                    hasMirror: m.mirror,
                                    mirrorType: m.type as WardrobeUnit["mirrorType"],
                                  })
                                }
                                className={`${styles.segmentedBtn} ${
                                  isMatch ? styles.segmentedBtnActive : ""
                                }`}
                              >
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 3D Door Open Slider */}
                    {selectedWardrobeUnit.doorType !== "open" && (
                      <div className={styles.actionSliderCard}>
                        <div className={styles.actionSliderHead}>
                          <span>
                            {selectedWardrobeUnit.doorType === "sliding"
                              ? "3D Sliding Door Position"
                              : "3D Door Swing Angle"}
                          </span>
                          <span className={styles.interactiveVal}>
                            {selectedWardrobeUnit.doorType === "sliding"
                              ? `${selectedWardrobeUnit.doorOpenPercent || 0}%`
                              : `${Math.round(((selectedWardrobeUnit.doorOpenPercent || 0) * 90) / 100)}°`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={selectedWardrobeUnit.doorType === "sliding" ? -100 : 0}
                          max={100}
                          step={1}
                          value={selectedWardrobeUnit.doorOpenPercent || 0}
                          onChange={(e) =>
                            updateSelectedWardrobeUnit({ doorOpenPercent: Number(e.target.value) })
                          }
                          className={styles.rangeSlider}
                        />
                      </div>
                    )}

                    {/* Drawers Configuration */}
                    <div className={styles.controlGroup} style={{ marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <label className={styles.groupLabel} style={{ margin: 0 }}>Drawers</label>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedWardrobeUnit({
                              hasDrawers: !selectedWardrobeUnit.hasDrawers,
                              drawerCount: !selectedWardrobeUnit.hasDrawers ? 2 : 0,
                            })
                          }
                          className={`${styles.toggleSwitch} ${
                            selectedWardrobeUnit.hasDrawers ? styles.toggleSwitchActive : ""
                          }`}
                        >
                          <div
                            className={`${styles.toggleKnob} ${
                              selectedWardrobeUnit.hasDrawers ? styles.toggleKnobActive : ""
                            }`}
                          />
                        </button>
                      </div>

                      {selectedWardrobeUnit.hasDrawers && (
                        <>
                          <div className={styles.segmentedGrid2} style={{ marginBottom: "0.5rem" }}>
                            {[
                              { id: "externalBottom", label: "External Bottom" },
                              { id: "internal", label: "Internal Concealed" },
                            ].map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() =>
                                  updateSelectedWardrobeUnit({ drawerType: p.id as WardrobeUnit["drawerType"] })
                                }
                                className={`${styles.segmentedBtn} ${
                                  (selectedWardrobeUnit.drawerType || "externalBottom") === p.id
                                    ? styles.segmentedBtnActive
                                    : ""
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>

                          <div className={styles.segmentedGrid4}>
                            {[1, 2, 3, 4].map((cnt) => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => updateSelectedWardrobeUnit({ drawerCount: cnt })}
                                className={`${styles.segmentedBtn} ${
                                  (selectedWardrobeUnit.drawerCount || 2) === cnt
                                    ? styles.segmentedBtnActive
                                    : ""
                                }`}
                              >
                                {cnt} {cnt === 1 ? "Drawer" : "Drawers"}
                              </button>
                            ))}
                          </div>

                          <div className={styles.actionSliderCard} style={{ marginTop: "0.4rem" }}>
                            <div className={styles.actionSliderHead}>
                              <span>3D Pull Drawers Out</span>
                              <span className={styles.interactiveVal}>
                                {selectedWardrobeUnit.drawerOpenPercent || 0}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={selectedWardrobeUnit.drawerOpenPercent || 0}
                              onChange={(e) =>
                                updateSelectedWardrobeUnit({ drawerOpenPercent: Number(e.target.value) })
                              }
                              className={styles.rangeSlider}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {params.category === "Cabinet" && selectedUnit && (
                  <>
                    {/* Selected Unit Door Configuration */}
                    <div className={styles.controlGroup}>
                      <label className={styles.groupLabel}>Door Configuration</label>
                      <div className={styles.segmentedGrid3}>
                        {[
                          { id: "none", label: "Open / None" },
                          { id: "double", label: "Double" },
                          { id: "singleLeft", label: "Single Left" },
                          { id: "singleRight", label: "Single Right" },
                          { id: "cornerDouble", label: "90° Corner Pair" },
                          { id: "flipUp", label: "Flip-Up Lid" },
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => updateSelectedUnit({ doorType: d.id as KitchenCabinetUnit["doorType"] })}
                            className={`${styles.segmentedBtn} ${
                              selectedUnit.doorType === d.id ? styles.segmentedBtnActive : ""
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>



                    {/* 3D Interactive Door Open Slider */}
                    {selectedUnit.doorType !== "none" && (
                      <div className={styles.actionSliderCard}>
                        <div className={styles.actionSliderHead}>
                          <span>3D Door Open Angle</span>
                          <span className={styles.interactiveVal}>
                            {Math.round((((selectedUnit.doorOpenPercent !== undefined ? selectedUnit.doorOpenPercent : params.doorOpenPercent) || 0) * 90) / 100)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={(selectedUnit.doorOpenPercent !== undefined ? selectedUnit.doorOpenPercent : params.doorOpenPercent) || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateSelectedUnit({ doorOpenPercent: val });
                            updateParam("doorOpenPercent", val);
                          }}
                          className={styles.rangeSlider}
                        />
                      </div>
                    )}

                    {/* Cabinet Unit Drawer Count */}
                    <div className={styles.controlGroup}>
                      <label className={styles.groupLabel}>Drawer Count</label>
                      <div className={styles.segmentedGrid4}>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              const newHeights = n > 0 ? Array(n).fill(Math.round((selectedUnit.height - 36) / n)) : [];
                              updateSelectedUnit({ drawerCount: n, drawerHeights: newHeights });
                            }}
                            className={`${styles.segmentedBtn} ${
                              selectedUnit.drawerCount === n ? styles.segmentedBtnActive : ""
                            }`}
                          >
                            {n === 0 ? "0 (Doors)" : `${n} Dwr`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* UNEVEN DRAWER HEIGHTS CONTROL */}
                    {selectedUnit.drawerCount > 1 && (
                      <div className={styles.controlGroup}>
                        <label className={styles.groupLabel}>Uneven Drawer Heights</label>
                        <div className={styles.segmentedGrid3}>
                          {[
                            { id: "equal", label: "Equal" },
                            { id: "standard", label: "Cutlery + Pots" },
                            { id: "custom", label: "Custom mm" },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                updateSelectedUnit({ drawerHeightsMode: mode.id as KitchenCabinetUnit["drawerHeightsMode"] });
                                if (mode.id === "standard" && selectedUnit.drawerCount === 3) {
                                  const rem = Math.round((selectedUnit.height - 36 - 140) / 2);
                                  updateSelectedUnit({ drawerHeights: [140, rem, rem] });
                                }
                              }}
                              className={`${styles.segmentedBtn} ${
                                (selectedUnit.drawerHeightsMode || "equal") === mode.id
                                  ? styles.segmentedBtnActive
                                  : ""
                              }`}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>

                        {/* Custom Height Editors for each drawer */}
                        {selectedUnit.drawerHeightsMode === "custom" && selectedUnit.drawerHeights && (
                          <div className={styles.drawerHeightsList}>
                            {selectedUnit.drawerHeights.map((dh, di) => (
                              <div key={di} className={styles.drawerHeightRow}>
                                <span style={{ fontSize: "0.76rem", color: "var(--textMain)" }}>
                                  {di === 0 ? "Top Drawer" : di === selectedUnit.drawerCount - 1 ? "Bottom Drawer" : `Drawer ${di + 1}`}
                                </span>
                                <CadNumberInput
                                  value={dh}
                                  onChange={(newH) => {
                                    const next = [...(selectedUnit.drawerHeights || [])];
                                    next[di] = newH;
                                    updateSelectedUnit({ drawerHeights: next });
                                  }}
                                  min={80}
                                  max={500}
                                  unit="mm"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Table / Desk Drawers */}
                {(params.category === "Table" || params.category === "Desk") && (
                  <>
                    <div
                      className={styles.toggleRow}
                      onClick={() => updateParam("hasDrawers", !params.hasDrawers)}
                    >
                      <span className={styles.toggleLabel}>Enable Drawers</span>
                      <div
                        className={`${styles.toggleSwitch} ${
                          params.hasDrawers ? styles.toggleSwitchActive : ""
                        }`}
                      >
                        <div
                          className={`${styles.toggleKnob} ${
                            params.hasDrawers ? styles.toggleKnobActive : ""
                          }`}
                        />
                      </div>
                    </div>

                    {params.hasDrawers && (
                      <>
                        {/* Drawer Style: Apron vs Pedestal */}
                        <div className={styles.controlGroup} style={{ marginTop: "0.5rem" }}>
                          <label className={styles.groupLabel}>Drawer Style</label>
                          <div className={styles.segmentedGrid2}>
                            <button
                              type="button"
                              onClick={() => updateParam("deskDrawerType", "apron")}
                              className={`${styles.segmentedBtn} ${
                                (params.deskDrawerType || "apron") === "apron" ? styles.segmentedBtnActive : ""
                              }`}
                            >
                              Apron (Under Top)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateParam("deskDrawerType", "pedestal")}
                              className={`${styles.segmentedBtn} ${
                                params.deskDrawerType === "pedestal" ? styles.segmentedBtnActive : ""
                              }`}
                            >
                              Office Pedestal Tower
                            </button>
                          </div>
                        </div>

                        {params.deskDrawerType !== "pedestal" ? (
                          <div className={styles.controlGroup}>
                            <label className={styles.groupLabel}>Drawer Count</label>
                            <div className={styles.segmentedGrid3}>
                              {[1, 2, 3].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => updateParam("drawerCount", n)}
                                  className={`${styles.segmentedBtn} ${
                                    (params.drawerCount || 1) === n ? styles.segmentedBtnActive : ""
                                  }`}
                                >
                                  {n} Drawer{n > 1 ? "s" : ""}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={styles.controlGroup}>
                              <label className={styles.groupLabel}>Pedestal Placement Side</label>
                              <div className={styles.segmentedGrid2}>
                                <button
                                  type="button"
                                  onClick={() => updateParam("pedestalSide", "left")}
                                  className={`${styles.segmentedBtn} ${
                                    params.pedestalSide === "left" ? styles.segmentedBtnActive : ""
                                  }`}
                                >
                                  Left Side
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateParam("pedestalSide", "right")}
                                  className={`${styles.segmentedBtn} ${
                                    (params.pedestalSide || "right") === "right" ? styles.segmentedBtnActive : ""
                                  }`}
                                >
                                  Right Side
                                </button>
                              </div>
                            </div>

                            <div className={styles.sliderCard}>
                              <div className={styles.sliderHead}>
                                <span className={styles.sliderName}>Pedestal Width</span>
                                <CadNumberInput
                                  value={params.pedestalWidth || 400}
                                  onChange={(val) => updateParam("pedestalWidth", val)}
                                  min={300}
                                  max={600}
                                  unit="mm"
                                />
                              </div>
                              <input
                                type="range"
                                min={300}
                                max={600}
                                step={10}
                                value={params.pedestalWidth || 400}
                                onChange={(e) => updateParam("pedestalWidth", Number(e.target.value))}
                                className={styles.rangeSlider}
                              />
                            </div>

                            <div className={styles.controlGroup}>
                              <label className={styles.groupLabel}>Pedestal Drawer Count</label>
                              <div className={styles.segmentedGrid3}>
                                {[2, 3, 4].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => updateParam("pedestalDrawerCount", n)}
                                    className={`${styles.segmentedBtn} ${
                                      (params.pedestalDrawerCount || 3) === n ? styles.segmentedBtnActive : ""
                                    }`}
                                  >
                                    {n} Drawers
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* 3D Interactive Drawer Slide-out Slider */}
                {((params.category === "Cabinet" && (selectedUnit?.drawerCount || 0) > 0) ||
                  ((params.category === "Table" || params.category === "Desk") && params.hasDrawers)) && (
                  <div className={styles.actionSliderCard}>
                    <div className={styles.actionSliderHead}>
                      <span>3D Drawer Slide Out</span>
                      <span className={styles.interactiveVal}>{params.drawerOpenPercent || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={params.drawerOpenPercent || 0}
                      onChange={(e) => updateParam("drawerOpenPercent", Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: INNER DIVISIONS & SHELVING (Hidden for Table & Desk) */}
        {params.category !== "Table" && params.category !== "Desk" && (
          <div
            className={`${styles.accordionSection} ${
              openSections.divisions ? styles.accordionSectionOpen : ""
            }`}
          >
          <button
            type="button"
            className={styles.accordionHeader}
            onClick={() => toggleSection("divisions")}
          >
            <div className={styles.accordionTitleGroup}>
              <MdGridGoldenratio size={16} color="var(--accent)" />
              <span>Inner Divisions & Shelves</span>
            </div>
            {openSections.divisions ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
          </button>

          {openSections.divisions && (
            <div className={styles.accordionBody}>
              {params.category === "Wardrobe" && selectedWardrobeUnit && (
                <>
                  <div className={styles.controlGroup}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <label className={styles.groupLabel} style={{ margin: 0 }}>Clothes Hanging Rod & Hangers</label>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedWardrobeUnit({
                            hasClothesHangerRail: !selectedWardrobeUnit.hasClothesHangerRail,
                          })
                        }
                        className={`${styles.toggleSwitch} ${
                          selectedWardrobeUnit.hasClothesHangerRail ? styles.toggleSwitchActive : ""
                        }`}
                      >
                        <div
                          className={`${styles.toggleKnob} ${
                            selectedWardrobeUnit.hasClothesHangerRail ? styles.toggleKnobActive : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className={styles.controlGroup}>
                    <label className={styles.groupLabel}>Horizontal Shelves</label>
                    <div className={styles.segmentedGrid6}>
                      {[0, 1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateSelectedWardrobeUnit({ internalShelves: s })}
                          className={`${styles.segmentedBtn} ${
                            (selectedWardrobeUnit.internalShelves ?? 0) === s
                              ? styles.segmentedBtnActive
                              : ""
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.controlGroup}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <label className={styles.groupLabel} style={{ margin: 0 }}>Center Vertical Partition</label>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedWardrobeUnit({
                            hasInternalDivider: !selectedWardrobeUnit.hasInternalDivider,
                          })
                        }
                        className={`${styles.toggleSwitch} ${
                          selectedWardrobeUnit.hasInternalDivider ? styles.toggleSwitchActive : ""
                        }`}
                      >
                        <div
                          className={`${styles.toggleKnob} ${
                            selectedWardrobeUnit.hasInternalDivider ? styles.toggleKnobActive : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {params.category === "Shelf" && (
                <>
                  {/* Upright Divider Columns (Bays: 1-5 buttons) */}
                  <div className={styles.controlGroup}>
                    <label className={styles.groupLabel}>Vertical Divider Columns</label>
                    <div className={styles.segmentedGrid4}>
                      {[1, 2, 3, 4, 5].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateParam("internalColumns", c)}
                          className={`${styles.segmentedBtn} ${
                            (params.internalColumns || 1) === c ? styles.segmentedBtnActive : ""
                          }`}
                        >
                          {c} {c === 1 ? "Bay" : "Bays"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FIX: Horizontal Shelves consistent segmented buttons 1-6 (NO SLIDER) */}
                  <div className={styles.controlGroup}>
                    <label className={styles.groupLabel}>Horizontal Shelf Tiers</label>
                    <div className={styles.segmentedGrid3}>
                      {[1, 2, 3, 4, 5, 6].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateParam("internalShelves", s)}
                          className={`${styles.segmentedBtn} ${
                            (params.internalShelves ?? 3) === s ? styles.segmentedBtnActive : ""
                          }`}
                        >
                          {s} {s === 1 ? "Shelf" : "Shelves"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid Layout Style */}
                  <div className={styles.controlGroup}>
                    <label className={styles.groupLabel}>Grid Layout</label>
                    <div className={styles.segmentedGrid2}>
                      {[
                        { id: "grid", label: "Continuous Grid" },
                        { id: "staggered", label: "Staggered Cubbies" },
                      ].map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => updateParam("shelfLayout", l.id as FurnitureParams["shelfLayout"])}
                          className={`${styles.segmentedBtn} ${
                            (params.shelfLayout || "grid") === l.id ? styles.segmentedBtnActive : ""
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Selected Division Manipulation & Offset Slider for Shelf & Wardrobe */}
              {params.selectedDivision && (
                    <div className={styles.selectedDivisionCard}>
                      <div className={styles.selectedDivisionHead} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: "#fbbf24", fontSize: "0.78rem" }}>
                          {params.selectedDivision.type === "partition"
                            ? `Selected Vertical Divider #${(params.selectedDivision.index ?? 0) + 1}`
                            : `Selected Shelf Tier #${(params.selectedDivision.index ?? 0) + 1}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (params.onSelectDivision) params.onSelectDivision(null);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            fontSize: "11px",
                          }}
                        >
                          ✕ Deselect
                        </button>
                      </div>

                      <div className={styles.sliderCard} style={{ marginTop: "0.5rem", background: "rgba(245, 158, 11, 0.08)" }}>
                        <div className={styles.sliderHead}>
                          <span className={styles.sliderName}>
                            {params.selectedDivision.type === "partition" ? "Horizontal Offset" : "Vertical Offset"}
                          </span>
                          <CadNumberInput
                            value={
                              params.category === "Wardrobe"
                                ? (() => {
                                    const wUnits = params.wardrobeUnits || [];
                                    const u = wUnits.find((wu) => wu.id === params.selectedDivision?.unitId) || wUnits[0];
                                    if (!u) return 0;
                                    return params.selectedDivision.type === "partition"
                                      ? (u.partitionOffset ?? 0)
                                      : (u.shelfOffsets?.[params.selectedDivision.index ?? 0] ?? 0);
                                  })()
                                : params.selectedDivision.type === "partition"
                                  ? params.shelfColumnOffsets?.[params.selectedDivision.index ?? 0] ?? 0
                                  : params.shelfRowOffsets?.[params.selectedDivision.index ?? 0] ?? 0
                            }
                            onChange={(val) => {
                              const idx = params.selectedDivision?.index ?? 0;
                              if (params.category === "Wardrobe") {
                                const wUnits = params.wardrobeUnits || [];
                                const target = wUnits.find((wu) => wu.id === params.selectedDivision?.unitId) || wUnits[0];
                                if (!target) return;
                                const clamped = Math.max(-250, Math.min(250, Math.round(val)));
                                const updated = wUnits.map((wu) => {
                                  if (wu.id !== target.id) return wu;
                                  if (params.selectedDivision?.type === "partition") {
                                    return { ...wu, partitionOffset: clamped };
                                  } else {
                                    const cur = [...(wu.shelfOffsets || [])];
                                    cur[idx] = clamped;
                                    return { ...wu, shelfOffsets: cur };
                                  }
                                });
                                updateParam("wardrobeUnits", updated);
                              } else {
                                if (params.selectedDivision?.type === "partition") {
                                  const next = [...(params.shelfColumnOffsets || [])];
                                  next[idx] = val;
                                  updateParam("shelfColumnOffsets", next);
                                } else {
                                  const next = [...(params.shelfRowOffsets || [])];
                                  next[idx] = val;
                                  updateParam("shelfRowOffsets", next);
                                }
                              }
                            }}
                            min={-250}
                            max={250}
                            step={5}
                            unit="mm"
                          />
                        </div>
                        <input
                          type="range"
                          min={-250}
                          max={250}
                          step={5}
                          value={
                            params.category === "Wardrobe"
                              ? (() => {
                                  const wUnits = params.wardrobeUnits || [];
                                  const u = wUnits.find((wu) => wu.id === params.selectedDivision?.unitId) || wUnits[0];
                                  if (!u) return 0;
                                  return params.selectedDivision.type === "partition"
                                    ? (u.partitionOffset ?? 0)
                                    : (u.shelfOffsets?.[params.selectedDivision.index ?? 0] ?? 0);
                                })()
                              : params.selectedDivision.type === "partition"
                                ? params.shelfColumnOffsets?.[params.selectedDivision.index ?? 0] ?? 0
                                : params.shelfRowOffsets?.[params.selectedDivision.index ?? 0] ?? 0
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const idx = params.selectedDivision?.index ?? 0;
                            if (params.category === "Wardrobe") {
                              const wUnits = params.wardrobeUnits || [];
                              const target = wUnits.find((wu) => wu.id === params.selectedDivision?.unitId) || wUnits[0];
                              if (!target) return;
                              const clamped = Math.max(-250, Math.min(250, val));
                              const updated = wUnits.map((wu) => {
                                if (wu.id !== target.id) return wu;
                                if (params.selectedDivision?.type === "partition") {
                                  return { ...wu, partitionOffset: clamped };
                                } else {
                                  const cur = [...(wu.shelfOffsets || [])];
                                  cur[idx] = clamped;
                                  return { ...wu, shelfOffsets: cur };
                                }
                              });
                              updateParam("wardrobeUnits", updated);
                            } else {
                              if (params.selectedDivision?.type === "partition") {
                                const next = [...(params.shelfColumnOffsets || [])];
                                next[idx] = val;
                                updateParam("shelfColumnOffsets", next);
                              } else {
                                const next = [...(params.shelfRowOffsets || [])];
                                next[idx] = val;
                                updateParam("shelfRowOffsets", next);
                              }
                            }
                          }}
                          className={styles.rangeSlider}
                        />
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = params.selectedDivision?.index ?? 0;
                            if (params.category === "Wardrobe") {
                              const wUnits = params.wardrobeUnits || [];
                              const target = wUnits.find((wu) => wu.id === params.selectedDivision?.unitId) || wUnits[0];
                              if (!target) return;
                              const updated = wUnits.map((wu) => {
                                if (wu.id !== target.id) return wu;
                                if (params.selectedDivision?.type === "partition") {
                                  return { ...wu, partitionOffset: 0 };
                                } else {
                                  const cur = [...(wu.shelfOffsets || [])];
                                  cur[idx] = 0;
                                  return { ...wu, shelfOffsets: cur };
                                }
                              });
                              updateParam("wardrobeUnits", updated);
                            } else {
                              if (params.selectedDivision?.type === "partition") {
                                const next = [...(params.shelfColumnOffsets || [])];
                                next[idx] = 0;
                                updateParam("shelfColumnOffsets", next);
                              } else {
                                const next = [...(params.shelfRowOffsets || [])];
                                next[idx] = 0;
                                updateParam("shelfRowOffsets", next);
                              }
                            }
                          }}
                          className={styles.segmentedBtn}
                          style={{ flex: 1 }}
                        >
                          Center (0mm)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (params.onRemoveDivision && params.selectedDivision) {
                              params.onRemoveDivision(params.selectedDivision);
                            } else if (params.selectedDivision) {
                              if (params.selectedDivision.type === "partition") {
                                updateParam("internalColumns", Math.max(1, (params.internalColumns || 2) - 1));
                              } else {
                                updateParam("internalShelves", Math.max(0, (params.internalShelves ?? 3) - 1));
                              }
                              if (params.onSelectDivision) params.onSelectDivision(null);
                            }
                          }}
                          className={styles.segmentedBtn}
                          style={{ flex: 1, color: "#f87171" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

              {params.category === "Cabinet" && selectedUnit && (
                <div className={styles.controlGroup}>
                  <label className={styles.groupLabel}>Internal Shelves ({selectedUnit.name})</label>
                  <div className={styles.segmentedGrid4}>
                    {[0, 1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateSelectedUnit({ internalShelves: s })}
                        className={`${styles.segmentedBtn} ${
                          (selectedUnit.internalShelves ?? 0) === s ? styles.segmentedBtnActive : ""
                        }`}
                      >
                        {s} {s === 1 ? "Shelf" : "Shelves"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

        {/* SECTION 5: HARDWARE & HANDLES (Hidden for Shelf!) */}
        {params.category !== "Shelf" && (
          <div
            className={`${styles.accordionSection} ${
              openSections.hardware ? styles.accordionSectionOpen : ""
            }`}
          >
            <button
              type="button"
              className={styles.accordionHeader}
              onClick={() => toggleSection("hardware")}
            >
              <div className={styles.accordionTitleGroup}>
                <MdTune size={16} color="var(--accent)" />
                <span>Hardware & Handles</span>
              </div>
              {openSections.hardware ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
            </button>

            {openSections.hardware && (
              <div className={styles.accordionBody}>
                <div className={styles.controlGroup}>
                  <label className={styles.groupLabel}>Handle Style</label>
                  <div className={styles.segmentedGrid4}>
                    {[
                      { id: "bar", label: "Bar Pull" },
                      { id: "slimLine", label: "Slim Linear" },
                      { id: "halfMoon", label: "Half-Moon" },
                      { id: "knob", label: "Knob" },
                      { id: "edgePull", label: "Edge Lip" },
                      { id: "cncJProfile", label: "CNC J-Profile" },
                      { id: "cutout", label: "Cutout Slot" },
                      { id: "hidden", label: "Hidden / Push" },
                    ].map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          if (params.category === "Cabinet" && selectedUnit) {
                            updateSelectedUnit({ handleType: h.id as KitchenCabinetUnit["handleType"] });
                          } else if (params.category === "Wardrobe" && selectedWardrobeUnit) {
                            updateSelectedWardrobeUnit({ handleType: h.id as WardrobeUnit["handleType"] });
                          }
                          updateParam("handleType", h.id as FurnitureParams["handleType"]);
                        }}
                        className={`${styles.segmentedBtn} ${
                          (params.category === "Cabinet" && selectedUnit
                            ? selectedUnit.handleType
                            : params.category === "Wardrobe" && selectedWardrobeUnit
                            ? selectedWardrobeUnit.handleType
                            : params.handleType || "bar") === h.id
                            ? styles.segmentedBtnActive
                            : ""
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.controlGroup}>
                  <label className={styles.groupLabel}>Hardware Metal Finish</label>
                  <div className={styles.segmentedGrid4}>
                    {[
                      { id: "black", label: "Matte Black" },
                      { id: "steel", label: "Brushed Steel" },
                      { id: "brass", label: "Satin Brass" },
                      { id: "bronze", label: "Smoked Bronze" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (params.category === "Cabinet" && selectedUnit) {
                            updateSelectedUnit({ handleFinish: f.id as KitchenCabinetUnit["handleFinish"] });
                          } else if (params.category === "Wardrobe" && selectedWardrobeUnit) {
                            updateSelectedWardrobeUnit({ handleFinish: f.id as WardrobeUnit["handleFinish"] });
                          }
                          updateParam("handleFinish", f.id as FurnitureParams["handleFinish"]);
                        }}
                        className={`${styles.segmentedBtn} ${
                          (params.category === "Cabinet" && selectedUnit
                            ? selectedUnit.handleFinish
                            : params.category === "Wardrobe" && selectedWardrobeUnit
                            ? selectedWardrobeUnit.handleFinish
                            : params.handleFinish || "black") === f.id
                            ? styles.segmentedBtnActive
                            : ""
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: MATERIALS & FINISH */}
        <div
          className={`${styles.accordionSection} ${
            openSections.materials ? styles.accordionSectionOpen : ""
          }`}
        >
          <button
            type="button"
            className={styles.accordionHeader}
            onClick={() => toggleSection("materials")}
          >
            <div className={styles.accordionTitleGroup}>
              <MdPalette size={16} color="var(--accent)" />
              <span>Material & Finish</span>
            </div>
            {openSections.materials ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
          </button>

          {openSections.materials && (
            <div className={styles.accordionBody}>
              {params.category === "Cabinet" && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: 600 }}>
                    {isMultiSelected
                      ? `Cabinet Material (${selectedUnitIds.length} Selected)`
                      : `Cabinet Material: ${selectedUnit?.name || "Selected Cabinet"}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const mat = (selectedUnit?.materialType || params.materialType || "oak");
                      updateParam("materialType", mat);
                      updateParam(
                        "kitchenUnits",
                        (params.kitchenUnits || []).map((u) => ({ ...u, materialType: mat }))
                      );
                    }}
                    style={{
                      background: "rgba(56, 189, 248, 0.12)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: "4px",
                      color: "#38bdf8",
                      fontSize: "0.68rem",
                      padding: "2px 6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title="Apply selected material to all cabinets"
                  >
                    Apply to All
                  </button>
                </div>
              )}
              <div className={styles.materialGrid}>
                {MATERIALS.map((m) => {
                  const isCurrentActive =
                    params.category === "Cabinet" && selectedUnit
                      ? (selectedUnit.materialType || params.materialType) === m.id
                      : params.materialType === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (params.category === "Cabinet" && selectedUnit) {
                          updateSelectedUnit({ materialType: m.id });
                        } else {
                          updateParam("materialType", m.id);
                        }
                      }}
                      className={`${styles.materialOption} ${
                        isCurrentActive ? styles.materialOptionActive : ""
                      }`}
                    >
                      <span className={styles.colorSwatch} style={{ backgroundColor: m.color }} />
                      <span>{m.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Door / Front Facade Style (Kapak Modeli) */}
              {(params.category === "Cabinet" || params.category === "Wardrobe") && (
                <div className={styles.controlGroup} style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label className={styles.groupLabel} style={{ margin: 0 }}>
                      Door & Facade Style (Kapak Modeli)
                    </label>
                    {params.category === "Cabinet" && (
                      <button
                        type="button"
                        onClick={() => {
                          const style = selectedUnit?.doorStyle || params.doorStyle || "slab";
                          updateParam("doorStyle", style);
                          updateParam(
                            "kitchenUnits",
                            (params.kitchenUnits || []).map((u) => ({ ...u, doorStyle: style }))
                          );
                        }}
                        style={{
                          background: "rgba(56, 189, 248, 0.12)",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          borderRadius: "4px",
                          color: "#38bdf8",
                          fontSize: "0.68rem",
                          padding: "2px 6px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                        title="Apply door style to all cabinets"
                      >
                        Apply to All
                      </button>
                    )}
                  </div>
                  <div className={styles.segmentedGrid3}>
                    {[
                      { id: "slab", label: "Slab (Flat)" },
                      { id: "slimShaker", label: "Slim Shaker" },
                      { id: "shaker", label: "Classic Shaker" },
                      { id: "fluted", label: "CNC Fluted" },
                      { id: "framedGlass", label: "Framed Glass" },
                    ].map((st) => {
                      const isActive =
                        params.category === "Cabinet" && selectedUnit
                          ? (selectedUnit.doorStyle || "slab") === st.id
                          : params.category === "Wardrobe" && selectedWardrobeUnit
                          ? (selectedWardrobeUnit.doorStyle || "slab") === st.id
                          : (params.doorStyle || "slab") === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            if (params.category === "Cabinet" && selectedUnit) {
                              updateSelectedUnit({ doorStyle: st.id as KitchenCabinetUnit["doorStyle"] });
                            } else if (params.category === "Wardrobe" && selectedWardrobeUnit) {
                              updateSelectedWardrobeUnit({ doorStyle: st.id as WardrobeUnit["doorStyle"] });
                            } else {
                              updateParam("doorStyle", st.id as FurnitureParams["doorStyle"]);
                            }
                          }}
                          className={`${styles.segmentedBtn} ${isActive ? styles.segmentedBtnActive : ""}`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hardware Finish (Co-located in Materials & Finishes) */}
              {params.category !== "Shelf" && (
                <div className={styles.controlGroup} style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <label className={styles.groupLabel}>Hardware Metal Finish</label>
                  <div className={styles.segmentedGrid4}>
                    {[
                      { id: "black", label: "Matte Black" },
                      { id: "steel", label: "Brushed Steel" },
                      { id: "brass", label: "Satin Brass" },
                      { id: "bronze", label: "Smoked Bronze" },
                    ].map((f) => {
                      const isActive =
                        params.category === "Cabinet" && selectedUnit
                          ? (selectedUnit.handleFinish || params.handleFinish || "black") === f.id
                          : params.category === "Wardrobe" && selectedWardrobeUnit
                          ? (selectedWardrobeUnit.handleFinish || params.handleFinish || "black") === f.id
                          : (params.handleFinish || "black") === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            if (params.category === "Cabinet" && selectedUnit) {
                              updateSelectedUnit({ handleFinish: f.id as KitchenCabinetUnit["handleFinish"] });
                            } else if (params.category === "Wardrobe" && selectedWardrobeUnit) {
                              updateSelectedWardrobeUnit({ handleFinish: f.id as WardrobeUnit["handleFinish"] });
                            }
                            updateParam("handleFinish", f.id as FurnitureParams["handleFinish"]);
                          }}
                          className={`${styles.segmentedBtn} ${isActive ? styles.segmentedBtnActive : ""}`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 7: PRODUCTION METRICS & CUT LIST */}
        <div
          className={`${styles.accordionSection} ${
            openSections.production ? styles.accordionSectionOpen : ""
          }`}
        >
          <button
            type="button"
            className={styles.accordionHeader}
            onClick={() => toggleSection("production")}
          >
            <div className={styles.accordionTitleGroup}>
              <MdAnalytics size={16} color="var(--accent)" />
              <span>Production & Cut List</span>
            </div>
            {openSections.production ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
          </button>

          {openSections.production && (
            <div className={styles.accordionBody}>
              <div className={styles.optimizationBox}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--textMuted)" }}>Calculated Cut Panels</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>
                    {metrics.panelCount} parts {metrics.backPanelCount > 0 ? `(+ ${metrics.backPanelCount} arkalık)` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--textMuted)" }}>18mm MDF / Board Surface</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{metrics.surfaceArea18mm} m²</span>
                </div>
                {metrics.surfaceArea8mm > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                    <span style={{ color: "var(--textMuted)" }}>8mm Arkalık (Back) Surface</span>
                    <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{metrics.surfaceArea8mm} m²</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--textMuted)" }}>{metrics.sheetLabel}</span>
                  <span style={{ color: "#60a5fa", fontWeight: 700 }}>{metrics.stdSheets} sheets (15% kerf)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--textMuted)" }}>Calculated Net Weight</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{metrics.estimatedWeight} kg</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 8: ACTIONS (SAVE & 3D EXPORTS) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={styles.saveBtn}
          >
            {saving ? (
              <span>SAVING PROJECT...</span>
            ) : saveSuccess ? (
              <>
                <MdCheck size={18} />
                <span>SAVED TO PROJECT!</span>
              </>
            ) : (
              <>
                <MdSave size={18} />
                <span>SAVE TO PROJECT</span>
              </>
            )}
          </button>

          <div className={styles.exportGroup}>
            <span style={{ fontSize: "0.75rem", color: "var(--textMuted)", fontWeight: 600 }}>
              EXPORT 3D ASSETS
            </span>
            <div className={styles.exportButtons}>
              <button
                type="button"
                onClick={() => onExport("obj")}
                className={styles.exportBtn}
              >
                <MdDownload size={13} />
                <span>.OBJ</span>
              </button>
              <button
                type="button"
                onClick={() => onExport("gltf")}
                className={styles.exportBtn}
              >
                <MdDownload size={13} />
                <span>.GLTF</span>
              </button>
              <button
                type="button"
                onClick={() => onExport("stl")}
                className={styles.exportBtn}
              >
                <MdDownload size={13} />
                <span>.STL</span>
              </button>
            </div>
          </div>
        </div>
        </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "0.2rem 0" }}>
            {/* Card 1: Title Block & Drawing Legend (Bottom Legend Editor) */}
            <div className={styles.drawingPanelSection}>
              <h3 className={styles.drawingPanelTitle}>
                <MdEditNote size={16} />
                Title Block & Legend Editor
              </h3>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Drawing / Sheet Title</label>
                <input
                  type="text"
                  className={styles.drawingTextInput}
                  value={params.drawingSettings?.drawingTitle ?? params.name ?? "Technical Drawing"}
                  onChange={(e) => updateDrawingParam("drawingTitle", e.target.value)}
                  placeholder="e.g. Kitchen Cabinet Suite - Elevations & Sections"
                />
              </div>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Client / Studio Name</label>
                <input
                  type="text"
                  className={styles.drawingTextInput}
                  value={params.drawingSettings?.clientName ?? "Cadance Studio"}
                  onChange={(e) => updateDrawingParam("clientName", e.target.value)}
                  placeholder="e.g. Cadance Studio"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div className={styles.drawingInputRow}>
                  <label className={styles.drawingInputLabel}>Drawing Code / No</label>
                  <input
                    type="text"
                    className={styles.drawingTextInput}
                    value={params.drawingSettings?.drawingNumber ?? "DWG-101"}
                    onChange={(e) => updateDrawingParam("drawingNumber", e.target.value)}
                    placeholder="e.g. DWG-101"
                  />
                </div>
                <div className={styles.drawingInputRow}>
                  <label className={styles.drawingInputLabel}>Revision</label>
                  <input
                    type="text"
                    className={styles.drawingTextInput}
                    value={params.drawingSettings?.revision ?? "Rev 01"}
                    onChange={(e) => updateDrawingParam("revision", e.target.value)}
                    placeholder="e.g. Rev 01"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div className={styles.drawingInputRow}>
                  <label className={styles.drawingInputLabel}>Draughtsperson</label>
                  <input
                    type="text"
                    className={styles.drawingTextInput}
                    value={params.drawingSettings?.designer ?? "Studio Engineer"}
                    onChange={(e) => updateDrawingParam("designer", e.target.value)}
                    placeholder="e.g. Lead Joinery Designer"
                  />
                </div>
                <div className={styles.drawingInputRow}>
                  <label className={styles.drawingInputLabel}>Drawing Status</label>
                  <select
                    className={styles.drawingSelect}
                    value={params.drawingSettings?.status ?? "FOR FABRICATION"}
                    onChange={(e) => updateDrawingParam("status", e.target.value)}
                  >
                    <option value="FOR FABRICATION">FOR FABRICATION</option>
                    <option value="PRELIMINARY / CONCEPT">PRELIMINARY / CONCEPT</option>
                    <option value="FOR CLIENT APPROVAL">FOR CLIENT APPROVAL</option>
                    <option value="TENDER / BID">TENDER / BID</option>
                    <option value="AS-BUILT">AS-BUILT</option>
                  </select>
                </div>
              </div>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>
                  Fabrication Notes & Material Legend
                </label>
                <textarea
                  className={styles.drawingTextArea}
                  value={
                    params.drawingSettings?.notes ??
                    getDefaultFabricationNotes(params.boardThickness, params.drawingSettings?.unit ?? "mm")
                  }
                  onChange={(e) => updateDrawingParam("notes", e.target.value)}
                  placeholder="Enter custom joinery notes, hardware specs, or legend remarks..."
                />
              </div>
            </div>

            {/* Card 2: 3D Isometric View Angle & Orientation Controls */}
            <div className={styles.drawingPanelSection}>
              <h3 className={styles.drawingPanelTitle}>
                <Md3dRotation size={16} />
                Isometric Projection Angle
              </h3>
              <span style={{ fontSize: "0.71rem", color: "#94a3b8" }}>
                Rotate the 3D isometric view if your furniture model is facing away.
              </span>

              {/* Quick Quadrant Presets */}
              <div className={styles.isoAnglePresetRow}>
                {[
                  { label: "Front-R", angle: 45 },
                  { label: "Front-L", angle: 135 },
                  { label: "Back-L", angle: 225 },
                  { label: "Back-R", angle: 315 },
                ].map((p) => (
                  <button
                    key={p.angle}
                    type="button"
                    onClick={() => updateDrawingParam("isoAngle", p.angle)}
                    className={`${styles.isoAnglePresetBtn} ${
                      (params.drawingSettings?.isoAngle ?? 45) === p.angle
                        ? styles.isoAnglePresetBtnActive
                        : ""
                    }`}
                    title={`${p.label} View (${p.angle}°)`}
                  >
                    <span>{p.label}</span>
                    <span style={{ fontSize: "9px", opacity: 0.8 }}>{p.angle}°</span>
                  </button>
                ))}
              </div>

              {/* Quick 180° Flip Button */}
              <button
                type="button"
                onClick={() => {
                  const cur = params.drawingSettings?.isoAngle ?? 45;
                  updateDrawingParam("isoAngle", (cur + 180) % 360);
                }}
                className={styles.flipAngleBtn}
                title="Flip Isometric View by 180°"
              >
                <MdScreenRotation size={15} />
                <span>🔄 Flip Facing Direction (+180°)</span>
              </button>

              {/* Continuous Rotation Slider */}
              <div className={styles.isoSliderContainer}>
                <div className={styles.drawingInputLabel}>
                  <span>Azimuth Angle (Rotation)</span>
                  <span className={styles.isoDegreeBadge}>
                    {params.drawingSettings?.isoAngle ?? 45}°
                  </span>
                </div>
                <div className={styles.isoSliderRow}>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={params.drawingSettings?.isoAngle ?? 45}
                    onChange={(e) => updateDrawingParam("isoAngle", Number(e.target.value))}
                    className={styles.isoRangeInput}
                  />
                </div>
              </div>

              {/* Elevation Angle Slider */}
              <div className={styles.isoSliderContainer}>
                <div className={styles.drawingInputLabel}>
                  <span>Camera Elevation Angle</span>
                  <span className={styles.isoDegreeBadge}>
                    {params.drawingSettings?.isoElevation ?? 30}°
                  </span>
                </div>
                <div className={styles.isoSliderRow}>
                  <input
                    type="range"
                    min={15}
                    max={45}
                    step={5}
                    value={params.drawingSettings?.isoElevation ?? 30}
                    onChange={(e) => updateDrawingParam("isoElevation", Number(e.target.value))}
                    className={styles.isoRangeInput}
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Sheet Layout & Drawing Scale */}
            <div className={styles.drawingPanelSection}>
              <h3 className={styles.drawingPanelTitle}>
                <MdGridGoldenratio size={16} />
                Sheet Setup & Scale
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div className={styles.drawingInputRow}>
                  <label className={styles.drawingInputLabel}>Page Size</label>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => updateDrawingParam("pageSize", "A3")}
                      className={`${styles.isoAnglePresetBtn} ${
                        (params.drawingSettings?.pageSize ?? "A3") === "A3"
                          ? styles.isoAnglePresetBtnActive
                          : ""
                      }`}
                      style={{ flex: 1, padding: "0.4rem 0" }}
                    >
                      A3 (420x297)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDrawingParam("pageSize", "A4")}
                      className={`${styles.isoAnglePresetBtn} ${
                        params.drawingSettings?.pageSize === "A4"
                          ? styles.isoAnglePresetBtnActive
                          : ""
                      }`}
                      style={{ flex: 1, padding: "0.4rem 0" }}
                    >
                      A4 (297x210)
                    </button>
                  </div>
                </div>

                <div className={styles.drawingInputRow}>
                  <label className={styles.drawingInputLabel}>Orientation</label>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => updateDrawingParam("orientation", "landscape")}
                      className={`${styles.isoAnglePresetBtn} ${
                        (params.drawingSettings?.orientation ?? "landscape") === "landscape"
                          ? styles.isoAnglePresetBtnActive
                          : ""
                      }`}
                      style={{ flex: 1, padding: "0.4rem 0" }}
                    >
                      Landscape
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDrawingParam("orientation", "portrait")}
                      className={`${styles.isoAnglePresetBtn} ${
                        params.drawingSettings?.orientation === "portrait"
                          ? styles.isoAnglePresetBtnActive
                          : ""
                      }`}
                      style={{ flex: 1, padding: "0.4rem 0" }}
                    >
                      Portrait
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Drawing Scale</label>
                <select
                  className={styles.drawingSelect}
                  value={params.drawingSettings?.scaleMode ?? "auto"}
                  onChange={(e) =>
                    updateDrawingParam(
                      "scaleMode",
                      e.target.value as TechnicalDrawingSettings["scaleMode"]
                    )
                  }
                >
                  <option value="auto">Auto Fit to Sheet</option>
                  <option value="1:10">1:10 (Detailed)</option>
                  <option value="1:15">1:15</option>
                  <option value="1:20">1:20 (Standard Architectural)</option>
                  <option value="1:25">1:25</option>
                  <option value="1:50">1:50 (Overview)</option>
                  <option value="custom">Custom Scale Multiplier</option>
                </select>
              </div>

              {params.drawingSettings?.scaleMode === "custom" && (
                <div className={styles.isoSliderContainer}>
                  <div className={styles.drawingInputLabel}>
                    <span>Custom Scale Multiplier</span>
                    <span className={styles.isoDegreeBadge}>
                      {(params.drawingSettings?.customScale ?? 0.1).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.02}
                    max={0.35}
                    step={0.01}
                    value={params.drawingSettings?.customScale ?? 0.1}
                    onChange={(e) => updateDrawingParam("customScale", Number(e.target.value))}
                    className={styles.isoRangeInput}
                  />
                </div>
              )}

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Dimension Units</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => updateDrawingParam("unit", "mm")}
                    className={`${styles.isoAnglePresetBtn} ${
                      (params.drawingSettings?.unit ?? "mm") === "mm"
                        ? styles.isoAnglePresetBtnActive
                        : ""
                    }`}
                    style={{ flex: 1, padding: "0.45rem 0", fontWeight: 700 }}
                  >
                    Millimeters (mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDrawingParam("unit", "cm")}
                    className={`${styles.isoAnglePresetBtn} ${
                      params.drawingSettings?.unit === "cm"
                        ? styles.isoAnglePresetBtnActive
                        : ""
                    }`}
                    style={{ flex: 1, padding: "0.45rem 0", fontWeight: 700 }}
                  >
                    Centimeters (cm)
                  </button>
                </div>
              </div>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Dimensions Visibility</label>
                <button
                  type="button"
                  onClick={() =>
                    updateDrawingParam(
                      "showDimensions",
                      params.drawingSettings?.showDimensions === false ? true : false
                    )
                  }
                  className={`${styles.isoAnglePresetBtn} ${
                    params.drawingSettings?.showDimensions !== false
                      ? styles.isoAnglePresetBtnActive
                      : ""
                  }`}
                  style={{ padding: "0.45rem", width: "100%" }}
                >
                  {params.drawingSettings?.showDimensions !== false
                    ? "📐 Dimensions: Visible (ON)"
                    : "📐 Dimensions: Hidden (OFF)"}
                </button>
              </div>
            </div>

            {/* Card: Custom View Titles / Drawing Names */}
            <div className={styles.drawingPanelSection}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "0.45rem" }}>
                <h3 className={styles.drawingPanelTitle} style={{ borderBottom: "none", paddingBottom: 0 }}>
                  <MdEditNote size={16} />
                  Drawing Names & View Titles
                </h3>
                <button
                  type="button"
                  onClick={() => updateDrawingParam("viewTitles", undefined)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#60a5fa",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  title="Reset to default standard titles"
                >
                  Reset Defaults
                </button>
              </div>
              <span style={{ fontSize: "0.71rem", color: "#94a3b8" }}>
                Customize the names that appear on the sheet above each viewport.
              </span>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Plan (Top View) Title</label>
                <input
                  type="text"
                  className={styles.drawingTextInput}
                  value={params.drawingSettings?.viewTitles?.top ?? "Plan (Top View)"}
                  onChange={(e) =>
                    updateDrawingParam("viewTitles", {
                      ...(params.drawingSettings?.viewTitles || {}),
                      top: e.target.value,
                    })
                  }
                  placeholder="e.g. Plan (Top View)"
                />
              </div>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Front Elevation Title</label>
                <input
                  type="text"
                  className={styles.drawingTextInput}
                  value={params.drawingSettings?.viewTitles?.front ?? "Front Elevation"}
                  onChange={(e) =>
                    updateDrawingParam("viewTitles", {
                      ...(params.drawingSettings?.viewTitles || {}),
                      front: e.target.value,
                    })
                  }
                  placeholder="e.g. Front Elevation"
                />
              </div>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>Side Elevation Title</label>
                <input
                  type="text"
                  className={styles.drawingTextInput}
                  value={params.drawingSettings?.viewTitles?.side ?? "Side Elevation"}
                  onChange={(e) =>
                    updateDrawingParam("viewTitles", {
                      ...(params.drawingSettings?.viewTitles || {}),
                      side: e.target.value,
                    })
                  }
                  placeholder="e.g. Side Elevation"
                />
              </div>

              <div className={styles.drawingInputRow}>
                <label className={styles.drawingInputLabel}>3D Isometric View Title</label>
                <input
                  type="text"
                  className={styles.drawingTextInput}
                  value={params.drawingSettings?.viewTitles?.iso ?? `3D Isometric Projection (${params.drawingSettings?.isoAngle ?? 45}°)`}
                  onChange={(e) =>
                    updateDrawingParam("viewTitles", {
                      ...(params.drawingSettings?.viewTitles || {}),
                      iso: e.target.value,
                    })
                  }
                  placeholder="e.g. 3D Isometric Projection"
                />
              </div>
            </div>

            {/* Card 4: Quick Dimensions (W x H x D) - accessible directly in 2D tab */}
            <div className={styles.drawingPanelSection}>
              <h3 className={styles.drawingPanelTitle}>
                <MdStraighten size={16} />
                Quick Furniture Dimensions (mm)
              </h3>
              <span style={{ fontSize: "0.71rem", color: "#94a3b8" }}>
                Changes to dimensions reflect live on the 2D technical drawings.
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
                <div>
                  <label className={styles.drawingInputLabel}>Width (W)</label>
                  <CadNumberInput
                    value={params.width}
                    onChange={(v) => updateParam("width", Math.max(200, v))}
                    min={200}
                    max={4000}
                    step={10}
                    unit="mm"
                  />
                </div>
                <div>
                  <label className={styles.drawingInputLabel}>Height (H)</label>
                  <CadNumberInput
                    value={params.height}
                    onChange={(v) => updateParam("height", Math.max(200, v))}
                    min={200}
                    max={3000}
                    step={10}
                    unit="mm"
                  />
                </div>
                <div>
                  <label className={styles.drawingInputLabel}>Depth (D)</label>
                  <CadNumberInput
                    value={params.depth}
                    onChange={(v) => updateParam("depth", Math.max(150, v))}
                    min={150}
                    max={2000}
                    step={10}
                    unit="mm"
                  />
                </div>
              </div>
            </div>

            {/* Save to Project Button */}
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className={`${styles.saveBtn} ${saveSuccess ? styles.saveBtnSuccess : ""}`}
              style={{ marginTop: "0.5rem" }}
            >
              {saving ? (
                <>
                  <div className={styles.spinner} />
                  <span>SAVING CHANGES...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <MdCheck size={18} />
                  <span>CHANGES SAVED!</span>
                </>
              ) : (
                <>
                  <MdSave size={18} />
                  <span>SAVE DRAWING & PARAMS</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
