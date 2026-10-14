"use client";

import React, { useState } from "react";
import { FurnitureParams, KitchenCabinetUnit } from "./FurnitureMesh";
import CadNumberInput from "./CadNumberInput";
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
} from "react-icons/md";
import styles from "./modeler.module.css";

interface ModelerControlsProps {
  params: FurnitureParams;
  setParams: React.Dispatch<React.SetStateAction<FurnitureParams>>;
  onSave: () => Promise<void>;
  onExport: (format: "obj" | "gltf" | "stl") => void;
  saving: boolean;
  saveSuccess?: boolean;
}

const CATEGORIES: FurnitureParams["category"][] = [
  "Table",
  "Shelf",
  "Cabinet",
  "Desk",
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
}: ModelerControlsProps) {
  // Collapsible Accordion Sections State
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    kitchenUnits: true,
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

  const updateSelectedUnit = (updates: Partial<KitchenCabinetUnit>) => {
    if (!selectedUnit) return;
    const newUnits = kitchenUnits.map((u) =>
      u.id === selectedUnit.id ? { ...u, ...updates } : u
    );
    setParams((prev) => ({
      ...prev,
      kitchenUnits: newUnits,
    }));
  };

  const addKitchenUnit = (type: "base" | "wall") => {
    const existingCount = kitchenUnits.filter((u) => u.type === type).length;
    const newUnit: KitchenCabinetUnit = {
      id: `${type}-${Date.now()}`,
      name: `${type === "base" ? "Base Cabinet" : "Upper Wall Unit"} ${existingCount + 1}`,
      type,
      width: 600,
      height: 720,
      depth: type === "base" ? 600 : 350,
      doorType: type === "base" ? "singleLeft" : "singleLeft",
      drawerCount: 0,
      internalShelves: 2,
      handleType: "bar",
      handleFinish: "black",
    };
    setParams((prev) => ({
      ...prev,
      kitchenUnits: [...(prev.kitchenUnits || []), newUnit],
      selectedUnitId: newUnit.id,
    }));
  };

  const deleteSelectedUnit = () => {
    if (kitchenUnits.length <= 1 || !selectedUnit) return;
    const filtered = kitchenUnits.filter((u) => u.id !== selectedUnit.id);
    setParams((prev) => ({
      ...prev,
      kitchenUnits: filtered,
      selectedUnitId: filtered[0].id,
    }));
  };

  const duplicateSelectedUnit = () => {
    if (!selectedUnit) return;
    const clone: KitchenCabinetUnit = {
      ...selectedUnit,
      id: `${selectedUnit.type}-${Date.now()}`,
      name: `${selectedUnit.name} (Copy)`,
    };
    setParams((prev) => ({
      ...prev,
      kitchenUnits: [...(prev.kitchenUnits || []), clone],
      selectedUnitId: clone.id,
    }));
  };

  // Optimization & Production Metrics Calculation
  let panelCount = 0;
  let areaM2 = 0;

  if (params.category === "Cabinet" && kitchenUnits.length > 0) {
    kitchenUnits.forEach((u) => {
      const uw = u.width / 1000;
      const uh = u.height / 1000;
      const ud = u.depth / 1000;
      const carcaseP = 4 + (params.hasBackPanel !== false ? 1 : 0);
      const shelfP = u.internalShelves;
      const doorP = u.doorType === "double" ? 2 : u.doorType !== "none" ? 1 : 0;
      const drawerP = (u.drawerCount || 0) * 5;
      panelCount += carcaseP + shelfP + doorP + drawerP;
      areaM2 += (uw * ud * 2 + uw * uh * (1 + doorP) + ud * uh * 2 + shelfP * (uw * ud)) * 1.08;
    });
  } else if (params.category === "Shelf") {
    const wM = params.width / 1000;
    const hM = params.height / 1000;
    const dM = params.depth / 1000;
    const cols = params.internalColumns || 1;
    const shelves = params.internalShelves || 2;
    panelCount = 4 + (cols - 1) + cols * shelves + (params.hasBackPanel ? 1 : 0);
    areaM2 = (wM * dM * 2 + dM * hM * (2 + cols - 1) + cols * shelves * ((wM / cols) * dM)) * 1.08;
  } else {
    // Table / Desk
    const wM = params.width / 1000;
    const hM = params.height / 1000;
    const dM = params.depth / 1000;
    const isPedestal = params.deskDrawerType === "pedestal" && params.hasDrawers;
    const legPanels = params.legType === "trestle" ? 8 : 4;
    const drawerP = params.hasDrawers ? (params.drawerCount || 1) * 5 : 0;
    const pedPanels = isPedestal ? 4 + (params.pedestalDrawerCount || 3) * 5 : 0;
    panelCount = 1 + legPanels + 4 + drawerP + pedPanels;
    areaM2 = (wM * dM * 2 + (wM + dM) * 0.12 * 2 + legPanels * (0.05 * hM * 4) + (isPedestal ? 0.9 : 0)) * 1.05;
  }

  const surfaceAreaStr = areaM2.toFixed(2);
  const stdSheets = Math.max(1, Math.ceil((areaM2 * 1.15) / 2.98));
  const density = params.materialType === "blackSteel" ? 7800 : params.materialType === "whiteStudio" ? 700 : 650;
  const estWeightStr = (areaM2 * ((params.boardThickness || 18) / 1000) * density).toFixed(1);

  return (
    <aside className={styles.sidebarControls}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>CAD Inspector</h2>
        <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600 }}>
          {params.category === "Cabinet" ? "KITCHEN STUDIO" : "PARAMETRIC 3D"}
        </span>
      </div>

      <div className={styles.sidebarContent}>
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

        {/* KITCHEN MULTI-CABINET SUITE MANAGER (When category is Cabinet) */}
        {params.category === "Cabinet" && (
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
                <span>Kitchen Cabinets ({kitchenUnits.length} Units)</span>
              </div>
              {openSections.kitchenUnits ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
            </button>

            {openSections.kitchenUnits && (
              <div className={styles.accordionBody}>
                {/* Unit Selector Chips */}
                <div className={styles.unitChipList}>
                  {kitchenUnits.map((u) => {
                    const isSelected = selectedUnit?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => updateParam("selectedUnitId", u.id)}
                        className={`${styles.unitChip} ${
                          isSelected ? styles.unitChipActive : ""
                        }`}
                      >
                        <span>{u.type === "base" ? "📦" : "⬆️"}</span>
                        <span>{u.name || (u.type === "base" ? "Base" : "Wall")}</span>
                        <span style={{ opacity: 0.7, fontSize: "0.7rem" }}>({u.width}mm)</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add Actions */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("base")}
                    className={styles.unitAddBtn}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Base Cabinet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addKitchenUnit("wall")}
                    className={styles.unitAddBtn}
                  >
                    <MdAdd size={14} />
                    <span>+ Add Wall Cabinet</span>
                  </button>
                </div>

                {/* Active Unit Action Bar */}
                {selectedUnit && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                    <button
                      type="button"
                      onClick={duplicateSelectedUnit}
                      className={styles.segmentedBtn}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                    >
                      <MdContentCopy size={13} />
                      <span>Duplicate Unit</span>
                    </button>
                    {kitchenUnits.length > 1 && (
                      <button
                        type="button"
                        onClick={deleteSelectedUnit}
                        className={styles.deleteUnitBtn}
                        style={{ margin: 0, padding: "0.45rem 0.65rem" }}
                        title="Delete selected cabinet unit"
                      >
                        <MdDeleteOutline size={15} />
                      </button>
                    )}
                  </div>
                )}
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
                  : "Dimensions (X, Y, Z)"}
              </span>
            </div>
            {openSections.dimensions ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
          </button>

          {openSections.dimensions && (
            <div className={styles.accordionBody}>
              {params.category === "Cabinet" && selectedUnit ? (
                <>
                  {/* Selected Kitchen Cabinet Dimensions */}
                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Width (X)</span>
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
                        max={1200}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={350}
                      max={1200}
                      step={10}
                      value={selectedUnit.height}
                      onChange={(e) => updateSelectedUnit({ height: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
                  </div>

                  <div className={styles.sliderCard}>
                    <div className={styles.sliderHead}>
                      <span className={styles.sliderName}>Depth (Z)</span>
                      <CadNumberInput
                        value={selectedUnit.depth}
                        onChange={(val) => updateSelectedUnit({ depth: val })}
                        min={250}
                        max={800}
                        unit="mm"
                      />
                    </div>
                    <input
                      type="range"
                      min={250}
                      max={800}
                      step={10}
                      value={selectedUnit.depth}
                      onChange={(e) => updateSelectedUnit({ depth: Number(e.target.value) })}
                      className={styles.rangeSlider}
                    />
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

              {/* Board Thickness */}
              <div className={styles.sliderCard}>
                <div className={styles.sliderHead}>
                  <span className={styles.sliderName}>Board Thickness</span>
                  <CadNumberInput
                    value={params.boardThickness || (params.category === "Table" || params.category === "Desk" ? 30 : 18)}
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
                  value={params.boardThickness || (params.category === "Table" || params.category === "Desk" ? 30 : 18)}
                  onChange={(e) => updateParam("boardThickness", Number(e.target.value))}
                  className={styles.rangeSlider}
                />
              </div>
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
              {params.category === "Cabinet" && (
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
                            (params.baseType || "plinth") === b.id ? styles.segmentedBtnActive : ""
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {params.baseType !== "floating" && (
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

                  {/* Office Vertical Pedestal Tower Option */}
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

                  {params.deskDrawerType === "pedestal" && (
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
                    : "Doors & Drawers"}
                </span>
              </div>
              {openSections.openings ? <MdExpandMore size={18} /> : <MdChevronRight size={18} />}
            </button>

            {openSections.openings && (
              <div className={styles.accordionBody}>
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
                            {Math.round(((params.doorOpenPercent || 0) * 90) / 100)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={params.doorOpenPercent || 0}
                          onChange={(e) => updateParam("doorOpenPercent", Number(e.target.value))}
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

                {/* Table / Desk Apron Drawers */}
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

                    {params.hasDrawers && params.deskDrawerType !== "pedestal" && (
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

        {/* SECTION 4: INNER DIVISIONS & SHELVING */}
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
                            (params.internalShelves || 3) === s ? styles.segmentedBtnActive : ""
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
                          (selectedUnit.internalShelves || 0) === s ? styles.segmentedBtnActive : ""
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
                  <div className={styles.segmentedGrid3}>
                    {[
                      { id: "bar", label: "Bar Pull" },
                      { id: "knob", label: "Knob" },
                      { id: "edgePull", label: "Edge Lip" },
                      { id: "cutout", label: "Cutout Slot" },
                      { id: "hidden", label: "Hidden / Push" },
                    ].map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          if (params.category === "Cabinet" && selectedUnit) {
                            updateSelectedUnit({ handleType: h.id as KitchenCabinetUnit["handleType"] });
                          } else {
                            updateParam("handleType", h.id as FurnitureParams["handleType"]);
                          }
                        }}
                        className={`${styles.segmentedBtn} ${
                          (params.category === "Cabinet" && selectedUnit
                            ? selectedUnit.handleType
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
                  <div className={styles.segmentedGrid3}>
                    {[
                      { id: "black", label: "Matte Black" },
                      { id: "steel", label: "Brushed Steel" },
                      { id: "brass", label: "Satin Brass" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (params.category === "Cabinet" && selectedUnit) {
                            updateSelectedUnit({ handleFinish: f.id as KitchenCabinetUnit["handleFinish"] });
                          } else {
                            updateParam("handleFinish", f.id as FurnitureParams["handleFinish"]);
                          }
                        }}
                        className={`${styles.segmentedBtn} ${
                          (params.category === "Cabinet" && selectedUnit
                            ? selectedUnit.handleFinish
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
              <div className={styles.materialGrid}>
                {MATERIALS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateParam("materialType", m.id)}
                    className={`${styles.materialOption} ${
                      params.materialType === m.id ? styles.materialOptionActive : ""
                    }`}
                  >
                    <span className={styles.colorSwatch} style={{ backgroundColor: m.color }} />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
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
                  <span style={{ color: "#fff", fontWeight: 700 }}>{panelCount} parts</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--textMuted)" }}>Total Board Surface</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{surfaceAreaStr} m²</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--textMuted)" }}>2440×1220mm Raw Sheets</span>
                  <span style={{ color: "#60a5fa", fontWeight: 700 }}>{stdSheets} sheets (15% kerf)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--textMuted)" }}>Calculated Net Weight</span>
                  <span style={{ color: "#fff", fontWeight: 700 }}>{estWeightStr} kg</span>
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
      </div>
    </aside>
  );
}
