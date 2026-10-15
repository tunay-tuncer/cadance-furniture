"use client";

import React, { useMemo, useState, useCallback } from "react";
import * as THREE from "three";
import { Edges, Html } from "@react-three/drei";

export interface SelectedDivision {
  unitId: string;
  type: "shelf" | "partition" | "drawer";
  index?: number;
  colIndex?: number;
}

export type MaterialPreset = "oak" | "walnut" | "plywood" | "blackSteel" | "whiteStudio";

export interface KitchenCabinetUnit {
  id: string;
  name: string;
  type: "base" | "wall" | "corner-base" | "corner-wall"; // base floor unit vs wall suspended unit vs 90° corner base vs 90° corner wall
  orientation?: "straight" | "corner-right" | "corner-left"; // orientation & turn direction
  runAxis?: "run0" | "run1"; // placement on Run 0 (Main Axis) vs Run 1 (Turned Axis)
  materialType?: MaterialPreset; // individual cabinet material override
  doorOpenPercent?: number; // individual door open state (0-100%)
  doorStyle?: "slab" | "slimShaker" | "shaker" | "fluted" | "framedGlass";
  hasBackPanel?: boolean;
  width: number;  // mm (e.g. 600 or 900 for corner)
  height: number; // mm (e.g. 720)
  depth: number;  // mm (e.g. 600 or 900 for corner, 350 for wall)
  cornerDepth?: number; // Carcass return depth for corner cabinets (arm depth, default: 600mm for base, 350mm for wall)
  bottomOffset?: number; // Distance from bottom cabinet / countertop clearance (default: 600mm)
  doorType: "none" | "singleLeft" | "singleRight" | "double" | "flipUp" | "cornerDouble";
  drawerCount: number; // 0, 1, 2, 3, 4
  drawerHeightsMode?: "equal" | "standard" | "custom";
  drawerHeights?: number[]; // mm for each drawer, e.g. [140, 280, 280]
  internalShelves: number;
  handleType: "bar" | "slimLine" | "halfMoon" | "knob" | "edgePull" | "cutout" | "hidden" | "cncJProfile";
  handleFinish: "black" | "steel" | "brass" | "bronze";
}

export interface WardrobeUnit {
  id: string;
  name: string;
  type: "main" | "top";
  materialType?: MaterialPreset; // main wardrobe bay vs top overhead unit
  width: number; // mm
  height: number; // mm
  depth: number; // mm

  // Doors & Mirrors
  doorType: "sliding" | "hingedSingle" | "hingedDouble" | "open";
  doorStyle?: "slab" | "slimShaker" | "shaker" | "fluted" | "framedGlass";
  doorOpenPercent?: number; // 0 to 100%
  hasMirror?: boolean;
  mirrorType?: "full" | "center" | "bronze" | "smoked";

  // Drawers
  hasDrawers?: boolean;
  drawerType?: "externalBottom" | "internal";
  drawerCount?: number;
  drawerHeight?: number;
  drawerOpenPercent?: number;

  // Interior organization
  hasClothesHangerRail?: boolean;
  internalShelves: number;
  hasInternalDivider?: boolean;
  partitionOffset?: number; // in mm, default 0, range -250 to +250
  partitionSpan?: "aboveDrawers" | "underTopShelf" | "fullCarcass"; // default "underTopShelf"
  hangerZone?: "left" | "right" | "full" | "none"; // default "left" when divider is true, "full" when false
  shelfOffsets?: number[]; // mm vertical offset per shelf
  slidingDoorActivePanel?: "left" | "right"; // default "right"

  // Handles & Hardware
  handleType?: "bar" | "slimLine" | "halfMoon" | "knob" | "edgePull" | "cutout" | "hidden" | "cncJProfile";
  handleFinish?: "black" | "steel" | "brass" | "bronze";
}

export interface TechnicalDrawingSettings {
  drawingTitle?: string;
  clientName?: string;
  designer?: string;
  drawingNumber?: string;
  revision?: string;
  status?: string;
  notes?: string;
  pageSize?: "A3" | "A4";
  orientation?: "landscape" | "portrait";
  scaleMode?: "auto" | "1:10" | "1:15" | "1:20" | "1:25" | "1:50" | "custom";
  customScale?: number;
  showDimensions?: boolean;
  isoAngle?: number; // degrees (0-360), default 45
  isoElevation?: number; // degrees (15-45), default 30
  unit?: "mm" | "cm"; // drawing dimension unit (default "mm")
  viewTitles?: {
    top?: string;
    front?: string;
    side?: string;
    iso?: string;
  };
}

export interface FurnitureParams {
  name: string;
  category: "Table" | "Shelf" | "Cabinet" | "Wardrobe" | "Desk" | "Custom";
  activeTool?: "select" | "select-division" | "box-select" | "add-base" | "add-wall" | "add-v-division" | "add-h-division";
  selectedUnitIds?: string[];
  onSelectUnits?: (ids: string[]) => void;
  width: number;  // mm (e.g. 1200)
  height: number; // mm (e.g. 750)
  depth: number;  // mm (e.g. 600)
  materialType: "oak" | "walnut" | "plywood" | "blackSteel" | "whiteStudio";
  showDimensions?: boolean;
  wireframe?: boolean;

  // 2D Technical Drawing Settings
  drawingSettings?: TechnicalDrawingSettings;

  // Board & Construction Specs
  boardThickness?: number; // mm (default 18mm)
  tableTopThickness?: number; // mm (for table/desk top board thickness, default 18mm)
  apronHeight?: number; // mm (height/width of apron rail, default 65mm)
  hasBackPanel?: boolean;  // solid back panel or open back
  topOverhang?: number;    // mm (tabletop overhang beyond apron, can be 0)

  // Base / Plinth / Leg Configuration
  baseType?: "plinth" | "legs" | "floating" | "trestle";
  plinthHeight?: number;   // mm (e.g. 80mm)
  plinthRecess?: number;   // mm (e.g. 40mm)
  legType?: "square" | "tapered" | "round" | "trestle";
  legThickness?: number;   // mm (e.g. 45mm)
  legInset?: number;       // mm (offset from edges)

  // Office Desk Vertical Pedestal Option
  deskDrawerType?: "apron" | "pedestal"; // horizontal under top vs vertical pedestal tower
  pedestalSide?: "left" | "right";
  pedestalWidth?: number; // mm (e.g. 400)
  pedestalDrawerCount?: number; // 2, 3, 4

  // Drawers
  hasDrawers?: boolean;
  drawerCount?: number;    // 0 to 4
  drawerHeight?: number;   // mm
  drawerOpenPercent?: number; // 0 to 100% open in 3D

  // Doors & Lids
  doorType?: "none" | "singleLeft" | "singleRight" | "double" | "flipUp";
  doorOpenPercent?: number; // 0 to 100% (or 0° to 90°)
  doorStyle?: "slab" | "slimShaker" | "shaker" | "fluted" | "framedGlass";

  // Handles & Hardware
  handleType?: "bar" | "slimLine" | "halfMoon" | "knob" | "edgePull" | "cutout" | "hidden" | "cncJProfile";
  handleFinish?: "black" | "steel" | "brass" | "bronze";

  // Internal Divisions & Shelving
  internalColumns?: number; // 1 to 5 vertical dividers
  internalShelves?: number; // 1 to 6 horizontal shelves
  shelfLayout?: "grid" | "staggered";
  shelfColumnOffsets?: number[]; // mm offset for each vertical divider column
  shelfRowOffsets?: number[];    // mm offset for each horizontal shelf tier
  selectedDivision?: SelectedDivision | null;
  onSelectDivision?: (div: SelectedDivision | null) => void;
  onRemoveDivision?: (div: SelectedDivision) => void;

  // Kitchen Cabinet Assembly Multi-Unit System
  kitchenUnits?: KitchenCabinetUnit[];
  selectedUnitId?: string;
  onSelectUnit?: (id: string) => void;
  onAddAdjacentUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;

  // Wardrobe Multi-Section Modular System
  wardrobeUnits?: WardrobeUnit[];
  selectedWardrobeUnitId?: string;
  onSelectWardrobeUnit?: (id: string) => void;
  onAddAdjacentWardrobeUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onAddDivision?: (unitId: string, type: "vertical" | "horizontal") => void;
}

interface FurnitureMeshProps {
  params: FurnitureParams;
  groupRef: React.RefObject<THREE.Group | null>;
  onSelectUnit?: (id: string) => void;
  onSelectUnits?: (ids: string[]) => void;
  onAddAdjacentUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onSelectWardrobeUnit?: (id: string) => void;
  onAddAdjacentWardrobeUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onAddDivision?: (unitId: string, type: "vertical" | "horizontal") => void;
  onSelectDivision?: (div: SelectedDivision | null) => void;
  onRemoveDivision?: (div: SelectedDivision) => void;
}

const MATERIAL_PRESETS = {
  oak: {
    color: "#b8905e",
    roughness: 0.55,
    metalness: 0.04,
    clearcoat: 0.08,
    clearcoatRoughness: 0.4,
    name: "Cadance_Natural_Oak_18mm",
  },
  walnut: {
    color: "#4a3525",
    roughness: 0.48,
    metalness: 0.04,
    clearcoat: 0.08,
    clearcoatRoughness: 0.4,
    name: "Cadance_American_Walnut_18mm",
  },
  plywood: {
    color: "#dec8a2",
    roughness: 0.65,
    metalness: 0.02,
    clearcoat: 0.05,
    clearcoatRoughness: 0.45,
    name: "Cadance_Birch_Plywood_18mm",
  },
  blackSteel: {
    color: "#1c1f26",
    roughness: 0.32,
    metalness: 0.55,
    clearcoat: 0.12,
    clearcoatRoughness: 0.3,
    name: "Cadance_Matte_Steel",
  },
  whiteStudio: {
    color: "#e6e8ec",
    roughness: 0.38,
    metalness: 0.04,
    clearcoat: 0.15,
    clearcoatRoughness: 0.3,
    name: "Cadance_White_Studio_Lacquer",
  },
};

const HANDLE_FINISHES = {
  black: { color: "#18181b", metalness: 0.88, roughness: 0.25, name: "Cadance_Matte_Black_Hardware" },
  steel: { color: "#cbd5e1", metalness: 0.95, roughness: 0.18, name: "Cadance_Brushed_Steel_Hardware" },
  brass: { color: "#eab308", metalness: 0.88, roughness: 0.22, name: "Cadance_Satin_Brass_Hardware" },
  bronze: { color: "#4a3b32", metalness: 0.88, roughness: 0.28, name: "Cadance_Architectural_Bronze_Hardware" },
};


let hoverCabinetTimer: ReturnType<typeof setTimeout> | null = null;
let hoverWardrobeTimer: ReturnType<typeof setTimeout> | null = null;

export default function FurnitureMesh({
  params,
  groupRef,
  onSelectUnit,
  onSelectUnits: propOnSelectUnits,
  onAddAdjacentUnit,
  onSelectWardrobeUnit,
  onAddAdjacentWardrobeUnit,
  onAddDivision,
  onSelectDivision: propOnSelectDivision,
  onRemoveDivision: propOnRemoveDivision,
}: FurnitureMeshProps) {
  const onSelectDivision = propOnSelectDivision || params.onSelectDivision;
  const onRemoveDivision = propOnRemoveDivision || params.onRemoveDivision;
  const selectedDivision = params.selectedDivision;
  const activeTool = params.activeTool || "select";
  const onSelectUnits = propOnSelectUnits || params.onSelectUnits;
  const [hoveredSnap, setHoveredSnap] = useState<{ unitId: string; side: "left" | "right" | "top" } | null>(null);
  const {
    width,
    height,
    depth,
    category,
    materialType,
    showDimensions,
    wireframe,
    boardThickness = 18,
    tableTopThickness = 18,
    apronHeight = 65,
    topOverhang = 25,
    hasBackPanel = category === "Cabinet",
    baseType = category === "Cabinet" ? "plinth" : "legs",
    plinthHeight = 80,
    plinthRecess = 40,
    legType = "square",
    legThickness = 50,
    legInset = 25,
    deskDrawerType = "apron",
    pedestalSide = "right",
    pedestalWidth = 400,
    pedestalDrawerCount = 3,
    hasDrawers = category === "Desk",
    drawerCount = 1,
    drawerOpenPercent = 0,
    doorOpenPercent = 0,
    handleType = "bar",
    handleFinish = "black",
    internalColumns = 1,
    internalShelves = category === "Shelf" ? 3 : 2,
    shelfLayout = "grid",
    shelfColumnOffsets,
    shelfRowOffsets,
    kitchenUnits,
    selectedUnitId,
    wardrobeUnits,
    selectedWardrobeUnitId,
  } = params;

  const selectedUnitIds = params.selectedUnitIds && params.selectedUnitIds.length > 0
    ? params.selectedUnitIds
    : (selectedUnitId ? [selectedUnitId] : []);

  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [hoveredWardrobeUnit, setHoveredWardrobeUnit] = useState<string | null>(null);
  const handleHoverCabinet = (id: string) => {
    if (hoverCabinetTimer) clearTimeout(hoverCabinetTimer);
    setHoveredUnit(id);
  };

  const handleLeaveCabinet = () => {
    if (hoverCabinetTimer) clearTimeout(hoverCabinetTimer);
    hoverCabinetTimer = setTimeout(() => {
      setHoveredUnit(null);
    }, 450);
  };

  const handleHoverWardrobe = (id: string) => {
    if (hoverWardrobeTimer) clearTimeout(hoverWardrobeTimer);
    setHoveredWardrobeUnit(id);
  };

  const handleLeaveWardrobe = () => {
    if (hoverWardrobeTimer) clearTimeout(hoverWardrobeTimer);
    hoverWardrobeTimer = setTimeout(() => {
      setHoveredWardrobeUnit(null);
    }, 450);
  };


  // Convert mm to meters for Three.js units (1 unit = 1 meter = 1000mm)
  const w = width / 1000;
  const h = height / 1000;
  const d = depth / 1000;
  const t = Math.max(0.012, boardThickness / 1000);

  const matConfig = MATERIAL_PRESETS[materialType] || MATERIAL_PRESETS.oak;
  const handleConfig = HANDLE_FINISHES[handleFinish] || HANDLE_FINISHES.black;

  const mainMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        name: matConfig.name,
        color: matConfig.color,
        roughness: matConfig.roughness,
        metalness: matConfig.metalness,
        clearcoat: matConfig.clearcoat ?? 0.08,
        clearcoatRoughness: matConfig.clearcoatRoughness ?? 0.4,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
    [matConfig, wireframe]
  );

  const materialsPresetMap = useMemo(() => {
    const map: Record<string, THREE.MeshPhysicalMaterial> = {};
    for (const [key, cfg] of Object.entries(MATERIAL_PRESETS)) {
      map[key] = new THREE.MeshPhysicalMaterial({
        name: cfg.name,
        color: cfg.color,
        roughness: cfg.roughness,
        metalness: cfg.metalness,
        clearcoat: cfg.clearcoat ?? 0.08,
        clearcoatRoughness: cfg.clearcoatRoughness ?? 0.4,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      });
    }
    return map;
  }, [wireframe]);

  const getUnitMaterial = (unitMat?: MaterialPreset) => {
    if (unitMat && materialsPresetMap[unitMat]) {
      return materialsPresetMap[unitMat];
    }
    return mainMaterial;
  };

  const handleMaterialsMap = useMemo(() => {
    const map: Record<string, THREE.MeshPhysicalMaterial> = {};
    for (const [key, cfg] of Object.entries(HANDLE_FINISHES)) {
      map[key] = new THREE.MeshPhysicalMaterial({
        name: cfg.name,
        color: cfg.color,
        metalness: cfg.metalness,
        roughness: cfg.roughness,
        clearcoat: 0.35,
        clearcoatRoughness: 0.2,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.2 : 1.0,
      });
    }
    return map;
  }, [wireframe]);

  const handleMaterial = handleMaterialsMap[handleFinish] || handleMaterialsMap.black;

  const edgeColor = wireframe ? "#38bdf8" : "#1a1c23";

  // Architectural PBR Mirrors with True Environmental Reflections
  const mirrorMaterialsMap = useMemo(() => {
    return {
      silver: new THREE.MeshPhysicalMaterial({
        name: "Cadance_Silver_Mirror",
        color: "#eef2f6",
        metalness: 0.98,
        roughness: 0.015,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        envMapIntensity: 2.0,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
      bronze: new THREE.MeshPhysicalMaterial({
        name: "Cadance_Bronze_Mirror",
        color: "#c8a98e",
        metalness: 0.98,
        roughness: 0.015,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        envMapIntensity: 2.0,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
      smoked: new THREE.MeshPhysicalMaterial({
        name: "Cadance_Smoked_Mirror",
        color: "#64748b",
        metalness: 0.98,
        roughness: 0.015,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        envMapIntensity: 2.0,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
    };
  }, [wireframe]);

  const getMirrorMaterial = useCallback(
    (type?: "full" | "center" | "bronze" | "smoked") => {
      if (type === "bronze") return mirrorMaterialsMap.bronze;
      if (type === "smoked") return mirrorMaterialsMap.smoked;
      return mirrorMaterialsMap.silver;
    },
    [mirrorMaterialsMap]
  );

  const mirrorMaterial = mirrorMaterialsMap.silver;

  // Aluminum Vitrin Smoked Glass Material
  const smokedGlassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        name: "Cadance_Smoked_Glass",
        color: "#1e293b",
        transparent: true,
        opacity: 0.42,
        roughness: 0.08,
        metalness: 0.1,
        reflectivity: 0.9,
        ior: 1.52,
        transmission: 0.55,
        thickness: 0.004,
        envMapIntensity: 1.5,
      }),
    []
  );

  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        name: "Cadance_Polished_Chrome",
        color: "#e2e8f0",
        roughness: 0.15,
        metalness: 0.92,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
    [wireframe]
  );

  const countertopMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        name: "Cadance_White_Composite_Countertop",
        color: "#f8fafc",
        roughness: 0.25,
        metalness: 0.05,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
    [wireframe]
  );

  // Procedural Canvas Bump/Normal Texture for CNC Reeded / Fluted Panels
  const flutedBumpTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imgData = ctx.createImageData(128, 128);
    for (let x = 0; x < 128; x++) {
      const val = Math.floor((Math.sin((x / 128) * Math.PI * 8) * 0.5 + 0.5) * 255);
      for (let y = 0; y < 128; y++) {
        const idx = (y * 128 + x) * 4;
        imgData.data[idx] = val;
        imgData.data[idx + 1] = val;
        imgData.data[idx + 2] = val;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const flutedMaterial = useMemo(() => {
    const mat = (mainMaterial as THREE.MeshPhysicalMaterial).clone();
    mat.name = `${mat.name}_Fluted`;
    if (flutedBumpTexture) {
      mat.bumpMap = flutedBumpTexture;
      mat.bumpScale = 0.006;
      mat.roughness = Math.min(1.0, (mat.roughness || 0.5) + 0.06);
    }
    return mat;
  }, [mainMaterial, flutedBumpTexture]);

  // Procedural 1-segment Extruded Geometry for Fluted Panel
  const createFlutedPanelGeometry = useMemo(() => {
    return (w: number, h: number, t: number, flutePitch: number = 0.025) => {
      const numFlutes = Math.max(2, Math.round(w / flutePitch));
      const actualPitch = w / numFlutes;
      const grooveDepth = Math.min(0.004, t * 0.25);

      const shape = new THREE.Shape();
      const halfW = w / 2;
      const frontZ = t / 2;
      const backZ = -t / 2;

      shape.moveTo(-halfW, backZ);
      shape.lineTo(halfW, backZ);
      shape.lineTo(halfW, frontZ - grooveDepth);

      for (let i = numFlutes - 1; i >= 0; i--) {
        const startX = -halfW + i * actualPitch;
        const midX = startX + actualPitch * 0.5;
        shape.lineTo(midX + actualPitch * 0.15, frontZ);
        shape.lineTo(midX - actualPitch * 0.15, frontZ);
        shape.lineTo(startX, frontZ - grooveDepth);
      }

      shape.lineTo(-halfW, backZ);
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: h,
        bevelEnabled: false,
      });

      geom.rotateX(Math.PI / 2);
      geom.center();
      geom.computeVertexNormals();
      return geom;
    };
  }, []);

  // Integrated CNC Milled J-Profile Door Geometry (Continuous Single Geometry)
  const createCncMilledJProfileGeometry = useMemo(() => {
    return (width: number, height: number, thickness: number, invertY: boolean = false) => {
      const T = Math.max(0.012, thickness);
      const H = height;
      const W = width;

      const shape = new THREE.Shape();
      const lipThick = Math.min(0.007, T * 0.38);
      const pocketDepth = Math.min(0.026, H * 0.15); // 26mm deep finger recess
      const rearHeight = H - pocketDepth + 0.005;

      shape.moveTo(0, 0);
      shape.lineTo(0, rearHeight);
      shape.lineTo(T - lipThick - 0.004, rearHeight);
      shape.lineTo(T - lipThick - 0.004, H - pocketDepth);
      shape.lineTo(T - lipThick, H - pocketDepth);
      shape.lineTo(T - lipThick, H);
      shape.lineTo(T, H);
      shape.lineTo(T, 0);
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: W,
        bevelEnabled: false,
      });

      geom.rotateY(-Math.PI / 2);
      if (invertY) {
        geom.rotateX(Math.PI);
      }
      geom.center();
      geom.computeVertexNormals();
      return geom;
    };
  }, []);

  const CncDoorMesh = ({
    width: dw,
    height: dh,
    thickness: dt = 0.018,
    material: dmat,
    edgeColor: dec,
    isSelected: dis,
    invertY: diy = false,
    position: dpos = [0, 0, 0],
  }: {
    width: number;
    height: number;
    thickness?: number;
    material: THREE.Material;
    edgeColor: string;
    isSelected?: boolean;
    invertY?: boolean;
    position?: [number, number, number];
  }) => {
    const geom = useMemo(
      () => createCncMilledJProfileGeometry(dw, dh, dt, diy),
      [dw, dh, dt, diy]
    );

    return (
      <mesh position={dpos} geometry={geom} material={dmat} castShadow receiveShadow>
        <Edges threshold={15} color={dis ? "#60a5fa" : dec} />
      </mesh>
    );
  };

  // Reusable High-Performance Architectural Door Mesh Component
  const ArchitecturalDoorMesh = ({
    width: dw,
    height: dh,
    thickness: dt = 0.018,
    doorStyle: dStyle = "slab",
    material: dmat,
    frameMaterial,
    handleType: dhType,
    invertY = false,
    edgeColor: dec,
    isSelected = false,
    position: dpos = [0, 0, 0],
    rotation: drot,
    children,
  }: {
    width: number;
    height: number;
    thickness?: number;
    doorStyle?: "slab" | "slimShaker" | "shaker" | "fluted" | "framedGlass";
    material: THREE.Material;
    frameMaterial?: THREE.Material;
    handleType?: string;
    invertY?: boolean;
    edgeColor: string;
    isSelected?: boolean;
    position?: [number, number, number];
    rotation?: [number, number, number];
    children?: React.ReactNode;
  }) => {
    // 1. CNC J-Profile
    if (dhType === "cncJProfile") {
      return (
        <group position={dpos} rotation={drot}>
          <CncDoorMesh
            width={dw}
            height={dh}
            thickness={dt}
            material={dmat}
            edgeColor={dec}
            isSelected={isSelected}
            invertY={invertY}
          />
          {children}
        </group>
      );
    }

    // 2. Slim Shaker (22mm frame) & Classic Shaker (60mm frame)
    if (dStyle === "slimShaker" || dStyle === "shaker") {
      const F = dStyle === "slimShaker" ? 0.022 : 0.060;
      const CW = Math.max(0.01, dw - 2 * F);
      const CH = Math.max(0.01, dh - 2 * F);
      return (
        <group position={dpos} rotation={drot}>
          {/* Recessed Center Panel (12mm thick, set back 6mm) */}
          <mesh position={[0, 0, -0.003]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[CW, CH, 0.012]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Left Vertical Stile */}
          <mesh position={[-dw / 2 + F / 2, 0, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[F, dh, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Right Vertical Stile */}
          <mesh position={[dw / 2 - F / 2, 0, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[F, dh, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Top Horizontal Rail */}
          <mesh position={[0, dh / 2 - F / 2, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[CW, F, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Bottom Horizontal Rail */}
          <mesh position={[0, -dh / 2 + F / 2, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[CW, F, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {children}
        </group>
      );
    }

    // 3. CNC Fluted / Reeded MDF Door
    if (dStyle === "fluted") {
      const B = 0.030; // 30mm perimeter border stiles
      const IW = Math.max(0.02, dw - 2 * B);
      const IH = Math.max(0.02, dh - 2 * B);
      const flutedGeom = createFlutedPanelGeometry(IW, IH, dt - 0.002, 0.025);
      return (
        <group position={dpos} rotation={drot}>
          {/* Fluted Center Panel */}
          <mesh position={[0, 0, 0]} geometry={flutedGeom} material={flutedMaterial} castShadow receiveShadow>
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Left Stile */}
          <mesh position={[-dw / 2 + B / 2, 0, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[B, dh, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Right Stile */}
          <mesh position={[dw / 2 - B / 2, 0, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[B, dh, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Top Rail */}
          <mesh position={[0, dh / 2 - B / 2, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[IW, B, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {/* Bottom Rail */}
          <mesh position={[0, -dh / 2 + B / 2, 0]} material={dmat} castShadow receiveShadow>
            <boxGeometry args={[IW, B, dt]} />
            <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
          </mesh>
          {children}
        </group>
      );
    }

    // 4. Framed Glass (Anodized Aluminum Frame + Smoked Glass Pane)
    if (dStyle === "framedGlass") {
      const F = 0.022; // 22mm aluminum frame
      const frameMat = frameMaterial || handleMaterial;
      const CW = Math.max(0.01, dw - 2 * F);
      const CH = Math.max(0.01, dh - 2 * F);
      return (
        <group position={dpos} rotation={drot}>
          {/* Smoked Translucent Glass Insert */}
          <mesh position={[0, 0, 0]} material={smokedGlassMaterial}>
            <boxGeometry args={[CW + 0.006, CH + 0.006, 0.004]} />
          </mesh>
          {/* Left Aluminum Stile */}
          <mesh position={[-dw / 2 + F / 2, 0, 0]} material={frameMat} castShadow>
            <boxGeometry args={[F, dh, dt]} />
            <Edges threshold={15} color="#475569" />
          </mesh>
          {/* Right Aluminum Stile */}
          <mesh position={[dw / 2 - F / 2, 0, 0]} material={frameMat} castShadow>
            <boxGeometry args={[F, dh, dt]} />
            <Edges threshold={15} color="#475569" />
          </mesh>
          {/* Top Aluminum Rail */}
          <mesh position={[0, dh / 2 - F / 2, 0]} material={frameMat} castShadow>
            <boxGeometry args={[CW, F, dt]} />
            <Edges threshold={15} color="#475569" />
          </mesh>
          {/* Bottom Aluminum Rail */}
          <mesh position={[0, -dh / 2 + F / 2, 0]} material={frameMat} castShadow>
            <boxGeometry args={[CW, F, dt]} />
            <Edges threshold={15} color="#475569" />
          </mesh>
          {children}
        </group>
      );
    }

    // 5. Default: Slab Flat Panel
    return (
      <group position={dpos} rotation={drot}>
        <mesh material={dmat} castShadow receiveShadow>
          <boxGeometry args={[dw, dh, dt]} />
          <Edges threshold={15} color={isSelected ? "#60a5fa" : dec} />
        </mesh>
        {children}
      </group>
    );
  };

  // Pre-allocated geometries for Pinterest Half-Moon Arch Pull
  const halfMoonGeometries = useMemo(() => {
    const r = 0.045; // 45mm radius -> 90mm full circle on double doors
    const shapeLeft = new THREE.Shape();
    shapeLeft.moveTo(0, -r);
    shapeLeft.absarc(0, 0, r, -Math.PI / 2, Math.PI / 2, true);
    shapeLeft.lineTo(0, -r);
    shapeLeft.closePath();
    const geomLeft = new THREE.ExtrudeGeometry(shapeLeft, { steps: 1, depth: 0.003, bevelEnabled: false });
    geomLeft.center();

    const shapeRight = new THREE.Shape();
    shapeRight.moveTo(0, -r);
    shapeRight.absarc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    shapeRight.lineTo(0, -r);
    shapeRight.closePath();
    const geomRight = new THREE.ExtrudeGeometry(shapeRight, { steps: 1, depth: 0.003, bevelEnabled: false });
    geomRight.center();

    return { left: geomLeft, right: geomRight };
  }, []);

  // Reusable Minimalist Architectural Hardware Handle Renderer
  const renderHandle = (
    pos: [number, number, number],
    isVertical: boolean = true,
    doorOffset: number = 0,
    hType: FurnitureParams["handleType"] = handleType,
    hFinish: FurnitureParams["handleFinish"] = handleFinish,
    context?: { isRightDoor?: boolean; doorHeight?: number; drawerWidth?: number }
  ) => {
    if (hType === "hidden" || hType === "cncJProfile") return null;

    const specificHandleMat = handleMaterialsMap[hFinish || handleFinish] || handleMaterialsMap.black;

    // 1. Minimalist Knurled/Linear Bar ("slimLine")
    if (hType === "slimLine") {
      let rodLen = 0.22;
      if (context?.doorHeight && context.doorHeight > 1.5) {
        rodLen = 0.60;
      } else if (context?.drawerWidth && context.drawerWidth > 0.70) {
        rodLen = 0.32;
      }
      const standoffSpan = rodLen * 0.75;
      return (
        <group position={[pos[0] + doorOffset, pos[1], pos[2] + 0.016]}>
          <mesh
            material={specificHandleMat}
            castShadow
            rotation={isVertical ? [0, 0, 0] : [0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.003, 0.003, rodLen, 12]} />
          </mesh>
          <mesh
            position={isVertical ? [0, standoffSpan / 2, -0.008] : [standoffSpan / 2, 0, -0.008]}
            rotation={[Math.PI / 2, 0, 0]}
            material={specificHandleMat}
          >
            <cylinderGeometry args={[0.004, 0.004, 0.016, 12]} />
          </mesh>
          <mesh
            position={isVertical ? [0, -standoffSpan / 2, -0.008] : [-standoffSpan / 2, 0, -0.008]}
            rotation={[Math.PI / 2, 0, 0]}
            material={specificHandleMat}
          >
            <cylinderGeometry args={[0.004, 0.004, 0.016, 12]} />
          </mesh>
        </group>
      );
    }

    // 2. Pinterest Half-Moon / Asymmetric Arch Pull ("halfMoon")
    if (hType === "halfMoon") {
      const isRight = Boolean(context?.isRightDoor);
      const geom = isRight ? halfMoonGeometries.right : halfMoonGeometries.left;
      return (
        <group position={[pos[0] + doorOffset, pos[1], pos[2] + 0.008]}>
          <mesh geometry={geom} material={specificHandleMat} castShadow />
          <mesh position={[isRight ? 0.015 : -0.015, 0, -0.004]} material={specificHandleMat}>
            <boxGeometry args={[0.018, 0.040, 0.008]} />
          </mesh>
        </group>
      );
    }

    // 3. Architectural T-Knob / Stepped Cone Dot ("knob")
    if (hType === "knob") {
      return (
        <group position={[pos[0] + doorOffset, pos[1], pos[2]]}>
          <mesh position={[0, 0, 0.009]} rotation={[Math.PI / 2, 0, 0]} material={specificHandleMat} castShadow>
            <cylinderGeometry args={[0.004, 0.004, 0.018, 12]} />
          </mesh>
          <mesh position={[0, 0, 0.019]} rotation={[Math.PI / 2, 0, 0]} material={specificHandleMat} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.004, 16]} />
          </mesh>
        </group>
      );
    }

    // 4. Modern L-Shaped Finger Tab Lip ("edgePull")
    if (hType === "edgePull") {
      return (
        <group position={[pos[0] + doorOffset, pos[1], pos[2] + 0.005]}>
          <mesh position={[0, 0, 0]} material={specificHandleMat} castShadow>
            <boxGeometry args={[0.08, 0.003, 0.018]} />
          </mesh>
          <mesh position={[0, -0.006, 0.009]} material={specificHandleMat} castShadow>
            <boxGeometry args={[0.08, 0.012, 0.002]} />
          </mesh>
        </group>
      );
    }

    // 5. Rounded Slot Cutout ("cutout")
    if (hType === "cutout") {
      return (
        <group position={[pos[0] + doorOffset, pos[1], pos[2] + 0.002]}>
          <mesh>
            <boxGeometry args={[0.09, 0.024, 0.006]} />
            <meshBasicMaterial color="#0e1017" />
          </mesh>
        </group>
      );
    }

    // 6. Default: Minimalist Architectural Bar Pull ("bar")
    const barLen = 0.14;
    const barThick = 0.008;
    return (
      <group position={[pos[0] + doorOffset, pos[1], pos[2] + 0.018]}>
        <mesh material={specificHandleMat} castShadow>
          <boxGeometry
            args={
              isVertical
                ? [barThick, barLen, barThick]
                : [barLen, barThick, barThick]
            }
          />
        </mesh>
        <mesh
          position={
            isVertical ? [0, barLen * 0.35, -0.009] : [barLen * 0.35, 0, -0.009]
          }
          rotation={[Math.PI / 2, 0, 0]}
          material={specificHandleMat}
        >
          <cylinderGeometry args={[0.0035, 0.0035, 0.018, 12]} />
        </mesh>
        <mesh
          position={
            isVertical
              ? [0, -barLen * 0.35, -0.009]
              : [-barLen * 0.35, 0, -0.009]
          }
          rotation={[Math.PI / 2, 0, 0]}
          material={specificHandleMat}
        >
          <cylinderGeometry args={[0.0035, 0.0035, 0.018, 12]} />
        </mesh>
      </group>
    );
  };

  // 1. TABLE / DESK RENDERER
  const renderTable = () => {
    // Top Board Thickness option (independent of legs / apron)
    const topT = Math.max(0.012, (tableTopThickness ?? 25) / 1000);
    const oHang = (topOverhang ?? 25) / 1000;
    const legThick = (legThickness / 1000) || 0.05;
    const legIns = (legInset / 1000) || 0.025;
    const legH = Math.max(0.1, h - topT);

    const cornerX = w / 2 - oHang - legIns - legThick / 2;
    const cornerZ = d / 2 - oHang - legIns - legThick / 2;

    const drawerH = Math.min(0.14, legH * 0.32);
    const drawerD = d * 0.75;
    const slideDist = ((drawerOpenPercent || 0) / 100) * (drawerD * 0.7);

    // Office Desk Pedestal Calculations
    const isPedestal = (category === "Desk" || category === "Table") && deskDrawerType === "pedestal" && hasDrawers;
    const pedW = (pedestalWidth ?? 400) / 1000;
    const pedSide = pedestalSide ?? "right";
    const pedCenterX = pedSide === "left" ? -w / 2 + oHang + pedW / 2 : w / 2 - oHang - pedW / 2;
    const pedH = legH;

    return (
      <group>
        {/* Tabletop resting flush at y = h - topT/2 */}
        <mesh
          position={[0, h - topT / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[w, topT, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>

        {/* Office Vertical Pedestal Tower (if enabled) */}
        {isPedestal ? (
          <group>
            {/* Pedestal Carcase Box on chosen side */}
            <group position={[pedCenterX, pedH / 2, 0]}>
              {/* Outer Left Side */}
              <mesh position={[-pedW / 2 + t / 2, 0, 0]} material={mainMaterial} castShadow>
                <boxGeometry args={[t, pedH, d * 0.85]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              {/* Outer Right Side */}
              <mesh position={[pedW / 2 - t / 2, 0, 0]} material={mainMaterial} castShadow>
                <boxGeometry args={[t, pedH, d * 0.85]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              {/* Bottom Base */}
              <mesh position={[0, -pedH / 2 + t / 2, 0]} material={mainMaterial} castShadow>
                <boxGeometry args={[pedW - t * 2, t, d * 0.85]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              {/* Back Board */}
              <mesh position={[0, 0, -d * 0.85 / 2 + t / 2]} material={mainMaterial}>
                <boxGeometry args={[pedW - t * 2, pedH, t]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>

              {/* Vertically Stacked Pedestal Drawers */}
              {Array.from({ length: pedestalDrawerCount || 3 }).map((_, pdi) => {
                const count = pedestalDrawerCount || 3;
                const dBoxH = (pedH - t) / count - 0.008;
                const dBoxY = -pedH / 2 + t + dBoxH / 2 + pdi * (dBoxH + 0.008);

                return (
                  <group
                    key={`pedDrawer-${pdi}`}
                    position={[0, dBoxY, d * 0.85 / 2 + slideDist]}
                  >
                    {/* Front */}
                    <mesh castShadow receiveShadow material={mainMaterial}>
                      <boxGeometry args={[pedW - t * 2 - 0.006, dBoxH, 0.018]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    {/* Drawer Box */}
                    <mesh
                      position={[0, -dBoxH / 2 + 0.005, -drawerD * 0.45]}
                      material={mainMaterial}
                    >
                      <boxGeometry args={[pedW - t * 2 - 0.03, 0.01, drawerD * 0.9]} />
                    </mesh>
                    {renderHandle([0, 0, 0.01], false)}
                  </group>
                );
              })}
            </group>

            {/* Opposite Side Table Legs (Leaving open seating legroom!) */}
            {[-cornerZ, cornerZ].map((lz, lzi) => {
              const oppX = pedSide === "left" ? cornerX : -cornerX;
              return (
                <mesh
                  key={`oppLeg-${lzi}`}
                  position={[oppX, legH / 2, lz]}
                  castShadow
                  receiveShadow
                  material={mainMaterial}
                >
                  <boxGeometry args={[legThick, legH, legThick]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              );
            })}
          </group>
        ) : legType === "trestle" ? (
          // FIX 2: Trestle stretcher beam touches both vertical parts with NO gap
          (() => {
            const trestleX1 = -w / 2 + oHang + 0.06;
            const trestleX2 = w / 2 - oHang - 0.06;
            const span = trestleX2 - trestleX1;

            return (
              <group>
                {[trestleX1, trestleX2].map((tx, ti) => (
                  <group key={`trestle-${ti}`}>
                    {/* Bottom Runner touching floor at y = 0 */}
                    <mesh
                      position={[tx, 0.025, 0]}
                      castShadow
                      receiveShadow
                      material={mainMaterial}
                    >
                      <boxGeometry args={[0.06, 0.05, d * 0.78]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    {/* Top Mounting Plate */}
                    <mesh
                      position={[tx, h - topT - 0.02, 0]}
                      castShadow
                      material={mainMaterial}
                    >
                      <boxGeometry args={[0.06, 0.04, d * 0.72]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    {/* 2 Vertical Struts */}
                    {[-d * 0.28, d * 0.28].map((tz, tzi) => (
                      <mesh
                        key={`strut-${ti}-${tzi}`}
                        position={[tx, legH / 2, tz]}
                        castShadow
                        receiveShadow
                        material={mainMaterial}
                      >
                        <boxGeometry args={[0.05, legH - 0.07, 0.05]} />
                        <Edges threshold={15} color={edgeColor} />
                      </mesh>
                    ))}
                  </group>
                ))}
                {/* Center Stretcher Beam touching both trestles seamlessly */}
                <mesh
                  position={[0, 0.12, 0]}
                  castShadow
                  receiveShadow
                  material={mainMaterial}
                >
                  <boxGeometry args={[span, 0.05, 0.04]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              </group>
            );
          })()
        ) : (
          // 4 Corner Legs
          [-cornerX, cornerX].map((lx, lxi) =>
            [-cornerZ, cornerZ].map((lz, lzi) => (
              <mesh
                key={`leg-${lxi}-${lzi}`}
                position={[lx, legH / 2, lz]}
                castShadow
                receiveShadow
                material={mainMaterial}
              >
                {legType === "round" ? (
                  <cylinderGeometry
                    args={[legThick / 2, legThick / 2, legH, 16]}
                  />
                ) : legType === "tapered" ? (
                  <cylinderGeometry
                    args={[legThick * 0.45, legThick * 0.22, legH, 4]}
                  />
                ) : (
                  <boxGeometry args={[legThick, legH, legThick]} />
                )}
                <Edges threshold={15} color={edgeColor} />
              </mesh>
            ))
          )
        )}

        {/* Apron & Horizontal Drawers (when not pedestal) */}
        {!isPedestal && hasDrawers && drawerCount > 0 ? (
          <group>
            {/* Side Apron Rails */}
            {[-cornerX, cornerX].map((ax, axi) => (
              <mesh
                key={`sideApron-${axi}`}
                position={[ax > 0 ? ax - legThick / 2 : ax + legThick / 2, h - topT - drawerH / 2, 0]}
                material={mainMaterial}
              >
                <boxGeometry args={[t, drawerH, cornerZ * 2]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
            ))}
            {/* Back Apron Rail */}
            <mesh
              position={[0, h - topT - drawerH / 2, -cornerZ]}
              material={mainMaterial}
            >
              <boxGeometry args={[cornerX * 2, drawerH, t]} />
              <Edges threshold={15} color={edgeColor} />
            </mesh>

            {/* Horizontal Drawers across front */}
            {Array.from({ length: Math.min(3, drawerCount) }).map((_, di) => {
              const totalDrawers = Math.min(3, drawerCount);
              const drawerSpan = (cornerX * 2) - 0.02;
              const dWidth = drawerSpan / totalDrawers - 0.015;
              const dCenterX =
                -cornerX + 0.01 + dWidth / 2 + di * (dWidth + 0.015);
              const drawerY = h - topT - drawerH / 2;

              return (
                <group
                  key={`drawer-${di}`}
                  position={[dCenterX, drawerY, cornerZ + slideDist]}
                >
                  <mesh
                    position={[0, 0, 0]}
                    castShadow
                    receiveShadow
                    material={mainMaterial}
                  >
                    <boxGeometry args={[dWidth, drawerH - 0.01, 0.018]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                  <mesh
                    position={[0, -drawerH / 2 + 0.006, -drawerD / 2]}
                    material={mainMaterial}
                  >
                    <boxGeometry args={[dWidth - 0.03, 0.01, drawerD]} />
                  </mesh>
                  <mesh
                    position={[-dWidth / 2 + 0.012, 0, -drawerD / 2]}
                    material={mainMaterial}
                  >
                    <boxGeometry args={[0.012, drawerH * 0.75, drawerD]} />
                  </mesh>
                  <mesh
                    position={[dWidth / 2 - 0.012, 0, -drawerD / 2]}
                    material={mainMaterial}
                  >
                    <boxGeometry args={[0.012, drawerH * 0.75, drawerD]} />
                  </mesh>
                  {renderHandle([0, 0, 0.01], false)}
                </group>
              );
            })}
          </group>
        ) : (
          !isPedestal && legType !== "trestle" && (() => {
            const apronH = Math.max(0.03, (apronHeight ?? 65) / 1000);
            const apronY = h - topT - apronH / 2;
            return (
              <group>
                <mesh
                  position={[0, apronY, cornerZ]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[cornerX * 2, apronH, t]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
                <mesh
                  position={[0, apronY, -cornerZ]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[cornerX * 2, apronH, t]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
                <mesh
                  position={[cornerX, apronY, 0]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[t, apronH, cornerZ * 2]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
                <mesh
                  position={[-cornerX, apronY, 0]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[t, apronH, cornerZ * 2]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              </group>
            );
          })()
        )}
      </group>
    );
  };

  // 2. MODULAR KITCHEN CABINET SYSTEM RENDERER (Supports L-Shaped Layout, Corner Base & Per-Cabinet Materials)
  const renderKitchenCabinetSystem = () => {
    // Default units if none defined
    const units: KitchenCabinetUnit[] = kitchenUnits && kitchenUnits.length > 0 ? kitchenUnits : [
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
        name: "Upper Wall Cabinet 1",
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
        name: "Upper Wall Cabinet 2",
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

    const baseUnits = units.filter((u) => u.type === "base" || u.type === "corner-base");
    const wallUnits = units.filter((u) => u.type === "wall" || u.type === "corner-wall");

    const plinthH = baseType === "floating" ? 0 : plinthHeight / 1000;
    const plinthRec = plinthRecess / 1000;
    const globalAngleRad = ((doorOpenPercent || 0) / 100) * ((85 * Math.PI) / 180);

    const D_STD = 0.60; // Standard 600mm base cabinet depth

    // -------------------------------------------------------------
    // BASE CABINETS RUN LAYOUT (Supports Linear & 90° L-Shaped Runs)
    // -------------------------------------------------------------
    interface BaseLayoutItem {
      unit: KitchenCabinetUnit;
      pos: [number, number, number];
      rotY: number;
      uW: number;
      uH: number;
      uD: number;
      isCorner: boolean;
      runIndex: number; // 0 = straight along X, 1 = turned along Z
    }

    const layoutBaseItems: BaseLayoutItem[] = [];
    let curRun = 0;
    let cursorX = 0;
    let cursorZ = 0;
    let cornerOuterX = 0;
    let cornerOuterZ = -D_STD / 2;
    let cornerW = 0.9;
    let cornerD = 0.9;
    let hasBaseCorner = false;
    let isBaseTurnLeft = false;

    for (let i = 0; i < baseUnits.length; i++) {
      const u = baseUnits[i];
      const isCorner = u.type === "corner-base" || u.orientation === "corner-right" || u.orientation === "corner-left";
      const uW = u.width / 1000;
      const uH = u.height / 1000;
      const uD = isCorner ? (u.depth ? u.depth / 1000 : 0.9) : (u.depth ? u.depth / 1000 : D_STD);

      if (!isCorner && curRun === 0) {
        // Straight unit on primary run (along X, facing +Z)
        const cx = cursorX + uW / 2;
        const cz = -D_STD / 2 + uD / 2;
        cursorX += uW;
        layoutBaseItems.push({
          unit: u,
          pos: [cx, plinthH, cz],
          rotY: 0,
          uW,
          uH,
          uD,
          isCorner: false,
          runIndex: 0,
        });
      } else if (isCorner) {
        // 90° L-Corner unit placed at end of Run 0
        hasBaseCorner = true;
        isBaseTurnLeft = u.orientation === "corner-left";
        cornerW = uW || 0.9;
        cornerD = uD || 0.9;
        cornerOuterX = cursorX + cornerW;
        cornerOuterZ = -D_STD / 2;

        const cx = cursorX + cornerW / 2;
        const cz = cornerOuterZ + cornerD / 2;
        const rotY = isBaseTurnLeft ? Math.PI / 2 : 0;

        layoutBaseItems.push({
          unit: u,
          pos: [cx, plinthH, cz],
          rotY,
          uW: cornerW,
          uH,
          uD: cornerD,
          isCorner: true,
          runIndex: 0,
        });

        // Switch next cabinets to Run 1 (along +Z)
        curRun = 1;
        cursorZ = cornerOuterZ + cornerD;
      } else if (!isCorner && curRun === 1) {
        // Straight unit on turned Run 1
        const cz = cursorZ + uW / 2;
        cursorZ += uW;
        const cx = isBaseTurnLeft ? cornerOuterX - cornerW + uD / 2 : cornerOuterX - uD / 2;
        const rotY = isBaseTurnLeft ? Math.PI / 2 : -Math.PI / 2;

        layoutBaseItems.push({
          unit: u,
          pos: [cx, plinthH, cz],
          rotY,
          uW,
          uH,
          uD,
          isCorner: false,
          runIndex: 1,
        });
      }
    }

    // -------------------------------------------------------------
    // UPPER WALL UNITS RUN LAYOUT (Supports Linear & 90° L-Shaped Runs)
    // -------------------------------------------------------------
    const D_WALL_STD = 0.35; // Standard 350mm upper wall cabinet depth
    const maxBaseH = baseUnits.length > 0 ? Math.max(...baseUnits.map((u) => u.height / 1000)) : 0.72;
    const countertopThick = (tableTopThickness || 30) / 1000;

    interface WallLayoutItem {
      unit: KitchenCabinetUnit;
      pos: [number, number, number];
      rotY: number;
      uW: number;
      uH: number;
      uD: number;
      isCorner: boolean;
      runIndex: number;
    }

    const layoutWallItems: WallLayoutItem[] = [];
    let wallCurRun = 0;
    let wallCursorX = 0;
    let wallCursorZ = 0;
    let targetCornerX = hasBaseCorner ? cornerOuterX : 0;
    const targetCornerZ = -D_STD / 2;

    for (let i = 0; i < wallUnits.length; i++) {
      const u = wallUnits[i];
      const isCornerWall = u.type === "corner-wall";
      const isRun1Explicit = u.runAxis === "run1";

      if (isRun1Explicit && wallCurRun === 0) {
        wallCurRun = 1;
        if (wallCursorZ === 0) {
          wallCursorZ = targetCornerZ + (hasBaseCorner ? cornerD : D_WALL_STD);
        }
      }

      const uW = u.width / 1000;
      const uH = u.height / 1000;
      const uD = isCornerWall
        ? (u.depth ? u.depth / 1000 : 0.60)
        : (u.depth ? u.depth / 1000 : D_WALL_STD);
      const clearance = (u.bottomOffset !== undefined ? u.bottomOffset : 600) / 1000;
      const unitWallY = plinthH + maxBaseH + countertopThick + clearance;

      if (!isCornerWall && wallCurRun === 0) {
        // Straight wall unit on primary Run 0 (along X, facing +Z)
        const cx = wallCursorX + uW / 2;
        const cz = -D_STD / 2 + uD / 2;
        wallCursorX += uW;
        layoutWallItems.push({
          unit: u,
          pos: [cx, unitWallY, cz],
          rotY: 0,
          uW,
          uH,
          uD,
          isCorner: false,
          runIndex: 0,
        });
      } else if (isCornerWall) {
        // 90° Corner Wall Cabinet
        const isTurnLeft = u.orientation === "corner-left" || isBaseTurnLeft;
        const cWallOuterX = hasBaseCorner ? cornerOuterX : (wallCursorX + uW);
        targetCornerX = cWallOuterX;

        const cx = isTurnLeft
          ? (cWallOuterX - (hasBaseCorner ? cornerW : uW) + uW / 2)
          : (cWallOuterX - uW / 2);
        const cz = targetCornerZ + uD / 2;
        const rotY = isTurnLeft ? Math.PI / 2 : 0;

        layoutWallItems.push({
          unit: u,
          pos: [cx, unitWallY, cz],
          rotY,
          uW,
          uH,
          uD,
          isCorner: true,
          runIndex: 0,
        });

        // Switch next wall units to Run 1
        wallCurRun = 1;
        wallCursorZ = targetCornerZ + uD;
      } else if (!isCornerWall && wallCurRun === 1) {
        // Straight wall unit on turned Run 1 (along +Z)
        if (wallCursorZ === 0) {
          wallCursorZ = targetCornerZ + (hasBaseCorner ? cornerD : D_WALL_STD);
        }
        const isTurnLeft = isBaseTurnLeft || u.orientation === "corner-left";
        const cWallOuterX = targetCornerX || (wallCursorX || D_WALL_STD);
        const cz = wallCursorZ + uW / 2;
        wallCursorZ += uW;
        const cx = isTurnLeft
          ? (cWallOuterX - (hasBaseCorner ? cornerW : uD) + uD / 2)
          : (cWallOuterX - uD / 2);
        const rotY = isTurnLeft ? Math.PI / 2 : -Math.PI / 2;

        layoutWallItems.push({
          unit: u,
          pos: [cx, unitWallY, cz],
          rotY,
          uW,
          uH,
          uD,
          isCorner: false,
          runIndex: 1,
        });
      }
    }

    // Centering calculation: offset entire assembly so visual center is at (0, 0, 0)
    let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity;
    for (const item of layoutBaseItems) {
      if (item.isCorner) {
        bMinX = Math.min(bMinX, item.pos[0] - item.uW / 2);
        bMaxX = Math.max(bMaxX, item.pos[0] + item.uW / 2);
        bMinZ = Math.min(bMinZ, item.pos[2] - item.uD / 2);
        bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uD / 2);
      } else if (item.runIndex === 0) {
        bMinX = Math.min(bMinX, item.pos[0] - item.uW / 2);
        bMaxX = Math.max(bMaxX, item.pos[0] + item.uW / 2);
        bMinZ = Math.min(bMinZ, item.pos[2] - item.uD / 2);
        bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uD / 2);
      } else {
        bMinX = Math.min(bMinX, item.pos[0] - item.uD / 2);
        bMaxX = Math.max(bMaxX, item.pos[0] + item.uD / 2);
        bMinZ = Math.min(bMinZ, item.pos[2] - item.uW / 2);
        bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uW / 2);
      }
    }
    if (layoutBaseItems.length === 0) {
      for (const item of layoutWallItems) {
        if (item.isCorner) {
          bMinX = Math.min(bMinX, item.pos[0] - item.uW / 2);
          bMaxX = Math.max(bMaxX, item.pos[0] + item.uW / 2);
          bMinZ = Math.min(bMinZ, item.pos[2] - item.uD / 2);
          bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uD / 2);
        } else if (item.runIndex === 0) {
          bMinX = Math.min(bMinX, item.pos[0] - item.uW / 2);
          bMaxX = Math.max(bMaxX, item.pos[0] + item.uW / 2);
          bMinZ = Math.min(bMinZ, item.pos[2] - item.uD / 2);
          bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uD / 2);
        } else {
          bMinX = Math.min(bMinX, item.pos[0] - item.uD / 2);
          bMaxX = Math.max(bMaxX, item.pos[0] + item.uD / 2);
          bMinZ = Math.min(bMinZ, item.pos[2] - item.uW / 2);
          bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uW / 2);
        }
      }
    }
    if (!isFinite(bMinX)) { bMinX = 0; bMaxX = 0; bMinZ = 0; bMaxZ = 0; }
    const centerOffX = (bMinX + bMaxX) / 2;
    const centerOffZ = (bMinZ + bMaxZ) / 2;

    // Apply centering offset to base items and wall items
    const centeredBaseItems = layoutBaseItems.map((item) => ({
      ...item,
      pos: [item.pos[0] - centerOffX, item.pos[1], item.pos[2] - centerOffZ] as [number, number, number],
    }));

    const centeredWallItems = layoutWallItems.map((item) => ({
      ...item,
      pos: [item.pos[0] - centerOffX, item.pos[1], item.pos[2] - centerOffZ] as [number, number, number],
    }));

    // Multi-Selection helper handler
    const handleUnitSelect = (e: { stopPropagation: () => void; shiftKey?: boolean }, unitId: string) => {
      e.stopPropagation();
      if (e.shiftKey) {
        const cur = selectedUnitIds;
        const next = cur.includes(unitId)
          ? cur.filter((id) => id !== unitId)
          : [...cur, unitId];
        const finalIds = next.length > 0 ? next : [unitId];
        if (onSelectUnits) {
          onSelectUnits(finalIds);
        } else {
          onSelectUnit?.(finalIds[finalIds.length - 1]);
        }
      } else {
        if (onSelectUnits) {
          onSelectUnits([unitId]);
        } else {
          onSelectUnit?.(unitId);
        }
      }
    };

    return (
      <group>
        {/* Continuous Plinth Boards Underneath */}
        {centeredBaseItems.length > 0 && plinthH > 0 && baseType === "plinth" && (
          <group>
            {centeredBaseItems.map((item, bi) => {
              const uMat = getUnitMaterial(item.unit.materialType);
              if (item.isCorner) {
                // L-Corner Plinth
                const armD = (item.unit.cornerDepth || 600) / 1000;
                const w1 = item.uW - armD + 0.04;
                const d1 = item.uD - armD + 0.04;
                return (
                  <group key={`corPlinth-${bi}`} position={item.pos}>
                    <mesh position={[-item.uW / 2 + (item.uW - armD) / 2, -plinthH / 2, -item.uD / 2 + armD - plinthRec]} material={uMat}>
                      <boxGeometry args={[w1, plinthH, 0.018]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    <mesh position={[item.uW / 2 - armD + plinthRec, -plinthH / 2, item.uD / 2 - (item.uD - armD) / 2]} material={uMat}>
                      <boxGeometry args={[0.018, plinthH, d1]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                  </group>
                );
              } else if (item.runIndex === 0) {
                // Plinth along Run 0
                return (
                  <mesh
                    key={`plinthRun0-${bi}`}
                    position={[item.pos[0], plinthH / 2, item.pos[2] + item.uD / 2 - plinthRec]}
                    material={uMat}
                    castShadow
                  >
                    <boxGeometry args={[item.uW - 0.005, plinthH, 0.018]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                );
              } else {
                // Plinth along Run 1 (facing -X)
                return (
                  <mesh
                    key={`plinthRun1-${bi}`}
                    position={[item.pos[0] - item.uD / 2 + plinthRec, plinthH / 2, item.pos[2]]}
                    material={uMat}
                    castShadow
                  >
                    <boxGeometry args={[0.018, plinthH, item.uW - 0.005]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                );
              }
            })}
          </group>
        )}

        {/* Corner Feet / Legs Mode */}
        {centeredBaseItems.length > 0 && plinthH > 0 && baseType === "legs" && (
          <group>
            {centeredBaseItems.map((item, bi) => {
              const uW = item.uW;
              const uD = item.uD;
              const legInsetX = 0.045;
              const legInsetZFront = plinthRec + 0.02;
              const legInsetZBack = 0.045;
              const legPositions: [number, number][] = [
                [-uW / 2 + legInsetX, uD / 2 - legInsetZFront],
                [uW / 2 - legInsetX, uD / 2 - legInsetZFront],
                [-uW / 2 + legInsetX, -uD / 2 + legInsetZBack],
                [uW / 2 - legInsetX, -uD / 2 + legInsetZBack],
              ];
              return (
                <group key={`legs-${bi}`} position={item.pos} rotation={[0, item.rotY, 0]}>
                  {legPositions.map(([lx, lz], li) => (
                    <group key={`leg-${bi}-${li}`} position={[lx, -plinthH, lz]}>
                      <mesh position={[0, plinthH / 2, 0]} material={chromeMaterial} castShadow>
                        <cylinderGeometry args={[0.02, 0.02, plinthH, 16]} />
                      </mesh>
                      <mesh position={[0, 0.005, 0]} material={chromeMaterial}>
                        <cylinderGeometry args={[0.026, 0.026, 0.01, 16]} />
                      </mesh>
                    </group>
                  ))}
                </group>
              );
            })}
          </group>
        )}

        {/* Continuous Countertop (Tezgah) Spanning Across All Base Cabinets */}
        {centeredBaseItems.length > 0 && (
          <group>
            {centeredBaseItems.map((item, ci) => {
              const ctY = plinthH + item.uH + countertopThick / 2;
              if (item.isCorner) {
                // L-Corner Countertop (Run 0 part + Turned part)
                const armD = (item.unit.cornerDepth || 600) / 1000;
                return (
                  <group key={`ctCorner-${ci}`}>
                    <mesh
                      position={[item.pos[0], ctY, item.pos[2] - item.uD / 2 + (armD + 0.02) / 2]}
                      material={countertopMaterial}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[item.uW, countertopThick, armD + 0.02]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    <mesh
                      position={[
                        item.pos[0] + item.uW / 2 - (armD + 0.02) / 2,
                        ctY,
                        item.pos[2] - item.uD / 2 + armD + (item.uD - armD) / 2,
                      ]}
                      material={countertopMaterial}
                      castShadow
                      receiveShadow
                    >
                      <boxGeometry args={[armD + 0.02, countertopThick, item.uD - armD]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                  </group>
                );
              } else if (item.runIndex === 0) {
                // Straight Run 0: 20mm front overhang towards +Z
                return (
                  <mesh
                    key={`ctRun0-${ci}`}
                    position={[item.pos[0], ctY, item.pos[2] + 0.01]}
                    material={countertopMaterial}
                    castShadow
                    receiveShadow
                  >
                    <boxGeometry args={[item.uW, countertopThick, item.uD + 0.02]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                );
              } else {
                // Turned Run 1: 20mm overhang into room
                const isTurnLeft = item.rotY > 0;
                const offX = isTurnLeft ? 0.01 : -0.01;
                return (
                  <mesh
                    key={`ctRun1-${ci}`}
                    position={[item.pos[0] + offX, ctY, item.pos[2]]}
                    material={countertopMaterial}
                    castShadow
                    receiveShadow
                  >
                    <boxGeometry args={[item.uD + 0.02, countertopThick, item.uW]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                );
              }
            })}
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* RENDER ALL BASE CABINET UNITS (Straight & L-Corner)           */}
        {/* ------------------------------------------------------------- */}
        {centeredBaseItems.map((item, ui) => {
          const { unit, pos, rotY, uW, uH, uD, isCorner } = item;
          const uMat = getUnitMaterial(unit.materialType);
          const isSelected = selectedUnitIds.includes(unit.id);
          const isHovered = hoveredUnit === unit.id;
          const unitDoorAngle = unit.doorOpenPercent !== undefined
            ? ((unit.doorOpenPercent) / 100) * ((85 * Math.PI) / 180)
            : globalAngleRad;

          const innerH = uH - t * 2;
          const innerD = uD - 0.02;

          // Uneven Drawer Heights Calculation
          let drawerHeightsArr: number[] = [];
          if (unit.drawerCount > 0) {
            if (unit.drawerHeights && unit.drawerHeights.length === unit.drawerCount) {
              drawerHeightsArr = unit.drawerHeights.map((dh) => dh / 1000);
            } else if (unit.drawerHeightsMode === "standard" && unit.drawerCount === 3) {
              drawerHeightsArr = [0.14, (innerH - 0.14) / 2, (innerH - 0.14) / 2];
            } else {
              drawerHeightsArr = Array(unit.drawerCount).fill(innerH / unit.drawerCount);
            }
          }

          if (isCorner) {
            // =========================================================
            // 90° CORNER BASE CABINET RENDERER
            // =========================================================
            return (
              <group
                key={unit.id}
                userData={{ unitId: unit.id, unitName: unit.name }}
                position={pos}
                rotation={[0, rotY, 0]}
                onClick={(e) => handleUnitSelect(e, unit.id)}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  handleHoverCabinet(unit.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  handleLeaveCabinet();
                }}
              >
                {/* Active Multi-Selection Bounding Wireframe & Glow */}
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.015, uH + 0.015, uD + 0.015]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
                  </mesh>
                )}

                {/* Multi-Selection Badge Tag */}
                {isSelected && selectedUnitIds.length > 1 && (
                  <Html position={[0, uH + 0.08, 0]} center>
                    <span style={{
                      background: "rgba(2, 132, 199, 0.95)",
                      color: "#fff",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      whiteSpace: "nowrap",
                    }}>
                      ✓ {unit.name}
                    </span>
                  </Html>
                )}

                {/* Carcase Panels - L-Shaped Bottom */}
                {(() => {
                  const armD = (unit.cornerDepth || 600) / 1000;
                  return (
                    <>
                      <mesh position={[0, t / 2, -uD / 2 + armD / 2]} material={uMat} castShadow>
                        <boxGeometry args={[uW, t, armD]} />
                        <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                      </mesh>
                      <mesh position={[uW / 2 - armD / 2, t / 2, -uD / 2 + armD + (uD - armD) / 2]} material={uMat} castShadow>
                        <boxGeometry args={[armD, t, uD - armD]} />
                        <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                      </mesh>

                      {/* Carcase Panels - Top Stretchers / Countertop Support */}
                      <mesh position={[0, uH - t / 2, -uD / 2 + armD / 2]} material={uMat} castShadow>
                        <boxGeometry args={[uW, t, armD]} />
                        <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                      </mesh>
                      <mesh position={[uW / 2 - armD / 2, uH - t / 2, -uD / 2 + armD + (uD - armD) / 2]} material={uMat} castShadow>
                        <boxGeometry args={[armD, t, uD - armD]} />
                        <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                      </mesh>

                      {/* Outer Left Side End (Joint to Run 0) */}
                      <mesh position={[-uW / 2 + t / 2, uH / 2, -uD / 2 + armD / 2]} material={uMat} castShadow>
                        <boxGeometry args={[t, uH - t * 2, armD]} />
                        <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                      </mesh>

                      {/* Outer Turned Side End (Joint to Run 1) */}
                      <mesh position={[uW / 2 - armD / 2, uH / 2, uD / 2 - t / 2]} material={uMat} castShadow>
                        <boxGeometry args={[armD, uH - t * 2, t]} />
                        <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                      </mesh>

                      {/* Solid Back Wall 1 (along X) */}
                      {(unit.hasBackPanel !== false) && (
                        <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={uMat}>
                          <boxGeometry args={[uW - t * 2, uH - t * 2, 0.01]} />
                          <Edges threshold={15} color={edgeColor} />
                        </mesh>
                      )}

                      {/* Solid Back Wall 2 (along Z) */}
                      {(unit.hasBackPanel !== false) && (
                        <mesh position={[uW / 2 - 0.005, uH / 2, 0]} material={uMat}>
                          <boxGeometry args={[0.01, uH - t * 2, uD - t * 2]} />
                          <Edges threshold={15} color={edgeColor} />
                        </mesh>
                      )}

                      {/* Internal L-Corner Shelf */}
                      {unit.internalShelves > 0 && (
                        <group position={[0, uH / 2, 0]}>
                          <mesh position={[0, 0, -uD / 2 + armD / 2]} material={uMat}>
                            <boxGeometry args={[uW - t * 2, t, armD - 0.03]} />
                            <Edges threshold={15} color={edgeColor} />
                          </mesh>
                          <mesh position={[uW / 2 - armD / 2, 0, -uD / 2 + armD + (uD - armD) / 2]} material={uMat}>
                            <boxGeometry args={[armD - 0.03, t, uD - armD - 0.01]} />
                            <Edges threshold={15} color={edgeColor} />
                          </mesh>
                        </group>
                      )}

                      {/* Corner Doors: 2 Doors Meeting at the Inside Corner */}
                      {unit.doorType !== "none" && (
                        <group>
                          {/* Door 1: Facing +Z (hinged at left) */}
                          <group
                            position={[-uW / 2 + t, uH / 2, -uD / 2 + armD + 0.009]}
                            rotation={[0, -unitDoorAngle, 0]}
                          >
                            <ArchitecturalDoorMesh
                              width={uW - armD - 0.008}
                              height={innerH}
                              thickness={0.018}
                              doorStyle={unit.doorStyle || params.doorStyle}
                              material={uMat}
                              frameMaterial={handleMaterial}
                              handleType={unit.handleType}
                              edgeColor={edgeColor}
                              isSelected={isSelected}
                              position={[(uW - armD - 0.008) / 2, 0, 0]}
                            />
                            {renderHandle([uW - armD - 0.035, innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { doorHeight: innerH })}
                          </group>

                          {/* Door 2: Facing -X (hinged at turned top) */}
                          <group
                            position={[uW / 2 - armD - 0.009, uH / 2, uD / 2 - t]}
                            rotation={[0, unitDoorAngle, 0]}
                          >
                            <ArchitecturalDoorMesh
                              width={uD - armD - 0.008}
                              height={innerH}
                              thickness={0.018}
                              doorStyle={unit.doorStyle || params.doorStyle}
                              material={uMat}
                              frameMaterial={handleMaterial}
                              handleType={unit.handleType}
                              edgeColor={edgeColor}
                              isSelected={isSelected}
                              position={[0, 0, -(uD - armD - 0.008) / 2]}
                              rotation={[0, Math.PI / 2, 0]}
                            />
                            {renderHandle([-0.02, innerH * 0.25, -(uD - armD - 0.035)], true, 0, unit.handleType, unit.handleFinish, { doorHeight: innerH })}
                          </group>
                        </group>
                      )}
                    </>
                  );
                })()}

                {/* Left Snap Detector on Run 0 */}
                {activeTool === "add-base" && isHovered && (
                  <group position={[-uW / 2 - 0.04, uH / 2, -uD / 2 + D_STD / 2]}>
                    <mesh
                      onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "left" }); }}
                      onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                    >
                      <boxGeometry args={[0.08, uH, D_STD]} />
                      <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} />
                      <Edges threshold={1} color="#38bdf8" />
                    </mesh>
                    <Html position={[0, 0, D_STD / 2 + 0.04]} center>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "left");
                        }}
                        style={{
                          background: "#2972f5",
                          color: "#fff",
                          padding: "4px 9px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                          border: "1px solid rgba(255,255,255,0.3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ➕ Add Base Left
                      </div>
                    </Html>
                  </group>
                )}

                {/* Hover Action: Continue Run 1 along Turned Z */}
                {activeTool === "add-base" && isHovered && (
                  <group position={[uW / 2 - D_STD / 2, uH / 2, uD / 2 + 0.08]}>
                    <Html center>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "right");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff",
                          padding: "5px 11px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(16,185,129,0.7)",
                          border: "1px solid rgba(255,255,255,0.4)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ➕ Click to Place Base on Turned Run
                      </div>
                    </Html>
                  </group>
                )}

                {/* Place Corner Wall Unit Above */}
                {activeTool === "add-wall" && isHovered && (
                  <group position={[0, uH + 0.35, 0]}>
                    <mesh
                      onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "top" }); }}
                      onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                    >
                      <boxGeometry args={[0.6, 0.3, 0.6]} />
                      <meshBasicMaterial color="#c084fc" transparent opacity={0.3} />
                      <Edges threshold={1} color="#c084fc" />
                    </mesh>
                    <Html position={[0, 0, 0.35]} center>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "top");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                          color: "#fff",
                          padding: "5px 11px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(168,85,247,0.7)",
                          border: "1px solid rgba(255,255,255,0.4)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ➕ Place 90° Corner Wall Above
                      </div>
                    </Html>
                  </group>
                )}
              </group>
            );
          }

          // =========================================================
          // STRAIGHT BASE CABINET RENDERER
          // =========================================================
          const prevItem = centeredBaseItems[ui - 1];
          const nextItem = centeredBaseItems[ui + 1];

          let effectiveAngle = unitDoorAngle;
          if (prevItem && !prevItem.isCorner && unit.doorType === "singleLeft" && prevItem.unit.doorType !== "none" && unitDoorAngle > 0) {
            effectiveAngle = Math.min(unitDoorAngle, (75 * Math.PI) / 180);
          }
          if (nextItem && !nextItem.isCorner && unit.doorType === "singleRight" && nextItem.unit.doorType !== "none" && unitDoorAngle > 0) {
            effectiveAngle = Math.min(unitDoorAngle, (75 * Math.PI) / 180);
          }

          return (
            <group
              key={unit.id}
              userData={{ unitId: unit.id, unitName: unit.name }}
              position={pos}
              rotation={[0, rotY, 0]}
              onClick={(e) => handleUnitSelect(e, unit.id)}
              onPointerOver={(e) => {
                e.stopPropagation();
                handleHoverCabinet(unit.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                handleLeaveCabinet();
              }}
            >
              {/* Active Selection Outline Highlight */}
              {isSelected && (
                <mesh position={[0, uH / 2, 0]}>
                  <boxGeometry args={[uW + 0.015, uH + 0.015, uD + 0.015]} />
                  <Edges threshold={1} color="#38bdf8" />
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
                </mesh>
              )}

              {/* Multi-Selection Badge Tag */}
              {isSelected && selectedUnitIds.length > 1 && (
                <Html position={[0, uH + 0.08, 0]} center>
                  <span style={{
                    background: "rgba(2, 132, 199, 0.95)",
                    color: "#fff",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    whiteSpace: "nowrap",
                  }}>
                    ✓ {unit.name}
                  </span>
                </Html>
              )}

              {/* Carcase Panels - Turkish 18mm MDF-Lam standard joinery */}
              {/* Left Gable (Runs full height uH) */}
              <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={uMat} castShadow>
                <boxGeometry args={[t, uH, uD]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Right Gable (Runs full height uH) */}
              <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={uMat} castShadow>
                <boxGeometry args={[t, uH, uD]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Bottom Panel (Sits between side gables) */}
              <mesh position={[0, t / 2, 0]} material={uMat} castShadow>
                <boxGeometry args={[uW - t * 2, t, uD]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Top Stretchers: 2x 80mm deep stretchers (ön ve arka üst kayıt) */}
              {/* Front Top Stretcher */}
              <mesh position={[0, uH - t / 2, uD / 2 - 0.04]} material={uMat} castShadow>
                <boxGeometry args={[uW - t * 2, t, 0.08]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Back Top Stretcher */}
              <mesh position={[0, uH - t / 2, -uD / 2 + 0.04]} material={uMat} castShadow>
                <boxGeometry args={[uW - t * 2, t, 0.08]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* 8mm Back Panel (Arkalık: inset 18mm from rear edge in grooved channel) */}
              {(unit.hasBackPanel !== false) && (
                <mesh position={[0, uH / 2, -uD / 2 + 0.018 + 0.004]} material={uMat}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.008]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              )}

              {/* Internal Shelves */}
              {unit.drawerCount === 0 && (unit.internalShelves ?? 0) > 0 &&
                Array.from({ length: unit.internalShelves ?? 0 }).map((_, si) => {
                  const count = unit.internalShelves ?? 0;
                  const shelfSpacing = innerH / (count + 1);
                  const shelfY = t + (si + 1) * shelfSpacing;
                  const isDivSelected =
                    selectedDivision?.unitId === unit.id &&
                    selectedDivision?.type === "shelf" &&
                    selectedDivision?.index === si;

                  return (
                    <group key={`shelf-${si}`} position={[0, shelfY, 0.005]}>
                      <mesh
                        material={uMat}
                        onClick={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            onSelectDivision?.({ unitId: unit.id, type: "shelf", index: si });
                          }
                        }}
                        onPointerOver={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            document.body.style.cursor = "pointer";
                          }
                        }}
                        onPointerOut={() => {
                          document.body.style.cursor = "default";
                        }}
                      >
                        <boxGeometry args={[uW - t * 2, t, uD - 0.045]} />
                        <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                        {isDivSelected && (
                          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                        )}
                      </mesh>
                      {isDivSelected && (
                        <Html position={[0, 0.04, innerD * 0.4]} center>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveDivision?.({ unitId: unit.id, type: "shelf", index: si });
                            }}
                            style={{
                              background: "linear-gradient(135deg, #ef4444, #dc2626)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.4)",
                              borderRadius: "5px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 12px rgba(220,38,38,0.6)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🗑️ Delete Shelf {si + 1}
                          </button>
                        </Html>
                      )}
                    </group>
                  );
                })}

              {/* Uneven Drawers */}
              {unit.drawerCount > 0 &&
                (() => {
                  let accY = t;
                  const slideDist = ((drawerOpenPercent || 0) / 100) * (uD * 0.6);

                  return drawerHeightsArr.map((dh, dxi) => {
                    const centerY = accY + dh / 2;
                    accY += dh;

                    return (
                      <group
                        key={`unevenDrawer-${dxi}`}
                        position={[0, centerY, uD / 2 + slideDist]}
                      >
                        <ArchitecturalDoorMesh
                          width={uW - 0.008}
                          height={dh - 0.006}
                          thickness={0.018}
                          doorStyle={unit.doorStyle || params.doorStyle}
                          material={uMat}
                          frameMaterial={handleMaterial}
                          handleType={unit.handleType}
                          edgeColor={edgeColor}
                          isSelected={isSelected}
                        />
                        {/* Drawer pull handle */}
                        {unit.handleType !== "cncJProfile" &&
                          renderHandle([0, 0, 0.02], false, 0, unit.handleType, unit.handleFinish, { drawerWidth: uW })}
                      </group>
                    );
                  });
                })()}

              {/* Cabinet Hinged Doors - Full Overlay: doorH = uH - 0.004 */}
              {unit.drawerCount === 0 && unit.doorType !== "none" && (() => {
                const doorH = uH - 0.004;
                return (
                  <group>
                    {unit.doorType === "singleLeft" ? (
                      <group
                        position={[-uW / 2 + 0.004, uH / 2, uD / 2]}
                        rotation={[0, -effectiveAngle, 0]}
                      >
                        <ArchitecturalDoorMesh
                          width={uW - 0.008}
                          height={doorH}
                          thickness={0.018}
                          doorStyle={unit.doorStyle || params.doorStyle}
                          material={uMat}
                          frameMaterial={handleMaterial}
                          handleType={unit.handleType}
                          edgeColor={edgeColor}
                          isSelected={isSelected}
                          position={[(uW - 0.008) / 2, 0, 0.009]}
                        />
                        {renderHandle([uW - 0.04, doorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { doorHeight: doorH })}
                      </group>
                    ) : unit.doorType === "singleRight" ? (
                      <group
                        position={[uW / 2 - 0.004, uH / 2, uD / 2]}
                        rotation={[0, effectiveAngle, 0]}
                      >
                        <ArchitecturalDoorMesh
                          width={uW - 0.008}
                          height={doorH}
                          thickness={0.018}
                          doorStyle={unit.doorStyle || params.doorStyle}
                          material={uMat}
                          frameMaterial={handleMaterial}
                          handleType={unit.handleType}
                          edgeColor={edgeColor}
                          isSelected={isSelected}
                          position={[-(uW - 0.008) / 2, 0, 0.009]}
                        />
                        {renderHandle([-uW + 0.04, doorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { isRightDoor: true, doorHeight: doorH })}
                      </group>
                    ) : unit.doorType === "double" ? (
                      <group>
                        <group position={[-uW / 2 + 0.004, uH / 2, uD / 2]} rotation={[0, -effectiveAngle, 0]}>
                          <ArchitecturalDoorMesh
                            width={uW / 2 - 0.006}
                            height={doorH}
                            thickness={0.018}
                            doorStyle={unit.doorStyle || params.doorStyle}
                            material={uMat}
                            frameMaterial={handleMaterial}
                            handleType={unit.handleType}
                            edgeColor={edgeColor}
                            isSelected={isSelected}
                            position={[(uW / 2 - 0.006) / 2, 0, 0.009]}
                          />
                          {renderHandle([uW / 2 - 0.035, doorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { isRightDoor: false, doorHeight: doorH })}
                        </group>
                        <group position={[uW / 2 - 0.004, uH / 2, uD / 2]} rotation={[0, effectiveAngle, 0]}>
                          <ArchitecturalDoorMesh
                            width={uW / 2 - 0.006}
                            height={doorH}
                            thickness={0.018}
                            doorStyle={unit.doorStyle || params.doorStyle}
                            material={uMat}
                            frameMaterial={handleMaterial}
                            handleType={unit.handleType}
                            edgeColor={edgeColor}
                            isSelected={isSelected}
                            position={[-(uW / 2 - 0.006) / 2, 0, 0.009]}
                          />
                          {renderHandle([-uW / 2 + 0.035, doorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { isRightDoor: true, doorHeight: doorH })}
                        </group>
                      </group>
                    ) : null}
                  </group>
                );
              })()}

              {/* Add Adjacent Unit / Division Snapping on Hover */}
              {activeTool === "add-base" && isHovered && (
                <group>
                  {/* Left Snap Detector (Places unit to the left of this cabinet) */}
                  <group position={[-uW / 2 - 0.04, uH / 2, 0]}>
                    <mesh
                      onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "left" }); }}
                      onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                    >
                      <boxGeometry args={[0.08, uH, uD]} />
                      <meshBasicMaterial color="#38bdf8" transparent opacity={hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "left" ? 0.35 : 0.12} />
                      <Edges threshold={1} color="#38bdf8" />
                    </mesh>
                    <Html position={[0, 0, uD / 2 + 0.04]} center>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "left");
                        }}
                        style={{
                          background: "#2972f5",
                          color: "#fff",
                          padding: "4px 9px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                          border: "1px solid rgba(255,255,255,0.3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ➕ Add Base Left
                      </div>
                    </Html>
                  </group>

                  {/* Right Snap Detector (Continues current run) */}
                  <group position={[uW / 2 + 0.04, uH / 2, 0]}>
                    <mesh
                      onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "right" }); }}
                      onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                    >
                      <boxGeometry args={[0.08, uH, uD]} />
                      <meshBasicMaterial color="#38bdf8" transparent opacity={hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "right" ? 0.35 : 0.12} />
                      <Edges threshold={1} color="#38bdf8" />
                    </mesh>
                    <Html position={[0, 0, uD / 2 + 0.04]} center>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddAdjacentUnit?.(unit.id, "right");
                          }}
                          style={{
                            background: "#2972f5",
                            color: "#fff",
                            padding: "4px 9px",
                            borderRadius: "5px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                            border: "1px solid rgba(255,255,255,0.3)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ➕ Add Base Right
                        </div>
                        {item.runIndex === 0 && !centeredBaseItems.some((b) => b.isCorner) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddAdjacentUnit?.(unit.id, "right"); // Will be converted or placed as corner
                            }}
                            style={{
                              background: "linear-gradient(135deg, #10b981, #059669)",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 14px rgba(16,185,129,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🔄 Add 90° L-Turn
                          </div>
                        )}
                      </div>
                    </Html>
                  </group>
                </group>
              )}

              {/* Place Wall Unit above this Base Cabinet */}
              {activeTool === "add-wall" && isHovered && (
                <group position={[0, uH + 0.35, 0]}>
                  <mesh
                    onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "top" }); }}
                    onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                  >
                    <boxGeometry args={[uW, 0.3, D_WALL_STD]} />
                    <meshBasicMaterial color="#c084fc" transparent opacity={hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "top" ? 0.4 : 0.15} />
                    <Edges threshold={1} color="#c084fc" />
                  </mesh>
                  <Html position={[0, 0, D_WALL_STD / 2 + 0.04]} center>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAdjacentUnit?.(unit.id, "top");
                      }}
                      style={{
                        background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                        color: "#fff",
                        padding: "5px 11px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(168,85,247,0.7)",
                        border: "1px solid rgba(255,255,255,0.4)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ➕ Place Wall Unit Above
                    </div>
                  </Html>
                </group>
              )}

              {/* Mode 2: Vertical Division on Hover */}
              {activeTool === "add-v-division" && isHovered && (
                <group>
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[0.018, uH - t * 2, innerD]} />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                    <Edges threshold={1} color="#38bdf8" />
                  </mesh>
                  <Html position={[0, uH + 0.04, uD / 2]} center>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddDivision?.(unit.id, "vertical");
                      }}
                      style={{
                        background: "linear-gradient(135deg, #0284c7, #2563eb)",
                        color: "#fff",
                        padding: "4px 9px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(2,132,199,0.7)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ➗ Click to Add Vertical Split
                    </div>
                  </Html>
                </group>
              )}

              {/* Mode 3: Horizontal Division (Shelf) on Hover */}
              {activeTool === "add-h-division" && isHovered && (
                <group>
                  {(() => {
                    const nextCount = (unit.internalShelves ?? 0) + 1;
                    const previewY = t + ((uH - t * 2) / (nextCount + 1)) * nextCount;
                    return (
                      <group position={[0, previewY, 0]}>
                        <mesh>
                          <boxGeometry args={[uW - t * 2, 0.018, innerD]} />
                          <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
                          <Edges threshold={1} color="#10b981" />
                        </mesh>
                        <Html position={[0, 0.04, uD / 2]} center>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddDivision?.(unit.id, "horizontal");
                            }}
                            style={{
                              background: "linear-gradient(135deg, #059669, #10b981)",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 12px rgba(16,185,129,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            📚 Click to Add Shelf (#{nextCount})
                          </div>
                        </Html>
                      </group>
                    );
                  })()}
                </group>
              )}
            </group>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* RENDER UPPER WALL CABINETS (With Individual Materials)        */}
        {/* ------------------------------------------------------------- */}
        {centeredWallItems.map((item) => {
          const unit = item.unit;
          const uW = item.uW;
          const uH = item.uH;
          const uD = item.uD;

          const uMat = getUnitMaterial(unit.materialType);
          const isSelected = selectedUnitIds.includes(unit.id);
          const isHovered = hoveredUnit === unit.id;
          const innerH = uH - t * 2;
          const wallDoorH = uH - 0.004;
          const unitDoorAngle = unit.doorOpenPercent !== undefined
            ? ((unit.doorOpenPercent) / 100) * ((85 * Math.PI) / 180)
            : globalAngleRad;

          return (
            <group
              key={unit.id}
              userData={{ unitId: unit.id, unitName: unit.name }}
              position={item.pos}
              rotation={[0, item.rotY, 0]}
              onClick={(e) => handleUnitSelect(e, unit.id)}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredUnit(unit.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                if (hoveredUnit === unit.id) setHoveredUnit(null);
              }}
            >
              {/* Active Selection Outline Highlight */}
              {isSelected && (
                <mesh position={[0, uH / 2, 0]}>
                  <boxGeometry args={[uW + 0.015, uH + 0.015, uD + 0.015]} />
                  <Edges threshold={1} color="#38bdf8" />
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
                </mesh>
              )}

              {/* Multi-Selection Badge Tag */}
              {isSelected && selectedUnitIds.length > 1 && (
                <Html position={[0, uH + 0.08, 0]} center>
                  <span style={{
                    background: "rgba(2, 132, 199, 0.95)",
                    color: "#fff",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    whiteSpace: "nowrap",
                  }}>
                    ✓ {unit.name}
                  </span>
                </Html>
              )}

              {item.isCorner ? (
                /* ------------------------------------------------------------- */
                /* 90° CORNER WALL CABINET (L-Shape Arm Depth 350mm)             */
                /* ------------------------------------------------------------- */
                <group>
                  {(() => {
                    const armD = (unit.cornerDepth || 350) / 1000;
                    return (
                      <>
                        {/* L-Shaped Bottom Panel */}
                        <mesh position={[0, t / 2, -uD / 2 + armD / 2]} material={uMat} castShadow>
                          <boxGeometry args={[uW - t * 2, t, armD]} />
                          <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                        </mesh>
                        <mesh position={[uW / 2 - armD / 2, t / 2, -uD / 2 + armD + (uD - armD) / 2]} material={uMat} castShadow>
                          <boxGeometry args={[armD - t, t, uD - armD]} />
                          <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                        </mesh>

                        {/* L-Shaped Solid Top Panel */}
                        <mesh position={[0, uH - t / 2, -uD / 2 + armD / 2]} material={uMat} castShadow>
                          <boxGeometry args={[uW - t * 2, t, armD]} />
                          <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                        </mesh>
                        <mesh position={[uW / 2 - armD / 2, uH - t / 2, -uD / 2 + armD + (uD - armD) / 2]} material={uMat} castShadow>
                          <boxGeometry args={[armD - t, t, uD - armD]} />
                          <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                        </mesh>

                        {/* Outer Left Side Gable (Joint to Run 0) */}
                        <mesh position={[-uW / 2 + t / 2, uH / 2, -uD / 2 + armD / 2]} material={uMat} castShadow>
                          <boxGeometry args={[t, uH, armD]} />
                          <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                        </mesh>

                        {/* Outer Turned Side Gable (Joint to Run 1) */}
                        <mesh position={[uW / 2 - armD / 2, uH / 2, uD / 2 - t / 2]} material={uMat} castShadow>
                          <boxGeometry args={[armD, uH, t]} />
                          <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                        </mesh>

                        {/* 8mm Back Wall 1 (along X, recessed 18mm) */}
                        {unit.hasBackPanel !== false && (
                          <mesh position={[0, uH / 2, -uD / 2 + 0.018 + 0.004]} material={uMat}>
                            <boxGeometry args={[uW - t * 2, uH - t * 2, 0.008]} />
                            <Edges threshold={15} color={edgeColor} />
                          </mesh>
                        )}

                        {/* 8mm Back Wall 2 (along Z, recessed 18mm) */}
                        {unit.hasBackPanel !== false && (
                          <mesh position={[uW / 2 - 0.018 - 0.004, uH / 2, 0]} material={uMat}>
                            <boxGeometry args={[0.008, uH - t * 2, uD - t * 2]} />
                            <Edges threshold={15} color={edgeColor} />
                          </mesh>
                        )}

                        {/* Internal L-Corner Shelves */}
                        {unit.internalShelves > 0 &&
                          Array.from({ length: unit.internalShelves }).map((_, si) => {
                            const shelfSpacing = innerH / (unit.internalShelves + 1);
                            const sy = t + (si + 1) * shelfSpacing;
                            return (
                              <group key={`cornerWallShelf-${si}`} position={[0, sy, 0]}>
                                <mesh position={[0, 0, -uD / 2 + armD / 2]} material={uMat}>
                                  <boxGeometry args={[uW - t * 2, t, armD - 0.045]} />
                                  <Edges threshold={15} color={edgeColor} />
                                </mesh>
                                <mesh position={[uW / 2 - armD / 2, 0, -uD / 2 + armD + (uD - armD) / 2]} material={uMat}>
                                  <boxGeometry args={[armD - 0.045, t, uD - armD - 0.01]} />
                                  <Edges threshold={15} color={edgeColor} />
                                </mesh>
                              </group>
                            );
                          })}

                        {/* Corner Wall Doors: 2 Doors Meeting at 90° Inside Corner */}
                        {unit.doorType !== "none" && (
                          <group>
                            {/* Door 1: Facing +Z (hinged at left gable) */}
                            <group
                              position={[-uW / 2 + t, uH / 2, -uD / 2 + armD + 0.009]}
                              rotation={[0, -unitDoorAngle, 0]}
                            >
                              <ArchitecturalDoorMesh
                                width={uW - armD - 0.004}
                                height={wallDoorH}
                                thickness={0.018}
                                doorStyle={unit.doorStyle || params.doorStyle}
                                material={uMat}
                                frameMaterial={handleMaterial}
                                handleType={unit.handleType}
                                edgeColor={edgeColor}
                                isSelected={isSelected}
                                invertY={true}
                                position={[(uW - armD - 0.004) / 2, 0, 0]}
                              />
                              {renderHandle([uW - armD - 0.04, -wallDoorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { doorHeight: wallDoorH })}
                            </group>

                            {/* Door 2: Facing -X (hinged at turned gable) */}
                            <group
                              position={[uW / 2 - armD - 0.009, uH / 2, uD / 2 - t]}
                              rotation={[0, unitDoorAngle, 0]}
                            >
                              <ArchitecturalDoorMesh
                                width={uD - armD - 0.004}
                                height={wallDoorH}
                                thickness={0.018}
                                doorStyle={unit.doorStyle || params.doorStyle}
                                material={uMat}
                                frameMaterial={handleMaterial}
                                handleType={unit.handleType}
                                edgeColor={edgeColor}
                                isSelected={isSelected}
                                invertY={true}
                                position={[0, 0, -(uD - armD - 0.004) / 2]}
                                rotation={[0, Math.PI / 2, 0]}
                              />
                              {renderHandle([0.02, -wallDoorH * 0.25, -(uD - armD - 0.04)], true, 0, unit.handleType, unit.handleFinish, { doorHeight: wallDoorH })}
                            </group>
                          </group>
                        )}

                        {/* Snap Actions for Corner Wall Cabinet */}
                        {(isHovered || activeTool === "add-wall") && (
                          <group>
                            {/* Snap Left (Run 0 side) */}
                            <group position={[-uW / 2 - 0.04, uH / 2, -uD / 2 + armD / 2]}>
                              <Html position={[0, 0, armD / 2 + 0.04]} center>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddAdjacentUnit?.(unit.id, "left");
                                  }}
                                  style={{
                                    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                                    color: "#fff",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    borderRadius: "5px",
                                    padding: "4px 9px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 4px 14px rgba(168,85,247,0.7)",
                                    whiteSpace: "nowrap",
                                  }}
                                  title="Add adjacent Wall Unit to the left"
                                >
                                  ➕ Add Wall Left
                                </button>
                              </Html>
                            </group>

                            {/* Snap Right (Turned Run 1 side) */}
                            <group position={[uW / 2 - armD / 2, uH / 2, uD / 2 + 0.04]}>
                              <Html position={[0, 0, 0.04]} center>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddAdjacentUnit?.(unit.id, "right");
                                  }}
                                  style={{
                                    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                                    color: "#fff",
                                    border: "1px solid rgba(255,255,255,0.3)",
                                    borderRadius: "5px",
                                    padding: "4px 9px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 4px 14px rgba(168,85,247,0.7)",
                                    whiteSpace: "nowrap",
                                  }}
                                  title="Add Wall Unit on Turned Run 1"
                                >
                                  ➕ Add Wall Right (Turned)
                                </button>
                              </Html>
                            </group>
                          </group>
                        )}
                      </>
                    );
                  })()}
                </group>
              ) : (
                /* ------------------------------------------------------------- */
                /* STRAIGHT WALL CABINET                                         */
                /* ------------------------------------------------------------- */
                <group>
                  {/* Left Gable (Runs full height uH) */}
                  <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={uMat} castShadow>
                    <boxGeometry args={[t, uH, uD]} />
                    <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                  </mesh>
                  {/* Right Gable (Runs full height uH) */}
                  <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={uMat} castShadow>
                    <boxGeometry args={[t, uH, uD]} />
                    <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                  </mesh>
                  {/* Top Panel (Sits between gables) */}
                  <mesh position={[0, uH - t / 2, 0]} material={uMat} castShadow>
                    <boxGeometry args={[uW - t * 2, t, uD]} />
                    <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                  </mesh>
                  {/* Bottom Panel (Sits between gables) */}
                  <mesh position={[0, t / 2, 0]} material={uMat} castShadow>
                    <boxGeometry args={[uW - t * 2, t, uD]} />
                    <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                  </mesh>
                  {/* 8mm Back Panel (Arkalık: inset 18mm from rear edge) */}
                  <mesh position={[0, uH / 2, -uD / 2 + 0.018 + 0.004]} material={uMat}>
                    <boxGeometry args={[uW - t * 2, uH - t * 2, 0.008]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>

                  {/* Wall Internal Shelves */}
                  {unit.internalShelves > 0 &&
                    Array.from({ length: unit.internalShelves }).map((_, si) => {
                      const shelfSpacing = innerH / (unit.internalShelves + 1);
                      return (
                        <mesh key={`wallShelf-${si}`} position={[0, t + (si + 1) * shelfSpacing, 0.005]} material={uMat}>
                          <boxGeometry args={[uW - t * 2, t, uD - 0.045]} />
                          <Edges threshold={15} color={edgeColor} />
                        </mesh>
                      );
                    })}

                  {/* Wall Doors - Full Overlay: doorH = uH - 0.004, cncJProfile invertY=true */}
                  {unit.doorType !== "none" && (
                    <group>
                      {unit.doorType === "singleLeft" ? (
                        <group position={[-uW / 2 + 0.004, uH / 2, uD / 2]} rotation={[0, -unitDoorAngle, 0]}>
                          <ArchitecturalDoorMesh
                            width={uW - 0.008}
                            height={wallDoorH}
                            thickness={0.018}
                            doorStyle={unit.doorStyle || params.doorStyle}
                            material={uMat}
                            frameMaterial={handleMaterial}
                            handleType={unit.handleType}
                            edgeColor={edgeColor}
                            isSelected={isSelected}
                            invertY={true}
                            position={[(uW - 0.008) / 2, 0, 0.009]}
                          />
                          {renderHandle([uW - 0.04, -wallDoorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { doorHeight: wallDoorH })}
                        </group>
                      ) : unit.doorType === "singleRight" ? (
                        <group position={[uW / 2 - 0.004, uH / 2, uD / 2]} rotation={[0, unitDoorAngle, 0]}>
                          <ArchitecturalDoorMesh
                            width={uW - 0.008}
                            height={wallDoorH}
                            thickness={0.018}
                            doorStyle={unit.doorStyle || params.doorStyle}
                            material={uMat}
                            frameMaterial={handleMaterial}
                            handleType={unit.handleType}
                            edgeColor={edgeColor}
                            isSelected={isSelected}
                            invertY={true}
                            position={[-(uW - 0.008) / 2, 0, 0.009]}
                          />
                          {renderHandle([-uW + 0.04, -wallDoorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { isRightDoor: true, doorHeight: wallDoorH })}
                        </group>
                      ) : unit.doorType === "flipUp" ? (
                        <group position={[0, uH - 0.004, uD / 2]} rotation={[-unitDoorAngle, 0, 0]}>
                          <ArchitecturalDoorMesh
                            width={uW - 0.008}
                            height={wallDoorH}
                            thickness={0.018}
                            doorStyle={unit.doorStyle || params.doorStyle}
                            material={uMat}
                            frameMaterial={handleMaterial}
                            handleType={unit.handleType}
                            edgeColor={edgeColor}
                            isSelected={isSelected}
                            invertY={true}
                            position={[0, -wallDoorH / 2, 0.009]}
                          />
                          {renderHandle([0, -wallDoorH + 0.04, 0.02], false, 0, unit.handleType, unit.handleFinish, { drawerWidth: uW })}
                        </group>
                      ) : (
                        // Double Doors
                        <group>
                          <group position={[-uW / 2 + 0.004, uH / 2, uD / 2]} rotation={[0, -unitDoorAngle, 0]}>
                            <ArchitecturalDoorMesh
                              width={uW / 2 - 0.006}
                              height={wallDoorH}
                              thickness={0.018}
                              doorStyle={unit.doorStyle || params.doorStyle}
                              material={uMat}
                              frameMaterial={handleMaterial}
                              handleType={unit.handleType}
                              edgeColor={edgeColor}
                              isSelected={isSelected}
                              invertY={true}
                              position={[(uW / 2 - 0.006) / 2, 0, 0.009]}
                            />
                            {renderHandle([uW / 2 - 0.035, -wallDoorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { isRightDoor: false, doorHeight: wallDoorH })}
                          </group>
                          <group position={[uW / 2 - 0.004, uH / 2, uD / 2]} rotation={[0, unitDoorAngle, 0]}>
                            <ArchitecturalDoorMesh
                              width={uW / 2 - 0.006}
                              height={wallDoorH}
                              thickness={0.018}
                              doorStyle={unit.doorStyle || params.doorStyle}
                              material={uMat}
                              frameMaterial={handleMaterial}
                              handleType={unit.handleType}
                              edgeColor={edgeColor}
                              isSelected={isSelected}
                              invertY={true}
                              position={[-(uW / 2 - 0.006) / 2, 0, 0.009]}
                            />
                            {renderHandle([-uW / 2 + 0.035, -wallDoorH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish, { isRightDoor: true, doorHeight: wallDoorH })}
                          </group>
                        </group>
                      )}
                    </group>
                  )}
                </group>
              )}

              {/* Hover Add Adjacent Wall Unit */}
              {(isHovered || activeTool === "add-wall") && (
                <group>
                  {/* Left Snap Detector (Adds to the left of this wall unit) */}
                  <group position={[-uW / 2 - 0.04, uH / 2, 0]}>
                    <mesh
                      onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "left" }); }}
                      onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                    >
                      <boxGeometry args={[0.08, uH, uD]} />
                      <meshBasicMaterial color="#c084fc" transparent opacity={hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "left" ? 0.35 : 0.12} />
                      <Edges threshold={1} color="#c084fc" />
                    </mesh>
                    <Html position={[0, 0, uD / 2 + 0.04]} center>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "left");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.3)",
                          borderRadius: "5px",
                          padding: "4px 9px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(168,85,247,0.7)",
                          whiteSpace: "nowrap",
                        }}
                        title="Add adjacent Wall Unit to the left"
                      >
                        ➕ Add Wall Left
                      </button>
                    </Html>
                  </group>

                  {/* Right Snap Detector (Adds to the right of this wall unit) */}
                  <group position={[uW / 2 + 0.04, uH / 2, 0]}>
                    <mesh
                      onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "right" }); }}
                      onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                    >
                      <boxGeometry args={[0.08, uH, uD]} />
                      <meshBasicMaterial color="#c084fc" transparent opacity={hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "right" ? 0.35 : 0.12} />
                      <Edges threshold={1} color="#c084fc" />
                    </mesh>
                    <Html position={[0, 0, uD / 2 + 0.04]} center>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "right");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                          color: "#fff",
                          border: "1px solid rgba(255,255,255,0.3)",
                          borderRadius: "5px",
                          padding: "4px 9px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(168,85,247,0.7)",
                          whiteSpace: "nowrap",
                        }}
                        title="Add adjacent Wall Unit to the right"
                      >
                        ➕ Add Wall Right
                      </button>
                    </Html>
                  </group>
                </group>
              )}
            </group>
          );
        })}
      </group>
    );
  };
  // 3. SHELF RENDERER (Clean: No doors, no handles, consistent division layout)
  const renderShelf = () => {
    const cols = Math.max(1, Math.min(5, internalColumns || 2));
    const rows = internalShelves === 0 ? 0 : Math.max(1, Math.min(6, internalShelves ?? 3));
    const bayW = (w - (cols + 1) * t) / cols;

    return (
      <group>
        {/* Outer Left Upright */}
        <mesh
          position={[-w / 2 + t / 2, h / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[t, h, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>
        {/* Outer Right Upright */}
        <mesh
          position={[w / 2 - t / 2, h / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[t, h, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>

        {/* Top & Bottom Horizontal Boards */}
        <mesh
          position={[0, h - t / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[w - t * 2, t, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>
        <mesh
          position={[0, t / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[w - t * 2, t, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>

        {/* Internal Vertical Divider Columns (Interactive & Movable) */}
        {cols > 1 &&
          Array.from({ length: cols - 1 }).map((_, ci) => {
            const colOffset = (shelfColumnOffsets?.[ci] ?? 0) / 1000;
            const baseDivX = -w / 2 + t + (ci + 1) * (bayW + t) - t / 2;
            const divX = baseDivX + colOffset;
            const isDivSelected =
              selectedDivision?.unitId === "shelf" &&
              selectedDivision?.type === "partition" &&
              selectedDivision?.index === ci;

            return (
              <group key={`shelfCol-${ci}`}>
                <mesh
                  position={[divX, h / 2, 0]}
                  castShadow
                  receiveShadow
                  material={mainMaterial}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDivision?.({ unitId: "shelf", type: "partition", index: ci });
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = "pointer";
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = "default";
                  }}
                >
                  <boxGeometry args={[t, h - t * 2, d]} />
                  <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                  {isDivSelected && (
                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                  )}
                </mesh>
                {isDivSelected && (
                  <Html position={[divX, h / 2 + 0.12, d / 2 + 0.04]} center zIndexRange={[100, 0]}>
                    <div
                      style={{
                        background: "rgba(14, 16, 22, 0.95)",
                        border: "1px solid #f59e0b",
                        borderRadius: "5px",
                        padding: "3px 8px",
                        color: "#fbbf24",
                        fontSize: "11px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
                        pointerEvents: "none",
                      }}
                    >
                      Divider {ci + 1} ({Math.round(colOffset * 1000)}mm)
                    </div>
                  </Html>
                )}
              </group>
            );
          })}

        {/* Horizontal Shelf Tiers per Column (Interactive & Movable) */}
        {Array.from({ length: cols }).map((_, ci) => {
          const colX = -w / 2 + t + bayW / 2 + ci * (bayW + t);
          const isOffset = shelfLayout === "staggered" && ci % 2 === 1;
          const tierHeight = (h - t * 2) / (rows + 1);

          return (
            <group key={`colShelves-${ci}`}>
              {Array.from({ length: rows }).map((_, ri) => {
                const rowOffset = (shelfRowOffsets?.[ri] ?? 0) / 1000;
                const baseShelfY =
                  t + (ri + 1) * tierHeight + (isOffset ? tierHeight * 0.35 : 0);
                const shelfY = baseShelfY + rowOffset;
                if (shelfY >= h - t - 0.03 || shelfY <= t + 0.03) return null;

                const isDivSelected =
                  selectedDivision?.unitId === "shelf" &&
                  selectedDivision?.type === "shelf" &&
                  selectedDivision?.index === ri;

                return (
                  <group key={`shelf-${ci}-${ri}`}>
                    <mesh
                      position={[colX, shelfY, 0]}
                      castShadow
                      receiveShadow
                      material={mainMaterial}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDivision?.({ unitId: "shelf", type: "shelf", index: ri, colIndex: ci });
                      }}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        document.body.style.cursor = "pointer";
                      }}
                      onPointerOut={() => {
                        document.body.style.cursor = "default";
                      }}
                    >
                      <boxGeometry args={[bayW, t, d]} />
                      <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                      {isDivSelected && (
                        <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                      )}
                    </mesh>
                    {isDivSelected && ci === 0 && (
                      <Html position={[0, shelfY + 0.06, d / 2 + 0.04]} center zIndexRange={[100, 0]}>
                        <div
                          style={{
                            background: "rgba(14, 16, 22, 0.95)",
                            border: "1px solid #f59e0b",
                            borderRadius: "5px",
                            padding: "3px 8px",
                            color: "#fbbf24",
                            fontSize: "11px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
                            pointerEvents: "none",
                          }}
                        >
                          Shelf {ri + 1} ({Math.round(rowOffset * 1000)}mm)
                        </div>
                      </Html>
                    )}
                  </group>
                );
              })}
            </group>
          );
        })}

        {/* Solid Back Panel (if enabled) */}
        {hasBackPanel && (
          <mesh
            position={[0, h / 2, -d / 2 + 0.005]}
            material={mainMaterial}
          >
            <boxGeometry args={[w - t * 2, h - t * 2, 0.008]} />
            <Edges threshold={15} color={edgeColor} />
          </mesh>
        )}
      </group>
    );
  };


  // 4. MODULAR WARDROBE SYSTEM RENDERER
  const renderWardrobeSystem = () => {
    const rawUnits: WardrobeUnit[] = wardrobeUnits && wardrobeUnits.length > 0 ? wardrobeUnits : [
      {
        id: "wardrobe-1",
        name: "Main Section 1 (Hanging & Drawers)",
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
      {
        id: "wardrobe-2",
        name: "Main Section 2 (Shelves & Mirror)",
        type: "main",
        width: 900,
        height: 2100,
        depth: 600,
        doorType: "sliding",
        doorOpenPercent: 0,
        hasMirror: true,
        mirrorType: "full",
        hasDrawers: false,
        drawerType: "internal",
        drawerCount: 0,
        drawerOpenPercent: 0,
        hasClothesHangerRail: false,
        internalShelves: 4,
        hasInternalDivider: false,
        partitionOffset: 0,
        partitionSpan: "underTopShelf",
        hangerZone: "left",
        shelfOffsets: [],
        slidingDoorActivePanel: "right",
        handleType: "edgePull",
        handleFinish: "black",
      },
      {
        id: "wardrobe-top-1",
        name: "Top Bridge 1",
        type: "top",
        width: 900,
        height: 450,
        depth: 600,
        doorType: "hingedDouble",
        doorOpenPercent: 0,
        hasMirror: false,
        internalShelves: 1,
        drawerCount: 0,
        handleType: "edgePull",
        handleFinish: "black",
      },
      {
        id: "wardrobe-top-2",
        name: "Top Bridge 2",
        type: "top",
        width: 900,
        height: 450,
        depth: 600,
        doorType: "hingedDouble",
        doorOpenPercent: 0,
        hasMirror: false,
        internalShelves: 1,
        drawerCount: 0,
        handleType: "edgePull",
        handleFinish: "black",
      },
    ];

    const mainUnits = rawUnits.filter((u) => u.type !== "top");
    const topUnits = rawUnits.filter((u) => u.type === "top");

    // Continuous plinth / toe kick spanning all main wardrobe divisions
    const totalMainW = mainUnits.reduce((acc, u) => acc + u.width / 1000, 0);
    const mainStartLeftX = -totalMainW / 2;
    const plinthH = baseType === "floating" ? 0 : (plinthHeight ?? 80) / 1000;
    const plinthRec = (plinthRecess ?? 30) / 1000;
    const wardrobeD = (depth || 600) / 1000;

    return (
      <group>
        {/* Wardrobe Base: Continuous Plinth / Corner Feet Base */}
        {mainUnits.length > 0 && plinthH > 0 && (
          <group>
            {baseType === "plinth" ? (
              <group>
                {/* Front plinth fascia board */}
                <mesh
                  position={[0, plinthH / 2, wardrobeD / 2 - plinthRec - 0.009]}
                  castShadow
                  material={mainMaterial}
                >
                  <boxGeometry args={[totalMainW - 0.01, plinthH, 0.018]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
                {/* Side returns */}
                {[-totalMainW / 2 + 0.009, totalMainW / 2 - 0.009].map((px, pi) => (
                  <mesh
                    key={`wardrobePlinthSide-${pi}`}
                    position={[px, plinthH / 2, -plinthRec / 2]}
                    material={mainMaterial}
                  >
                    <boxGeometry args={[0.018, plinthH, wardrobeD - plinthRec - 0.02]} />
                  </mesh>
                ))}
              </group>
            ) : baseType === "legs" ? (
              <group>
                {(() => {
                  let legRunX = mainStartLeftX;
                  return mainUnits.map((u, ui) => {
                    const uW = u.width / 1000;
                    const uD = wardrobeD;
                    const cx = legRunX + uW / 2;
                    legRunX += uW;
                    const legInsetX = 0.05;
                    const legInsetZFront = plinthRec + 0.02;
                    const legInsetZBack = 0.05;
                    const legPositions: [number, number][] = [
                      [-uW / 2 + legInsetX, uD / 2 - legInsetZFront],
                      [uW / 2 - legInsetX, uD / 2 - legInsetZFront],
                      [-uW / 2 + legInsetX, -uD / 2 + legInsetZBack],
                      [uW / 2 - legInsetX, -uD / 2 + legInsetZBack],
                    ];
                    return (
                      <group key={`wardLegs-${ui}`} position={[cx, 0, 0]}>
                        {legPositions.map(([lx, lz], li) => (
                          <group key={`wardLeg-${ui}-${li}`} position={[lx, 0, lz]}>
                            <mesh position={[0, plinthH / 2, 0]} material={chromeMaterial} castShadow>
                              <cylinderGeometry args={[0.022, 0.022, plinthH, 16]} />
                            </mesh>
                            <mesh position={[0, 0.005, 0]} material={chromeMaterial}>
                              <cylinderGeometry args={[0.028, 0.028, 0.01, 16]} />
                            </mesh>
                          </group>
                        ))}
                      </group>
                    );
                  });
                })()}
              </group>
            ) : null}
          </group>
        )}

        {/* Main Wardrobe Divisions / Sections */}
        {(() => {
          let currX = mainStartLeftX;
          return mainUnits.map((unit) => {
            const uW = unit.width / 1000;
            const uH = unit.height / 1000;
            const uD = unit.depth / 1000;
            const centerX = currX + uW / 2;
            currX += uW;

            const uMat = getUnitMaterial(unit.materialType);
            const isSelected = selectedWardrobeUnitId === unit.id;
            const isHovered = hoveredWardrobeUnit === unit.id;
            const innerH = uH - t * 2;

            const isSliding = unit.doorType === "sliding";
            // 80mm setback from front edge when sliding so partitions/shelves clear the 70mm recessed track
            const slidingSetback = isSliding ? 0.080 : 0.020;
            const innerD = uD - 0.018 - slidingSetback;
            const innerZ = (0.026 - slidingSetback) / 2;

            // Drawers calculation: whether externalBottom or internal, reserve totalDrawerHeight!
            const hasDrawers = Boolean(unit.hasDrawers && (unit.drawerCount || 0) > 0);
            const drawerCount = unit.drawerCount || 2;
            const isExternalDrawers = hasDrawers && unit.drawerType === "externalBottom";
            const drawerUnitHeight = unit.drawerHeight ? unit.drawerHeight / 1000 : 0.20;
            const totalDrawerHeight = hasDrawers ? Math.min(innerH * 0.45, drawerUnitHeight * drawerCount + t) : 0;
            const doorAreaH = isExternalDrawers ? innerH - totalDrawerHeight : innerH;
            const doorBottomY = isExternalDrawers ? (t + totalDrawerHeight) : t;
            const drawerOpenDist = ((unit.drawerOpenPercent ?? 0) / 100) * (uD * 0.65);
            const doorOpenPercent = unit.doorOpenPercent ?? 0;

            // Zoned Vertical Partition & Sub-bay geometry
            const partBottomY = t + totalDrawerHeight;
            const hasTopLuggageShelf = !unit.hasInternalDivider
              ? Boolean(unit.hasClothesHangerRail && (unit.internalShelves ?? 0) >= 1)
              : (unit.partitionSpan !== "fullCarcass");
            const topShelfDistFromTop = 0.35; // 350mm top luggage shelf
            const topShelfY = uH - t - topShelfDistFromTop + ((unit.shelfOffsets?.[0] || 0) / 1000);
            const partTopY = (hasTopLuggageShelf && unit.partitionSpan !== "fullCarcass")
              ? topShelfY - t / 2
              : uH - t;

            const partRawOffset = (unit.partitionOffset || 0) / 1000;
            const maxPartOffset = Math.max(0, (uW - 3 * t) / 2 - 0.25);
            const clampedPartX = Math.max(-maxPartOffset, Math.min(maxPartOffset, partRawOffset));

            const leftBayW = (uW - 3 * t) / 2 + clampedPartX;
            const rightBayW = (uW - 3 * t) / 2 - clampedPartX;
            const leftBayCenterX = -uW / 2 + t + leftBayW / 2;
            const rightBayCenterX = uW / 2 - t - rightBayW / 2;
            const partitionX = -uW / 2 + t + leftBayW + t / 2;
            const partitionH = Math.max(0.1, partTopY - partBottomY);
            const partitionY = partBottomY + partitionH / 2;

            return (
              <group
                key={unit.id}
                userData={{ unitId: unit.id, unitName: unit.name }}
                position={[centerX, plinthH, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWardrobeUnit?.(unit.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  handleHoverWardrobe(unit.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  handleLeaveWardrobe();
                }}
              >
                {/* Active Selection Glow Box */}
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.012, uH + 0.012, uD + 0.012]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.07} />
                  </mesh>
                )}

                {/* Carcase Panels - Turkish 18mm MDF-Lam standard joinery */}
                {/* Left Gable (Runs full height uH) */}
                <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[t, uH, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* Right Gable (Runs full height uH) */}
                <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[t, uH, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* Top Panel (Sits between side gables) */}
                <mesh position={[0, uH - t / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[uW - t * 2, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* Bottom Panel (Sits between side gables) */}
                <mesh position={[0, t / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[uW - t * 2, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* 8mm Back Panel (Arkalık: inset 18mm from rear edge) */}
                <mesh position={[0, uH / 2, -uD / 2 + 0.018 + 0.004]} material={uMat}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.008]} />
                </mesh>

                {/* Full-width Structural Divider Board above drawers (for BOTH externalBottom and internal drawers) */}
                {hasDrawers && totalDrawerHeight > 0 && (
                  <mesh position={[0, t + totalDrawerHeight - t / 2, innerZ]} material={uMat} castShadow>
                    <boxGeometry args={[uW - t * 2, t, innerD]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                )}

                {/* Top Luggage Shelf (Üst Yüklük Rafı) */}
                {hasTopLuggageShelf && (
                  <mesh position={[0, topShelfY, innerZ]} material={uMat} castShadow>
                    <boxGeometry args={[uW - t * 2, t, innerD]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                )}

                {/* Optional Internal Vertical Divider (Interactive) */}
                {unit.hasInternalDivider && (() => {
                  const isPartSelected =
                    selectedDivision?.unitId === unit.id &&
                    selectedDivision?.type === "partition";
                  return (
                    <group position={[partitionX, partitionY, innerZ]}>
                      <mesh
                        material={uMat}
                        castShadow
                        onClick={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            onSelectDivision?.({ unitId: unit.id, type: "partition", index: 0 });
                          }
                        }}
                        onPointerOver={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            document.body.style.cursor = "pointer";
                          }
                        }}
                        onPointerOut={() => {
                          document.body.style.cursor = "default";
                        }}
                      >
                        <boxGeometry args={[t, partitionH, innerD]} />
                        <Edges threshold={15} color={isPartSelected ? "#f59e0b" : edgeColor} />
                        {isPartSelected && (
                          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                        )}
                      </mesh>
                      {isPartSelected && (
                        <Html position={[0, 0, innerD * 0.4]} center>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveDivision?.({ unitId: unit.id, type: "partition", index: 0 });
                            }}
                            style={{
                              background: "linear-gradient(135deg, #ef4444, #dc2626)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.4)",
                              borderRadius: "5px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 12px rgba(220,38,38,0.6)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🗑️ Delete Partition
                          </button>
                        </Html>
                      )}
                    </group>
                  );
                })()}

                {/* Smart Hanging Rod & Shelves Placement */}
                {(() => {
                  if (unit.hasInternalDivider) {
                    const isHangerLeft = unit.hangerZone !== "right";
                    const hangerBayW = isHangerLeft ? leftBayW : rightBayW;
                    const hangerBayX = isHangerLeft ? leftBayCenterX : rightBayCenterX;
                    const shelvesBayW = isHangerLeft ? rightBayW : leftBayW;
                    const shelvesBayX = isHangerLeft ? rightBayCenterX : leftBayCenterX;
                    const shelfCount = unit.internalShelves ?? 0;
                    const availShelvesH = Math.max(0.2, partTopY - partBottomY);
                    const shelfTierH = availShelvesH / (shelfCount + 1);

                    return (
                      <group>
                        {/* Clothes Hanging Rail in designated sub-bay */}
                        {unit.hasClothesHangerRail && (
                          <group position={[hangerBayX, partTopY - 0.08, innerZ]}>
                            {(() => {
                              const railW = Math.max(0.1, hangerBayW - 0.02);
                              return (
                                <group>
                                  <mesh rotation={[0, 0, Math.PI / 2]} material={chromeMaterial} castShadow>
                                    <cylinderGeometry args={[0.014, 0.014, railW, 24]} />
                                  </mesh>
                                  {[-railW / 2, railW / 2].map((bx, bi) => (
                                    <mesh key={`bracket-${bi}`} position={[bx, 0, 0]} material={chromeMaterial}>
                                      <boxGeometry args={[0.01, 0.04, 0.04]} />
                                    </mesh>
                                  ))}
                                  {[-railW * 0.28, -railW * 0.09, railW * 0.09, railW * 0.28].map((hx, hi) => (
                                    <group key={`hanger-${hi}`} position={[hx, -0.06, 0]}>
                                      <mesh material={uMat} castShadow>
                                        <boxGeometry args={[Math.min(0.34, railW * 0.7), 0.012, 0.012]} />
                                      </mesh>
                                      <mesh position={[-0.07, 0.04, 0]} rotation={[0, 0, -0.45]} material={uMat}>
                                        <boxGeometry args={[0.18, 0.014, 0.014]} />
                                      </mesh>
                                      <mesh position={[0.07, 0.04, 0]} rotation={[0, 0, 0.45]} material={uMat}>
                                        <boxGeometry args={[0.18, 0.014, 0.014]} />
                                      </mesh>
                                      <mesh position={[0, 0.07, 0]} material={chromeMaterial}>
                                        <torusGeometry args={[0.022, 0.004, 8, 16, Math.PI * 1.3]} />
                                      </mesh>
                                    </group>
                                  ))}
                                </group>
                              );
                            })()}
                          </group>
                        )}

                        {/* Shelves Stack in opposite sub-bay */}
                        {shelfCount > 0 &&
                          Array.from({ length: shelfCount }).map((_, si) => {
                            const baseY = partBottomY + (si + 1) * shelfTierH;
                            const shelfOffsetY = (unit.shelfOffsets?.[si] || 0) / 1000;
                            const shelfY = baseY + shelfOffsetY;
                            const isDivSelected =
                              selectedDivision?.unitId === unit.id &&
                              selectedDivision?.type === "shelf" &&
                              selectedDivision?.index === si;

                            return (
                              <group key={`wardShelvesStack-${si}`} position={[shelvesBayX, shelfY, innerZ]}>
                                <mesh
                                  material={uMat}
                                  castShadow
                                  onClick={(e) => {
                                    if (activeTool === "select-division") {
                                      e.stopPropagation();
                                      onSelectDivision?.({ unitId: unit.id, type: "shelf", index: si });
                                    }
                                  }}
                                  onPointerOver={(e) => {
                                    if (activeTool === "select-division") {
                                      e.stopPropagation();
                                      document.body.style.cursor = "pointer";
                                    }
                                  }}
                                  onPointerOut={() => {
                                    document.body.style.cursor = "default";
                                  }}
                                >
                                  <boxGeometry args={[shelvesBayW, t, innerD]} />
                                  <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                                  {isDivSelected && (
                                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                                  )}
                                </mesh>
                                {isDivSelected && (
                                  <Html position={[0, 0.04, innerD * 0.4]} center>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveDivision?.({ unitId: unit.id, type: "shelf", index: si });
                                      }}
                                      style={{
                                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                        color: "#fff",
                                        border: "1px solid rgba(255,255,255,0.4)",
                                        borderRadius: "5px",
                                        padding: "3px 8px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        boxShadow: "0 4px 12px rgba(220,38,38,0.6)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      🗑️ Delete Shelf {si + 1}
                                    </button>
                                  </Html>
                                )}
                              </group>
                            );
                          })}
                      </group>
                    );
                  } else {
                    // Full-width interior without vertical divider
                    const railY = hasTopLuggageShelf ? topShelfY - 0.07 : uH - t - 0.15;
                    const railW = Math.max(0.2, uW - t * 2 - 0.02);

                    return (
                      <group>
                        {/* Clothes Hanging Rail */}
                        {unit.hasClothesHangerRail && (
                          <group position={[0, railY, innerZ]}>
                            <group>
                              <mesh rotation={[0, 0, Math.PI / 2]} material={chromeMaterial} castShadow>
                                <cylinderGeometry args={[0.014, 0.014, railW, 24]} />
                              </mesh>
                              {[-railW / 2, railW / 2].map((bx, bi) => (
                                <mesh key={`bracket-full-${bi}`} position={[bx, 0, 0]} material={chromeMaterial}>
                                  <boxGeometry args={[0.01, 0.04, 0.04]} />
                                </mesh>
                              ))}
                              {[-railW * 0.35, -railW * 0.18, 0, railW * 0.18, railW * 0.35].map((hx, hi) => (
                                <group key={`hanger-full-${hi}`} position={[hx, -0.06, 0]}>
                                  <mesh material={uMat} castShadow>
                                    <boxGeometry args={[0.34, 0.012, 0.012]} />
                                  </mesh>
                                  <mesh position={[-0.08, 0.04, 0]} rotation={[0, 0, -0.45]} material={uMat}>
                                    <boxGeometry args={[0.2, 0.014, 0.014]} />
                                  </mesh>
                                  <mesh position={[0.08, 0.04, 0]} rotation={[0, 0, 0.45]} material={uMat}>
                                    <boxGeometry args={[0.2, 0.014, 0.014]} />
                                  </mesh>
                                  <mesh position={[0, 0.07, 0]} material={chromeMaterial}>
                                    <torusGeometry args={[0.022, 0.004, 8, 16, Math.PI * 1.3]} />
                                  </mesh>
                                </group>
                              ))}
                            </group>
                          </group>
                        )}

                        {/* Additional Lower Shelves below hanging garments */}
                        {unit.hasClothesHangerRail && (unit.internalShelves ?? 0) > 1 && (() => {
                          const additionalShelves = (unit.internalShelves ?? 0) - 1;
                          const availLowH = Math.max(0.15, (railY - 1.05) - partBottomY);
                          const lowTier = availLowH / (additionalShelves + 1);

                          return Array.from({ length: additionalShelves }).map((_, ai) => {
                            const si = ai + 1; // Shelf index 0 is top luggage shelf
                            const baseY = partBottomY + (ai + 1) * lowTier;
                            const shelfOffsetY = (unit.shelfOffsets?.[si] || 0) / 1000;
                            const shelfY = baseY + shelfOffsetY;
                            const isDivSelected =
                              selectedDivision?.unitId === unit.id &&
                              selectedDivision?.type === "shelf" &&
                              selectedDivision?.index === si;

                            return (
                              <group key={`wardLowShelf-${si}`} position={[0, shelfY, innerZ]}>
                                <mesh
                                  material={uMat}
                                  castShadow
                                  onClick={(e) => {
                                    if (activeTool === "select-division") {
                                      e.stopPropagation();
                                      onSelectDivision?.({ unitId: unit.id, type: "shelf", index: si });
                                    }
                                  }}
                                  onPointerOver={(e) => {
                                    if (activeTool === "select-division") {
                                      e.stopPropagation();
                                      document.body.style.cursor = "pointer";
                                    }
                                  }}
                                  onPointerOut={() => {
                                    document.body.style.cursor = "default";
                                  }}
                                >
                                  <boxGeometry args={[uW - t * 2, t, innerD]} />
                                  <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                                  {isDivSelected && (
                                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                                  )}
                                </mesh>
                              </group>
                            );
                          });
                        })()}

                        {/* Pure Shelves (No Hanger Rail) */}
                        {!unit.hasClothesHangerRail && (unit.internalShelves ?? 0) > 0 && (() => {
                          const count = unit.internalShelves ?? 0;
                          const availH = uH - t - partBottomY;
                          const tierH = availH / (count + 1);

                          return Array.from({ length: count }).map((_, si) => {
                            const baseY = partBottomY + (si + 1) * tierH;
                            const shelfOffsetY = (unit.shelfOffsets?.[si] || 0) / 1000;
                            const shelfY = baseY + shelfOffsetY;
                            const isDivSelected =
                              selectedDivision?.unitId === unit.id &&
                              selectedDivision?.type === "shelf" &&
                              selectedDivision?.index === si;

                            return (
                              <group key={`wardPureShelf-${si}`} position={[0, shelfY, innerZ]}>
                                <mesh
                                  material={uMat}
                                  castShadow
                                  onClick={(e) => {
                                    if (activeTool === "select-division") {
                                      e.stopPropagation();
                                      onSelectDivision?.({ unitId: unit.id, type: "shelf", index: si });
                                    }
                                  }}
                                  onPointerOver={(e) => {
                                    if (activeTool === "select-division") {
                                      e.stopPropagation();
                                      document.body.style.cursor = "pointer";
                                    }
                                  }}
                                  onPointerOut={() => {
                                    document.body.style.cursor = "default";
                                  }}
                                >
                                  <boxGeometry args={[uW - t * 2, t, innerD]} />
                                  <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                                  {isDivSelected && (
                                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                                  )}
                                </mesh>
                              </group>
                            );
                          });
                        })()}
                      </group>
                    );
                  }
                })()}

                {/* External Bottom Drawers */}
                {isExternalDrawers && (
                  <group position={[0, t, 0]}>
                    {Array.from({ length: drawerCount }).map((_, di) => {
                      const dh = (totalDrawerHeight - t) / drawerCount;
                      const drawerY = di * dh + dh / 2;
                      return (
                        <group
                          key={`extDrawer-${di}`}
                          position={[0, drawerY, uD / 2 + drawerOpenDist]}
                        >
                          <ArchitecturalDoorMesh
                            width={uW - 0.006}
                            height={dh - 0.004}
                            thickness={0.018}
                            doorStyle={unit.doorStyle || params.doorStyle}
                            material={uMat}
                            frameMaterial={handleMaterial}
                            handleType={unit.handleType}
                            edgeColor={edgeColor}
                            isSelected={isSelected}
                          />
                          <mesh position={[0, -0.01, -innerD * 0.45]} material={uMat}>
                            <boxGeometry args={[uW - t * 2 - 0.03, dh * 0.8, innerD * 0.85]} />
                          </mesh>
                          {renderHandle([0, 0, 0.01], false, 0, unit.handleType || "edgePull", unit.handleFinish || "black", { drawerWidth: uW })}
                        </group>
                      );
                    })}
                  </group>
                )}

                {/* Internal Concealed Drawers (İç Çekmece with side spacer strips and 75mm front clearance) */}
                {hasDrawers && !isExternalDrawers && (() => {
                  const frontZ = uD / 2 - 0.075;
                  const dh = (totalDrawerHeight - t) / drawerCount;
                  const drawerW = uW - t * 2 - 0.05 - 0.006;

                  return (
                    <group position={[0, t, 0]}>
                      {/* Left Side Spacer Strip (Yastık / Takoz) */}
                      <mesh position={[-uW / 2 + t + 0.025 / 2, (totalDrawerHeight - t) / 2, innerZ]} material={uMat}>
                        <boxGeometry args={[0.025, totalDrawerHeight - t, innerD]} />
                        <Edges threshold={15} color={edgeColor} />
                      </mesh>
                      {/* Right Side Spacer Strip (Yastık / Takoz) */}
                      <mesh position={[uW / 2 - t - 0.025 / 2, (totalDrawerHeight - t) / 2, innerZ]} material={uMat}>
                        <boxGeometry args={[0.025, totalDrawerHeight - t, innerD]} />
                        <Edges threshold={15} color={edgeColor} />
                      </mesh>

                      {/* Internal Drawers */}
                      {Array.from({ length: drawerCount }).map((_, di) => {
                        const drawerY = di * dh + dh / 2;
                        return (
                          <group
                            key={`intDrawer-${di}`}
                            position={[0, drawerY, frontZ + drawerOpenDist]}
                          >
                            <mesh material={uMat} castShadow>
                              <boxGeometry args={[drawerW, dh - 0.008, 0.018]} />
                              <Edges threshold={15} color={edgeColor} />
                            </mesh>
                            <mesh position={[0, 0, -(innerD * 0.8) / 2]} material={uMat}>
                              <boxGeometry args={[drawerW - 0.03, dh * 0.8, innerD * 0.8]} />
                            </mesh>
                            {renderHandle([0, dh * 0.2, 0.01], false, 0, "cutout", unit.handleFinish || "black")}
                          </group>
                        );
                      })}
                    </group>
                  );
                })()}

                {/* DOORS & FACADE */}
                {unit.doorType !== "open" && (
                  <group>
                    {unit.doorType === "sliding" ? (
                      <group>
                        {/* Upper recessed dual-guide aluminum track (flush with front edge of gables) */}
                        <mesh position={[0, uH - t - 0.015, uD / 2 - 0.035]} material={chromeMaterial}>
                          <boxGeometry args={[uW - t * 2, 0.030, 0.070]} />
                        </mesh>
                        {/* Lower recessed dual-guide aluminum track */}
                        <mesh position={[0, doorBottomY + 0.0075, uD / 2 - 0.035]} material={chromeMaterial}>
                          <boxGeometry args={[uW - t * 2, 0.015, 0.070]} />
                        </mesh>

                        {/*
                          AUTHENTIC TURKISH SLIDING DOOR MECHANICS:
                          - Tracks recessed inside carcass (Z = uD/2 - 0.070 to uD/2)
                          - Rear leaf: Z = uD/2 - 0.052
                          - Front leaf: Z = uD/2 - 0.018
                          - Panel width has 36mm overlap: panelW = (uW - 2*t)/2 + 0.018
                          - Vertical aluminum boy kulp profile along vertical stiles
                        */}
                        {(() => {
                          const panelW = (uW - t * 2) / 2 + 0.018;
                          const panelH = doorAreaH - 0.038;
                          const doorCenterY = doorBottomY + 0.015 + panelH / 2;
                          const rearZ = uD / 2 - 0.052;
                          const frontZ = uD / 2 - 0.018;

                          const leftParkX = -((uW - t * 2) / 4);
                          const rightParkX = ((uW - t * 2) / 4);
                          const maxSlide = (uW - t * 2) / 2 - 0.025;
                          const openFrac = doorOpenPercent / 100;
                          const activePanel = unit.slidingDoorActivePanel || "right";

                          const rightPosX = activePanel === "right" ? rightParkX - maxSlide * openFrac : rightParkX;
                          const leftPosX = activePanel === "left" ? leftParkX + maxSlide * openFrac : leftParkX;
                          const hasMirrorOnDoor = unit.hasMirror;

                          return (
                            <group position={[0, doorCenterY, 0]}>
                              {/* Left / Rear Leaf (riding on rear track) */}
                              <group position={[leftPosX, 0, rearZ]}>
                                <ArchitecturalDoorMesh
                                  width={panelW - 0.044}
                                  height={panelH}
                                  thickness={0.018}
                                  doorStyle={unit.doorStyle || params.doorStyle}
                                  material={uMat}
                                  frameMaterial={handleMaterial}
                                  edgeColor={edgeColor}
                                  isSelected={isSelected}
                                />
                                {/* Left Vertical Aluminum Boy Kulp Profile */}
                                <mesh position={[-panelW / 2 + 0.011, 0, 0.002]} material={chromeMaterial}>
                                  <boxGeometry args={[0.022, panelH, 0.024]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>
                                {/* Right Vertical Aluminum Boy Kulp Profile */}
                                <mesh position={[panelW / 2 - 0.011, 0, 0.002]} material={chromeMaterial}>
                                  <boxGeometry args={[0.022, panelH, 0.024]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>
                              </group>

                              {/* Right / Front Leaf (riding on front track) */}
                              <group position={[rightPosX, 0, frontZ]}>
                                <ArchitecturalDoorMesh
                                  width={panelW - 0.044}
                                  height={panelH}
                                  thickness={0.018}
                                  doorStyle={unit.doorStyle || params.doorStyle}
                                  material={uMat}
                                  frameMaterial={handleMaterial}
                                  edgeColor={edgeColor}
                                  isSelected={isSelected}
                                />
                                {/* Left Vertical Aluminum Boy Kulp Profile */}
                                <mesh position={[-panelW / 2 + 0.011, 0, 0.002]} material={chromeMaterial}>
                                  <boxGeometry args={[0.022, panelH, 0.024]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>
                                {/* Right Vertical Aluminum Boy Kulp Profile */}
                                <mesh position={[panelW / 2 - 0.011, 0, 0.002]} material={chromeMaterial}>
                                  <boxGeometry args={[0.022, panelH, 0.024]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>

                                {/* Mirror Option enclosed in aluminum frame & dark gasket */}
                                {hasMirrorOnDoor && (
                                  <group position={[0, 0, 0.010]}>
                                    {/* Top Aluminum Frame Rail */}
                                    <mesh position={[0, panelH / 2 - 0.01, 0.001]} material={chromeMaterial}>
                                      <boxGeometry args={[panelW - 0.044, 0.020, 0.022]} />
                                    </mesh>
                                    {/* Bottom Aluminum Frame Rail */}
                                    <mesh position={[0, -panelH / 2 + 0.01, 0.001]} material={chromeMaterial}>
                                      <boxGeometry args={[panelW - 0.044, 0.020, 0.022]} />
                                    </mesh>
                                    {/* 10mm Dark Bevel Gasket Frame */}
                                    <mesh position={[0, 0, 0.001]}>
                                      <boxGeometry
                                        args={[
                                          (unit.mirrorType === "center" ? (panelW - 0.044) * 0.75 : panelW - 0.05) + 0.008,
                                          panelH - 0.04 + 0.008,
                                          0.002,
                                        ]}
                                      />
                                      <meshBasicMaterial color="#1e293b" />
                                    </mesh>
                                    {/* Architectural Mirror Glass Pane */}
                                    <mesh position={[0, 0, 0.002]} material={getMirrorMaterial(unit.mirrorType)}>
                                      <boxGeometry
                                        args={[
                                          unit.mirrorType === "center" ? (panelW - 0.044) * 0.75 : panelW - 0.05,
                                          panelH - 0.04,
                                          0.004,
                                        ]}
                                      />
                                      <Edges threshold={15} color="#cbd5e1" />
                                    </mesh>
                                  </group>
                                )}
                              </group>
                            </group>
                          );
                        })()}
                      </group>
                    ) : unit.doorType === "hingedSingle" ? (
                      (() => {
                        const angleRad = (doorOpenPercent / 100) * ((85 * Math.PI) / 180);
                        const hasMirrorOnDoor = unit.hasMirror;
                        return (
                          <group position={[-uW / 2, doorBottomY + doorAreaH / 2, uD / 2]} rotation={[0, -angleRad, 0]}>
                            <ArchitecturalDoorMesh
                              width={uW - 0.004}
                              height={doorAreaH}
                              thickness={0.018}
                              doorStyle={unit.doorStyle || params.doorStyle}
                              material={uMat}
                              frameMaterial={handleMaterial}
                              handleType={unit.handleType}
                              edgeColor={edgeColor}
                              isSelected={isSelected}
                              position={[uW / 2, 0, 0.009]}
                            />

                            {hasMirrorOnDoor && (
                              <group position={[uW / 2, 0, 0.02]}>
                                <mesh position={[0, 0, 0.001]}>
                                  <boxGeometry args={[uW - 0.072, doorAreaH - 0.072, 0.002]} />
                                  <meshBasicMaterial color="#1e293b" />
                                </mesh>
                                <mesh position={[0, 0, 0.003]} material={getMirrorMaterial(unit.mirrorType)}>
                                  <boxGeometry args={[uW - 0.08, doorAreaH - 0.08, 0.004]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>
                              </group>
                            )}

                            {renderHandle([uW - 0.04, 0, 0.02], true, 0, unit.handleType || "bar", unit.handleFinish || "black", { doorHeight: doorAreaH })}
                          </group>
                        );
                      })()
                    ) : (
                      (() => {
                      const angleRad = (doorOpenPercent / 100) * ((85 * Math.PI) / 180);
                        const halfW = uW / 2;
                        const hasMirrorOnDoor = unit.hasMirror;
                        return (
                          <group position={[0, doorBottomY + doorAreaH / 2, uD / 2]}>
                            {/* Left Door */}
                            <group position={[-halfW, 0, 0]} rotation={[0, -angleRad, 0]}>
                              <ArchitecturalDoorMesh
                                width={halfW - 0.003}
                                height={doorAreaH}
                                thickness={0.018}
                                doorStyle={unit.doorStyle || params.doorStyle}
                                material={uMat}
                                frameMaterial={handleMaterial}
                                handleType={unit.handleType}
                                edgeColor={edgeColor}
                                isSelected={isSelected}
                                position={[halfW / 2, 0, 0.009]}
                              />
                              {hasMirrorOnDoor && (
                                <group position={[halfW / 2, 0, 0.02]}>
                                  <mesh position={[0, 0, 0.001]}>
                                    <boxGeometry args={[halfW - 0.052, doorAreaH - 0.072, 0.002]} />
                                    <meshBasicMaterial color="#1e293b" />
                                  </mesh>
                                  <mesh position={[0, 0, 0.003]} material={getMirrorMaterial(unit.mirrorType)}>
                                    <boxGeometry args={[halfW - 0.06, doorAreaH - 0.08, 0.004]} />
                                    <Edges threshold={15} color="#cbd5e1" />
                                  </mesh>
                                </group>
                              )}
                              {renderHandle([halfW - 0.035, 0, 0.02], true, 0, unit.handleType || "bar", unit.handleFinish || "black", { isRightDoor: false, doorHeight: doorAreaH })}
                            </group>
                            {/* Right Door */}
                            <group position={[halfW, 0, 0]} rotation={[0, angleRad, 0]}>
                              <ArchitecturalDoorMesh
                                width={halfW - 0.003}
                                height={doorAreaH}
                                thickness={0.018}
                                doorStyle={unit.doorStyle || params.doorStyle}
                                material={uMat}
                                frameMaterial={handleMaterial}
                                handleType={unit.handleType}
                                edgeColor={edgeColor}
                                isSelected={isSelected}
                                position={[-halfW / 2, 0, 0.009]}
                              />
                              {hasMirrorOnDoor && (
                                <group position={[-halfW / 2, 0, 0.02]}>
                                  <mesh position={[0, 0, 0.001]}>
                                    <boxGeometry args={[halfW - 0.052, doorAreaH - 0.072, 0.002]} />
                                    <meshBasicMaterial color="#1e293b" />
                                  </mesh>
                                  <mesh position={[0, 0, 0.003]} material={getMirrorMaterial(unit.mirrorType)}>
                                    <boxGeometry args={[halfW - 0.06, doorAreaH - 0.08, 0.004]} />
                                    <Edges threshold={15} color="#cbd5e1" />
                                  </mesh>
                                </group>
                              )}
                              {renderHandle([-halfW + 0.035, 0, 0.02], true, 0, unit.handleType || "bar", unit.handleFinish || "black", { isRightDoor: true, doorHeight: doorAreaH })}
                            </group>
                          </group>
                        );
                      })()
                    )}
                  </group>
                )}

                {/* INTERACTIVE CAD TOOL PREVIEWS & SNAPPING FOR WARDROBE */}
                {/* Mode 1: Add Section on Hovered Side */}
                {activeTool === "add-base" && (
                  <group>
                    {/* Left Snap Detector */}
                    <mesh
                      position={[-uW / 2, uH / 2, 0]}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredSnap({ unitId: unit.id, side: "left" });
                      }}
                      onPointerOut={() => setHoveredSnap(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAdjacentWardrobeUnit?.(unit.id, "left");
                      }}
                    >
                      <boxGeometry args={[0.2, uH, uD]} />
                      <meshBasicMaterial transparent opacity={0} />
                    </mesh>

                    {/* Right Snap Detector */}
                    <mesh
                      position={[uW / 2, uH / 2, 0]}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredSnap({ unitId: unit.id, side: "right" });
                      }}
                      onPointerOut={() => setHoveredSnap(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAdjacentWardrobeUnit?.(unit.id, "right");
                      }}
                    >
                      <boxGeometry args={[0.2, uH, uD]} />
                      <meshBasicMaterial transparent opacity={0} />
                    </mesh>

                    {/* Ghost Preview Box on Left */}
                    {hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "left" && (
                      <group position={[-uW / 2 - 0.45, uH / 2, 0]}>
                        <mesh>
                          <boxGeometry args={[0.9, uH, uD]} />
                          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} />
                          <Edges threshold={1} color="#38bdf8" />
                        </mesh>
                        <Html position={[0, 0, uD / 2 + 0.05]} center>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddAdjacentWardrobeUnit?.(unit.id, "left");
                            }}
                            style={{
                              background: "#2972f5",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ➕ Place Section Left
                          </div>
                        </Html>
                      </group>
                    )}

                    {/* Ghost Preview Box on Right */}
                    {hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "right" && (
                      <group position={[uW / 2 + 0.45, uH / 2, 0]}>
                        <mesh>
                          <boxGeometry args={[0.9, uH, uD]} />
                          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} />
                          <Edges threshold={1} color="#38bdf8" />
                        </mesh>
                        <Html position={[0, 0, uD / 2 + 0.05]} center>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddAdjacentWardrobeUnit?.(unit.id, "right");
                            }}
                            style={{
                              background: "#2972f5",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ➕ Place Section Right
                          </div>
                        </Html>
                      </group>
                    )}
                  </group>
                )}

                {/* Mode 2: Vertical Division on Hover */}
                {activeTool === "add-v-division" && isHovered && (
                  <group>
                    <mesh position={[0, uH / 2, 0]}>
                      <boxGeometry args={[0.018, uH - t * 2, innerD]} />
                      <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                      <Edges threshold={1} color="#38bdf8" />
                    </mesh>
                    <Html position={[0, uH + 0.04, uD / 2]} center>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddDivision?.(unit.id, "vertical");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #0284c7, #2563eb)",
                          color: "#fff",
                          padding: "4px 9px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(2,132,199,0.7)",
                          border: "1px solid rgba(255,255,255,0.3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ➗ Click to Add Vertical Split
                      </div>
                    </Html>
                  </group>
                )}

                {/* Mode 3: Horizontal Division (Shelf) on Hover */}
                {activeTool === "add-h-division" && isHovered && (
                  <group>
                    {(() => {
                      const nextCount = (unit.internalShelves ?? 0) + 1;
                      const startY = t + totalDrawerHeight;
                      const availH = uH - t - startY;
                      const previewY = startY + (availH / (nextCount + 1)) * nextCount;
                      const shelfW = unit.hasInternalDivider ? (uW - t * 3) / 2 : (uW - t * 2);
                      const shelfX = unit.hasInternalDivider ? uW / 4 : 0;
                      return (
                        <group position={[shelfX, previewY, 0]}>
                          <mesh>
                            <boxGeometry args={[shelfW, 0.018, innerD]} />
                            <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
                            <Edges threshold={1} color="#10b981" />
                          </mesh>
                          <Html position={[0, 0.04, uD / 2]} center>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddDivision?.(unit.id, "horizontal");
                              }}
                              style={{
                                background: "linear-gradient(135deg, #059669, #10b981)",
                                color: "#fff",
                                padding: "4px 9px",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(16,185,129,0.7)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              📚 Click to Add Shelf (#{nextCount})
                            </div>
                          </Html>
                        </group>
                      );
                    })()}
                  </group>
                )}
              </group>
            );
          });
        })()}

        {/* Top Overhead Cabinets */}
        {(() => {
          let currTopX = mainStartLeftX;
          const mainH = (mainUnits[0]?.height || 2100) / 1000;
          return topUnits.map((topU) => {
            const uW = topU.width / 1000;
            const uH = topU.height / 1000;
            const uD = topU.depth / 1000;
            const centerX = currTopX + uW / 2;
            currTopX += uW;

            const isSelected = selectedWardrobeUnitId === topU.id;
            const topY = plinthH + mainH;
            const topUMat = getUnitMaterial(topU.materialType);

            return (
              <group
                key={topU.id}
                position={[centerX, topY, 0]}
                userData={{ unitId: topU.id, unitName: topU.name }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWardrobeUnit?.(topU.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredWardrobeUnit(topU.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  if (hoveredWardrobeUnit === topU.id) setHoveredWardrobeUnit(null);
                }}
              >
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.01, uH + 0.01, uD + 0.01]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.07} />
                  </mesh>
                )}

                {/* Top and Bottom Panels (Between gables) */}
                <mesh position={[0, uH - t / 2, 0]} material={topUMat} castShadow>
                  <boxGeometry args={[uW - t * 2, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, t / 2, 0]} material={topUMat} castShadow>
                  <boxGeometry args={[uW - t * 2, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>

                {/* Left & Right Side Gables (Full height) */}
                <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={topUMat} castShadow>
                  <boxGeometry args={[t, uH, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={topUMat} castShadow>
                  <boxGeometry args={[t, uH, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>

                {/* 8mm Back Panel (18mm inset from rear) */}
                <mesh position={[0, uH / 2, -uD / 2 + 0.018 + 0.004]} material={topUMat}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.008]} />
                </mesh>

                {/* Full-Overlay Door (2mm reveal top and bottom) */}
                {topU.doorType !== "open" && (
                  <group position={[0, uH / 2, uD / 2]}>
                    <ArchitecturalDoorMesh
                      width={uW - 0.004}
                      height={uH - 0.004}
                      thickness={0.018}
                      doorStyle={topU.doorStyle || params.doorStyle}
                      material={topUMat}
                      frameMaterial={handleMaterial}
                      handleType={topU.handleType}
                      edgeColor={edgeColor}
                      isSelected={isSelected}
                    />
                    {renderHandle([uW / 2 - 0.04, 0, 0.012], true, 0, topU.handleType || "edgePull", topU.handleFinish || "black", { doorHeight: uH })}
                  </group>
                )}
              </group>
            );
          });
        })()}
      </group>
    );
  };

  return (
    <group ref={groupRef}>
      {category === "Cabinet"
        ? renderKitchenCabinetSystem()
        : category === "Shelf"
        ? renderShelf()
        : category === "Wardrobe"
        ? renderWardrobeSystem()
        : renderTable()}

      {/* Sleek CAD Dimension Tags with Exact Assembly Bounding Box & Plinth Included */}
      {showDimensions && (() => {
        let totalDimW = width;
        let totalDimH = height;
        let totalDimD = depth;

        if (category === "Cabinet") {
          const kUnits = kitchenUnits && kitchenUnits.length > 0 ? kitchenUnits : [{ width: 600, height: 720, depth: 600, type: "base" }];
          const bUnits = kUnits.filter(u => u.type === "base" || u.type === "corner-base");
          const wUnits = kUnits.filter(u => u.type === "wall" || u.type === "corner-wall");
          const pBaseH = baseType === "floating" ? 0 : (plinthHeight || 80);
          totalDimW = bUnits.length > 0 ? bUnits.reduce((acc, u) => acc + u.width, 0) : 600;
          const maxBaseH = bUnits.length > 0 ? Math.max(...bUnits.map(u => u.height)) : 720;
          const maxWallH = wUnits.length > 0 ? Math.max(...wUnits.map(u => u.height)) : 0;
          const cTopThick = tableTopThickness || 30;
          totalDimH = pBaseH + maxBaseH + (wUnits.length > 0 ? cTopThick + 600 + maxWallH : 0);
          totalDimD = bUnits.length > 0 ? Math.max(...bUnits.map(u => u.depth)) : 600;
        } else if (category === "Wardrobe") {
          const wUnits = wardrobeUnits && wardrobeUnits.length > 0 ? wardrobeUnits : [{ width: 900, height: 2100, depth: 600, type: "main" }];
          const mUnits = wUnits.filter(u => u.type !== "top");
          const tUnits = wUnits.filter(u => u.type === "top");
          const pWardH = baseType === "floating" ? 0 : (plinthHeight ?? 80);
          totalDimW = mUnits.length > 0 ? mUnits.reduce((acc, u) => acc + u.width, 0) : 900;
          const maxMainH = mUnits.length > 0 ? Math.max(...mUnits.map(u => u.height)) : 2100;
          const maxTopH = tUnits.length > 0 ? Math.max(...tUnits.map(u => u.height)) : 0;
          totalDimH = pWardH + maxMainH + maxTopH;
          totalDimD = depth || 600;
        } else {
          totalDimW = width || 1400;
          totalDimH = height || 750;
          totalDimD = depth || 800;
        }

        const mDimW = totalDimW / 1000;
        const mDimH = totalDimH / 1000;
        const mDimD = totalDimD / 1000;

        return (
          <group>
            {/* Top Width Tag */}
            <Html
              position={[0, mDimH + 0.08, mDimD / 2 + 0.03]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.94)",
                  border: "1px solid rgba(41, 114, 245, 0.7)",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  color: "#93c5fd",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  userSelect: "none",
                }}
              >
                W: {Math.round(totalDimW)} mm
              </div>
            </Html>

            {/* Right Height Tag */}
            <Html
              position={[mDimW / 2 + 0.06, mDimH / 2, mDimD / 2 + 0.03]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.94)",
                  border: "1px solid rgba(41, 114, 245, 0.7)",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  color: "#93c5fd",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  userSelect: "none",
                }}
              >
                H: {Math.round(totalDimH)} mm
              </div>
            </Html>

            {/* Left Depth Tag */}
            <Html
              position={[-mDimW / 2 - 0.06, 0.05, 0]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.94)",
                  border: "1px solid rgba(41, 114, 245, 0.7)",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  color: "#93c5fd",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  userSelect: "none",
                }}
              >
                D: {Math.round(totalDimD)} mm
              </div>
            </Html>
          </group>
        );
      })()}
    </group>
  );
}
