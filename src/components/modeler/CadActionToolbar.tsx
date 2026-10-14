"use client";

import React from "react";
import { FurnitureParams, KitchenCabinetUnit, WardrobeUnit } from "./FurnitureMesh";
import {
  MdNearMe,
  MdHighlightAlt,
  MdTurnRight,
  MdOutlineViewWeek,
  MdAddBox,
  MdVerticalAlignTop,
  MdVerticalSplit,
  MdHorizontalSplit,
  MdLayers,
  MdDoorSliding,
  MdMeetingRoom,
  MdDeleteOutline,
  MdViewAgenda,
  MdSwapHoriz,
  MdSwapVert,
} from "react-icons/md";
import styles from "./modeler.module.css";

interface CadActionToolbarProps {
  params: FurnitureParams;
  setParams: React.Dispatch<React.SetStateAction<FurnitureParams>>;
}

export default function CadActionToolbar({ params, setParams }: CadActionToolbarProps) {
  const { category } = params;
  const activeTool = params.activeTool || "select";
  const selectedDivision = params.selectedDivision;

  const setTool = (tool: "select" | "select-division" | "box-select" | "add-base" | "add-v-division" | "add-h-division") => {
    setParams((prev) => ({
      ...prev,
      activeTool: prev.activeTool === tool ? "select" : tool,
    }));
  };

  const deleteSelectedDivision = () => {
    if (params.onRemoveDivision && selectedDivision) {
      params.onRemoveDivision(selectedDivision);
    } else if (category === "Shelf" && selectedDivision) {
      if (selectedDivision.type === "partition") {
        setParams((prev) => ({
          ...prev,
          internalColumns: Math.max(1, (prev.internalColumns || 2) - 1),
          selectedDivision: null,
        }));
      } else {
        setParams((prev) => ({
          ...prev,
          internalShelves: Math.max(0, (prev.internalShelves ?? 3) - 1),
          selectedDivision: null,
        }));
      }
    }
  };

  // Helper Hint text based on current active tool
  const getHelperHint = () => {
    switch (activeTool) {
      case "box-select":
        return "🔲 Box Select: Drag a marquee on 3D canvas to batch-select cabinets";
      case "select-division":
        return "📐 Select Division: Click any shelf, divider, or partition in 3D to move or delete";
      case "add-base":
        return "➕ Add Unit: Click then hover near existing carcass sides to snap";
      case "add-v-division":
        return "➗ Vertical Division: Click on carcass to place a vertical divider";
      case "add-h-division":
        return "📚 Shelf: Click on carcass to place a horizontal shelf";
      default:
        return null;
    }
  };

  // =========================================================================
  // 1. KITCHEN CABINET TOOLBAR
  // =========================================================================
  if (category === "Cabinet") {
    const kitchenUnits = params.kitchenUnits || [];
    const selectedUnit = kitchenUnits.find((u) => u.id === params.selectedUnitId) || kitchenUnits[0];

    const addCornerCabinet = () => {
      const cornerCount = kitchenUnits.filter((u) => u.type === "corner-base").length;
      const newCorner: KitchenCabinetUnit = {
        id: `corner-${Date.now()}`,
        name: `Corner Base ${cornerCount + 1} (90°)`,
        type: "corner-base",
        orientation: "corner-right",
        width: 900,
        height: 720,
        depth: 900,
        doorType: "cornerDouble",
        drawerCount: 0,
        internalShelves: 1,
        handleType: selectedUnit?.handleType || "bar",
        handleFinish: selectedUnit?.handleFinish || "black",
      };
      setParams((prev) => ({
        ...prev,
        kitchenUnits: [...(prev.kitchenUnits || []), newCorner],
        selectedUnitId: newCorner.id,
        selectedUnitIds: [newCorner.id],
      }));
    };

    const addWallCabinet = () => {
      const wallCount = kitchenUnits.filter((u) => u.type === "wall").length;
      const baseRef = selectedUnit?.type === "base" ? selectedUnit : kitchenUnits.find((u) => u.type === "base");
      const newUnit: KitchenCabinetUnit = {
        id: `wall-${Date.now()}`,
        name: `Wall Cabinet ${wallCount + 1}`,
        type: "wall",
        width: baseRef ? baseRef.width : 600,
        height: 600,
        depth: 350,
        doorType: "double",
        drawerCount: 0,
        internalShelves: 2,
        handleType: baseRef?.handleType || "bar",
        handleFinish: baseRef?.handleFinish || "black",
      };
      setParams((prev) => ({
        ...prev,
        kitchenUnits: [...(prev.kitchenUnits || []), newUnit],
        selectedUnitId: newUnit.id,
        selectedUnitIds: [newUnit.id],
      }));
    };

    const toggleDoors = () => {
      setParams((prev) => ({
        ...prev,
        doorOpenPercent: (prev.doorOpenPercent || 0) > 0 ? 0 : 85,
      }));
    };

    const deleteSelected = () => {
      if (kitchenUnits.length <= 1 || !selectedUnit) return;
      const targetIds = params.selectedUnitIds || [selectedUnit.id];
      const filtered = kitchenUnits.filter((u) => !targetIds.includes(u.id));
      const remaining = filtered.length > 0 ? filtered : [kitchenUnits[0]];
      setParams((prev) => ({
        ...prev,
        kitchenUnits: remaining,
        selectedUnitId: remaining[0]?.id,
        selectedUnitIds: [remaining[0]?.id],
      }));
    };

    return (
      <div className={styles.cadActionToolbar}>
        <div className={styles.cadActionLabel}>
          <span>Kitchen CAD</span>
          <span style={{ fontSize: "10px", color: "#60a5fa" }}>{kitchenUnits.length} Units</span>
        </div>

        {/* Selection Tools */}
        <button
          type="button"
          onClick={() => setTool("select")}
          className={`${styles.cadActionBtn} ${activeTool === "select" ? styles.cadActionBtnActive : ""}`}
          title="Select Unit"
        >
          <MdNearMe size={15} color={activeTool === "select" ? "#60a5fa" : "#94a3b8"} />
          <span>Select Unit</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("box-select")}
          className={`${styles.cadActionBtn} ${activeTool === "box-select" ? styles.cadActionBtnActive : ""}`}
          title="Box Select (Marquee)"
        >
          <MdHighlightAlt size={15} color={activeTool === "box-select" ? "#38bdf8" : "#94a3b8"} />
          <span>Box Select</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("select-division")}
          className={`${styles.cadActionBtn} ${activeTool === "select-division" ? styles.cadActionBtnActive : ""}`}
          title="Select Division"
        >
          <MdOutlineViewWeek size={15} color={activeTool === "select-division" ? "#f59e0b" : "#94a3b8"} />
          <span>Select Division</span>
        </button>

        <div className={styles.cadActionDivider} />

        {/* Unit Creation Tools */}
        <button
          type="button"
          onClick={() => setTool("add-base")}
          className={`${styles.cadActionBtn} ${activeTool === "add-base" ? styles.cadActionBtnActive : ""}`}
          title="Add Adjacent Base: Snap to left/right side"
        >
          <MdAddBox size={15} color="#38bdf8" />
          <span>+ Add Base</span>
        </button>

        <button
          type="button"
          onClick={addCornerCabinet}
          className={styles.cadActionBtn}
          title="Add 90° Corner Base to turn kitchen run"
        >
          <MdTurnRight size={16} color="#38bdf8" />
          <span>+ Corner (90°)</span>
        </button>

        <button
          type="button"
          onClick={addWallCabinet}
          className={styles.cadActionBtn}
          title="Add Upper Wall Cabinet"
        >
          <MdVerticalAlignTop size={15} color="#93c5fd" />
          <span>+ Wall Unit</span>
        </button>

        <div className={styles.cadActionDivider} />

        {/* 3D Action Tools */}
        <button
          type="button"
          onClick={toggleDoors}
          className={styles.cadActionBtn}
          title="Toggle 3D Doors Open / Closed"
        >
          <MdMeetingRoom size={15} color="#cbd5e1" />
          <span>{(params.doorOpenPercent || 0) > 0 ? "Close Doors" : "Open Doors"}</span>
        </button>

        {kitchenUnits.length > 1 && (
          <button
            type="button"
            onClick={deleteSelected}
            className={styles.cadActionBtn}
            style={{ color: "#f87171" }}
            title="Delete Selected Unit"
          >
            <MdDeleteOutline size={15} color="#f87171" />
            <span>Delete Unit</span>
          </button>
        )}

        {/* Selected Division Action */}
        {selectedDivision && (
          <button
            type="button"
            onClick={deleteSelectedDivision}
            className={styles.cadActionBtn}
            style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)" }}
            title="Delete Selected Division"
          >
            <MdDeleteOutline size={15} color="#f59e0b" />
            <span>Delete Shelf</span>
          </button>
        )}

        {/* Tooltip helper */}
        {getHelperHint() && (
          <div className={styles.cadActionHelperHint}>
            {getHelperHint()}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. WARDROBE TOOLBAR
  // =========================================================================
  if (category === "Wardrobe") {
    const wardrobeUnits = params.wardrobeUnits || [];
    const selectedUnit = wardrobeUnits.find((u) => u.id === params.selectedWardrobeUnitId) || wardrobeUnits[0];

    const addTopBridge = () => {
      const topCount = wardrobeUnits.filter((u) => u.type === "top").length;
      const mainRef = selectedUnit?.type === "main" ? selectedUnit : wardrobeUnits.find((u) => u.type === "main");
      const newTop: WardrobeUnit = {
        id: `wardrobe-top-${Date.now()}`,
        name: `Top Bridge ${topCount + 1}`,
        type: "top",
        width: mainRef ? mainRef.width : 900,
        height: 450,
        depth: mainRef ? mainRef.depth : 600,
        doorType: "hingedDouble",
        doorOpenPercent: 0,
        hasMirror: false,
        internalShelves: 1,
        drawerCount: 0,
        handleType: mainRef?.handleType || "edgePull",
        handleFinish: mainRef?.handleFinish || "black",
      };
      setParams((prev) => ({
        ...prev,
        wardrobeUnits: [...(prev.wardrobeUnits || []), newTop],
        selectedWardrobeUnitId: newTop.id,
      }));
    };

    const toggleDoors = () => {
      if (!selectedUnit) return;
      const cur = selectedUnit.doorOpenPercent || 0;
      const next = cur > 0 ? 0 : 80;
      const updated = wardrobeUnits.map((u) =>
        u.id === selectedUnit.id ? { ...u, doorOpenPercent: next } : u
      );
      setParams((prev) => ({ ...prev, wardrobeUnits: updated }));
    };

    const deleteSelected = () => {
      if (wardrobeUnits.length <= 1 || !selectedUnit) return;
      const filtered = wardrobeUnits.filter((u) => u.id !== selectedUnit.id);
      setParams((prev) => ({
        ...prev,
        wardrobeUnits: filtered,
        selectedWardrobeUnitId: filtered[0]?.id,
      }));
    };

    return (
      <div className={styles.cadActionToolbar}>
        <div className={styles.cadActionLabel}>
          <span>Wardrobe CAD</span>
          <span style={{ fontSize: "10px", color: "#60a5fa" }}>{wardrobeUnits.length} Bays</span>
        </div>

        <button
          type="button"
          onClick={() => setTool("select")}
          className={`${styles.cadActionBtn} ${activeTool === "select" ? styles.cadActionBtnActive : ""}`}
          title="Select Section"
        >
          <MdNearMe size={15} color={activeTool === "select" ? "#60a5fa" : "#94a3b8"} />
          <span>Select Unit</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("box-select")}
          className={`${styles.cadActionBtn} ${activeTool === "box-select" ? styles.cadActionBtnActive : ""}`}
          title="Box Select"
        >
          <MdHighlightAlt size={15} color={activeTool === "box-select" ? "#38bdf8" : "#94a3b8"} />
          <span>Box Select</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("select-division")}
          className={`${styles.cadActionBtn} ${activeTool === "select-division" ? styles.cadActionBtnActive : ""}`}
          title="Select Division"
        >
          <MdOutlineViewWeek size={15} color={activeTool === "select-division" ? "#f59e0b" : "#94a3b8"} />
          <span>Select Division</span>
        </button>

        <div className={styles.cadActionDivider} />

        <button
          type="button"
          onClick={() => setTool("add-base")}
          className={`${styles.cadActionBtn} ${activeTool === "add-base" ? styles.cadActionBtnActive : ""}`}
          title="Add Section: Snap to side"
        >
          <MdAddBox size={15} color="#38bdf8" />
          <span>+ Add Section</span>
        </button>

        <button
          type="button"
          onClick={addTopBridge}
          className={styles.cadActionBtn}
          title="Add Top Storage Unit"
        >
          <MdVerticalAlignTop size={15} color="#93c5fd" />
          <span>+ Top Unit</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("add-v-division")}
          className={`${styles.cadActionBtn} ${activeTool === "add-v-division" ? styles.cadActionBtnActive : ""}`}
          title="Add Center Vertical Partition"
        >
          <MdVerticalSplit size={15} color={activeTool === "add-v-division" ? "#60a5fa" : "#cbd5e1"} />
          <span>+ Partition</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("add-h-division")}
          className={`${styles.cadActionBtn} ${activeTool === "add-h-division" ? styles.cadActionBtnActive : ""}`}
          title="Add Shelf Tier"
        >
          <MdHorizontalSplit size={15} color={activeTool === "add-h-division" ? "#34d399" : "#cbd5e1"} />
          <span>+ Shelf</span>
        </button>

        <div className={styles.cadActionDivider} />

        <button
          type="button"
          onClick={toggleDoors}
          className={styles.cadActionBtn}
          title="Toggle Doors"
        >
          <MdDoorSliding size={15} color="#cbd5e1" />
          <span>{(selectedUnit?.doorOpenPercent || 0) > 0 ? "Close Doors" : "Open Doors"}</span>
        </button>

        {wardrobeUnits.length > 1 && (
          <button
            type="button"
            onClick={deleteSelected}
            className={styles.cadActionBtn}
            style={{ color: "#f87171" }}
            title="Delete Selected Section"
          >
            <MdDeleteOutline size={15} color="#f87171" />
            <span>Delete Section</span>
          </button>
        )}

        {selectedDivision && (
          <button
            type="button"
            onClick={deleteSelectedDivision}
            className={styles.cadActionBtn}
            style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)" }}
            title="Delete Selected Division"
          >
            <MdDeleteOutline size={15} color="#f59e0b" />
            <span>Delete Division</span>
          </button>
        )}

        {getHelperHint() && (
          <div className={styles.cadActionHelperHint}>
            {getHelperHint()}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. SHELF TOOLBAR
  // =========================================================================
  if (category === "Shelf") {
    const cols = params.internalColumns || 1;
    const shelves = params.internalShelves ?? 3;

    return (
      <div className={styles.cadActionToolbar}>
        <div className={styles.cadActionLabel}>
          <span>Shelf CAD</span>
          <span style={{ fontSize: "10px", color: "#60a5fa" }}>{cols}×{shelves}</span>
        </div>

        <button
          type="button"
          onClick={() => setTool("select")}
          className={`${styles.cadActionBtn} ${activeTool === "select" ? styles.cadActionBtnActive : ""}`}
          title="Select Object"
        >
          <MdNearMe size={15} color={activeTool === "select" ? "#60a5fa" : "#94a3b8"} />
          <span>Select Tool</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("select-division")}
          className={`${styles.cadActionBtn} ${activeTool === "select-division" ? styles.cadActionBtnActive : ""}`}
          title="Select Division: Click dividers or shelves to move or remove them"
        >
          <MdOutlineViewWeek size={15} color={activeTool === "select-division" ? "#f59e0b" : "#94a3b8"} />
          <span>Select Division</span>
        </button>

        <div className={styles.cadActionDivider} />

        {/* Add Vertical Divider Column */}
        <button
          type="button"
          onClick={() => {
            const next = Math.min(5, cols + 1);
            setParams((prev) => ({ ...prev, internalColumns: next }));
          }}
          className={styles.cadActionBtn}
          title="Add Vertical Divider Column"
        >
          <MdVerticalSplit size={15} color="#38bdf8" />
          <span>+ Divider ({cols})</span>
        </button>

        {/* Add Horizontal Shelf Tier */}
        <button
          type="button"
          onClick={() => {
            const next = Math.min(6, shelves + 1);
            setParams((prev) => ({ ...prev, internalShelves: next }));
          }}
          className={styles.cadActionBtn}
          title="Add Horizontal Shelf Tier"
        >
          <MdHorizontalSplit size={15} color="#34d399" />
          <span>+ Shelf ({shelves})</span>
        </button>

        {/* Back Panel Toggle */}
        <button
          type="button"
          onClick={() =>
            setParams((prev) => ({ ...prev, hasBackPanel: !prev.hasBackPanel }))
          }
          className={`${styles.cadActionBtn} ${params.hasBackPanel ? styles.cadActionBtnActive : ""}`}
          title="Toggle Back Panel"
        >
          <MdLayers size={15} color={params.hasBackPanel ? "#60a5fa" : "#cbd5e1"} />
          <span>Back Panel</span>
        </button>

        {/* If a division is selected: show Move & Delete controls */}
        {selectedDivision && (
          <>
            <div className={styles.cadActionDivider} />
            <div style={{ padding: "0.2rem 0.35rem" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#fbbf24", marginBottom: "4px" }}>
                {selectedDivision.type === "partition"
                  ? `DIVIDER ${(selectedDivision.index ?? 0) + 1}`
                  : `SHELF ${(selectedDivision.index ?? 0) + 1}`}
              </div>
              <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const idx = selectedDivision.index ?? 0;
                    if (selectedDivision.type === "partition") {
                      const cur = [...(params.shelfColumnOffsets || [])];
                      cur[idx] = (cur[idx] || 0) - 15;
                      setParams(p => ({ ...p, shelfColumnOffsets: cur }));
                    } else {
                      const cur = [...(params.shelfRowOffsets || [])];
                      cur[idx] = (cur[idx] || 0) - 15;
                      setParams(p => ({ ...p, shelfRowOffsets: cur }));
                    }
                  }}
                  className={styles.cadActionBtn}
                  style={{ flex: 1, padding: "3px 4px", justifyContent: "center", fontSize: "11px" }}
                  title="Move -15mm"
                >
                  {selectedDivision.type === "partition" ? <MdSwapHoriz size={14} /> : <MdSwapVert size={14} />} -15
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idx = selectedDivision.index ?? 0;
                    if (selectedDivision.type === "partition") {
                      const cur = [...(params.shelfColumnOffsets || [])];
                      cur[idx] = (cur[idx] || 0) + 15;
                      setParams(p => ({ ...p, shelfColumnOffsets: cur }));
                    } else {
                      const cur = [...(params.shelfRowOffsets || [])];
                      cur[idx] = (cur[idx] || 0) + 15;
                      setParams(p => ({ ...p, shelfRowOffsets: cur }));
                    }
                  }}
                  className={styles.cadActionBtn}
                  style={{ flex: 1, padding: "3px 4px", justifyContent: "center", fontSize: "11px" }}
                  title="Move +15mm"
                >
                  {selectedDivision.type === "partition" ? <MdSwapHoriz size={14} /> : <MdSwapVert size={14} />} +15
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "2px", margin: "4px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94a3b8" }}>
                  <span>Offset</span>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                    {(selectedDivision.type === "partition"
                      ? params.shelfColumnOffsets?.[selectedDivision.index ?? 0] ?? 0
                      : params.shelfRowOffsets?.[selectedDivision.index ?? 0] ?? 0)} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  step={5}
                  value={
                    selectedDivision.type === "partition"
                      ? params.shelfColumnOffsets?.[selectedDivision.index ?? 0] ?? 0
                      : params.shelfRowOffsets?.[selectedDivision.index ?? 0] ?? 0
                  }
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const idx = selectedDivision.index ?? 0;
                    if (selectedDivision.type === "partition") {
                      const cur = [...(params.shelfColumnOffsets || [])];
                      cur[idx] = val;
                      setParams(p => ({ ...p, shelfColumnOffsets: cur }));
                    } else {
                      const cur = [...(params.shelfRowOffsets || [])];
                      cur[idx] = val;
                      setParams(p => ({ ...p, shelfRowOffsets: cur }));
                    }
                  }}
                  className={styles.rangeSlider}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={deleteSelectedDivision}
              className={styles.cadActionBtn}
              style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)" }}
              title="Delete Selected Division"
            >
              <MdDeleteOutline size={15} color="#f59e0b" />
              <span>Delete Division</span>
            </button>
          </>
        )}

        {getHelperHint() && (
          <div className={styles.cadActionHelperHint}>
            {getHelperHint()}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 4. TABLE & DESK TOOLBAR
  // =========================================================================
  if (category === "Table" || category === "Desk") {
    const hasDrawers = Boolean(params.hasDrawers);
    const drawerOpen = (params.drawerOpenPercent || 0) > 0;

    const toggleDrawers = () => {
      setParams((prev) => ({
        ...prev,
        hasDrawers: !prev.hasDrawers,
        drawerCount: !prev.hasDrawers ? 1 : prev.drawerCount,
      }));
    };

    const toggleSlideDrawers = () => {
      setParams((prev) => ({
        ...prev,
        drawerOpenPercent: (prev.drawerOpenPercent || 0) > 0 ? 0 : 75,
      }));
    };

    const cycleLegs = () => {
      const legCycle: FurnitureParams["legType"][] = ["square", "round", "tapered", "trestle"];
      const curIdx = legCycle.indexOf(params.legType || "square");
      const nextLeg = legCycle[(curIdx + 1) % legCycle.length];
      setParams((prev) => ({ ...prev, legType: nextLeg }));
    };

    return (
      <div className={styles.cadActionToolbar}>
        <div className={styles.cadActionLabel}>
          <span>Table CAD</span>
          <span style={{ fontSize: "10px", color: "#60a5fa" }}>{params.legType || "square"}</span>
        </div>

        <button
          type="button"
          onClick={() => setTool("select")}
          className={`${styles.cadActionBtn} ${activeTool === "select" ? styles.cadActionBtnActive : ""}`}
          title="Select Object"
        >
          <MdNearMe size={15} color={activeTool === "select" ? "#60a5fa" : "#94a3b8"} />
          <span>Select Tool</span>
        </button>

        <button
          type="button"
          onClick={() => setTool("box-select")}
          className={`${styles.cadActionBtn} ${activeTool === "box-select" ? styles.cadActionBtnActive : ""}`}
          title="Box Select"
        >
          <MdHighlightAlt size={15} color={activeTool === "box-select" ? "#38bdf8" : "#94a3b8"} />
          <span>Box Select</span>
        </button>

        <div className={styles.cadActionDivider} />

        {/* Drawer Toggle */}
        <button
          type="button"
          onClick={toggleDrawers}
          className={`${styles.cadActionBtn} ${hasDrawers ? styles.cadActionBtnActive : ""}`}
          title="Enable/Disable Drawers"
        >
          <MdViewAgenda size={15} color={hasDrawers ? "#60a5fa" : "#cbd5e1"} />
          <span>{hasDrawers ? "Drawers (On)" : "Drawers (Off)"}</span>
        </button>

        {hasDrawers && (
          <button
            type="button"
            onClick={toggleSlideDrawers}
            className={styles.cadActionBtn}
            title="3D Slide Drawers In/Out"
          >
            <MdDoorSliding size={15} color="#34d399" />
            <span>{drawerOpen ? "Close Drawers" : "Slide Out"}</span>
          </button>
        )}

        {/* Leg Style Quick Cycle */}
        <button
          type="button"
          onClick={cycleLegs}
          className={styles.cadActionBtn}
          title={`Cycle Leg Type (Current: ${params.legType || "square"})`}
        >
          <MdLayers size={15} color="#38bdf8" />
          <span>Legs: {params.legType || "square"}</span>
        </button>

        {getHelperHint() && (
          <div className={styles.cadActionHelperHint}>
            {getHelperHint()}
          </div>
        )}
      </div>
    );
  }

  return null;
}
