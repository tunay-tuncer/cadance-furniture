import { FurnitureParams, KitchenCabinetUnit, WardrobeUnit } from "@/components/modeler/FurnitureMesh";

export interface ProductionMetrics {
  panelCount: number; // 18mm structural panels, shelves, doors, drawer parts
  backPanelCount: number; // 8mm back panels (arkalık)
  totalParts: number; // panelCount + backPanelCount
  surfaceArea18mm: number; // in m² (18mm carcass, shelves, doors, drawers)
  surfaceArea8mm: number; // in m² (8mm back panels)
  totalSurfaceArea: number; // in m²
  stdSheets: number; // Raw sheet / plaka count with 15% kerf
  sheetArea: number; // 5.88 m² or 2.98 m²
  sheetLabel: string; // "2800×2100mm MDF-Lam Plaka" vs "2440×1220mm Plywood Sheet"
  isPlywood: boolean;
  estimatedWeight: number; // in kg
}

export function calculateProductionMetrics(params: FurnitureParams): ProductionMetrics {
  let panelCount = 0;
  let backPanelCount = 0;
  let area18 = 0;
  let area8 = 0;

  const t = (params.boardThickness || 18) / 1000;

  if (params.category === "Cabinet") {
    const kitchenUnits: KitchenCabinetUnit[] =
      params.kitchenUnits && params.kitchenUnits.length > 0
        ? params.kitchenUnits
        : [
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

    kitchenUnits.forEach((u) => {
      const uw = u.width / 1000;
      const uh = u.height / 1000;
      const isWall = u.type === "wall" || u.type === "corner-wall";
      const ud = (u.depth || (isWall ? 350 : 600)) / 1000;

      // 1. Side Gables (2 gables running full height)
      panelCount += 2;
      area18 += 2 * (uh * ud);

      // 2. Bottom Panel (sitting between gables)
      panelCount += 1;
      area18 += Math.max(0, uw - 2 * t) * ud;

      // 3. Top Panel vs. 2x Top Stretchers (Üst Kayıt)
      if (u.type === "base" || u.type === "corner-base") {
        // Base units use two 80mm deep stretchers front & back
        panelCount += 2;
        area18 += 2 * Math.max(0, uw - 2 * t) * 0.08;
      } else {
        // Wall units have a full solid top panel
        panelCount += 1;
        area18 += Math.max(0, uw - 2 * t) * ud;
      }

      // 4. Internal Shelves
      const shelves = u.internalShelves || 0;
      if (shelves > 0) {
        panelCount += shelves;
        area18 += shelves * (Math.max(0, uw - 2 * t) * Math.max(0, ud - 0.045));
      }

      // 5. Doors (Full Overlay: uh - 4mm)
      const doorH = Math.max(0, uh - 0.004);
      if (u.doorType === "double" || u.doorType === "cornerDouble") {
        panelCount += 2;
        area18 += 2 * ((uw / 2 - 0.004) * doorH);
      } else if (u.doorType === "singleLeft" || u.doorType === "singleRight" || u.doorType === "flipUp") {
        panelCount += 1;
        area18 += (uw - 0.004) * doorH;
      }

      // 6. Drawers (5 panels each: front + back + 2 sides + bottom)
      const drawerCount = u.drawerCount || 0;
      if (drawerCount > 0) {
        panelCount += drawerCount * 5;
        const dh = uh / drawerCount;
        const boxH = Math.max(0.1, dh - 0.06);
        const boxW = Math.max(0.1, uw - 2 * t - 0.026);
        const boxD = Math.max(0.2, ud - 0.05);
        // Front overlay + drawer box body (18mm front + 18mm/16mm sides, back, bottom)
        area18 += drawerCount * (uw * (dh - 0.006) + 2 * (boxD * boxH) + 2 * (boxW * boxH) + boxW * boxD);
      }

      // 7. Back Panel (Arkalık: 8mm MDF-Lam)
      if (u.hasBackPanel !== false) {
        backPanelCount += 1;
        area8 += Math.max(0, uw - 2 * t + 0.016) * Math.max(0, uh - 2 * t + 0.016);
      }
    });
  } else if (params.category === "Wardrobe") {
    const wardrobeUnits: WardrobeUnit[] =
      params.wardrobeUnits && params.wardrobeUnits.length > 0
        ? params.wardrobeUnits
        : [
            {
              id: "wardrobe-1",
              name: "Wardrobe Section 1",
              type: "main",
              width: 900,
              height: 2100,
              depth: 600,
              doorType: "hingedDouble",
              internalShelves: 3,
              hasDrawers: true,
              drawerCount: 2,
            },
          ];

    wardrobeUnits.forEach((u) => {
      const uw = u.width / 1000;
      const uh = u.height / 1000;
      const ud = (u.depth || 600) / 1000;

      // 1. Side Gables (2 gables running full height)
      panelCount += 2;
      area18 += 2 * (uh * ud);

      // 2. Bottom Panel (sitting between gables)
      panelCount += 1;
      area18 += Math.max(0, uw - 2 * t) * ud;

      // 3. Top Panel (sitting between gables)
      panelCount += 1;
      area18 += Math.max(0, uw - 2 * t) * ud;

      // 4. Center Vertical Partition
      if (u.hasInternalDivider) {
        panelCount += 1;
        area18 += Math.max(0, uh - 2 * t) * Math.max(0, ud - 0.02);
      }

      // 5. Internal Shelves
      const shelves = u.internalShelves || 0;
      if (shelves > 0) {
        panelCount += shelves;
        const shelfW = u.hasInternalDivider ? (uw - 3 * t) / 2 : uw - 2 * t;
        area18 += shelves * (Math.max(0, shelfW) * Math.max(0, ud - 0.045));
      }

      // 6. Doors
      const doorH = Math.max(0, uh - 0.004);
      if (u.doorType === "hingedDouble" || u.doorType === "sliding") {
        panelCount += 2;
        area18 += 2 * ((uw / 2 - 0.004) * doorH);
      } else if (u.doorType === "hingedSingle") {
        panelCount += 1;
        area18 += (uw - 0.004) * doorH;
      }

      // 7. Drawers (5 panels each)
      if (u.hasDrawers && (u.drawerCount || 0) > 0) {
        const dCount = u.drawerCount || 2;
        panelCount += dCount * 5;
        const dH = (u.drawerHeight || 200) / 1000;
        const boxW = Math.max(0.2, uw - 2 * t - 0.03);
        const boxD = Math.max(0.2, ud - 0.05);
        area18 += dCount * (uw * dH + 2 * (boxD * dH) + 2 * (boxW * dH) + boxW * boxD);
      }

      // 8. Back Panel (Arkalık: 8mm MDF-Lam)
      backPanelCount += 1;
      area8 += Math.max(0, uw - 2 * t + 0.016) * Math.max(0, uh - 2 * t + 0.016);
    });
  } else if (params.category === "Shelf") {
    const wM = params.width / 1000;
    const hM = params.height / 1000;
    const dM = params.depth / 1000;
    const cols = params.internalColumns || 1;
    const shelves = params.internalShelves ?? 2;

    panelCount = 4 + (cols - 1) + cols * shelves;
    area18 = wM * dM * 2 + dM * hM * (2 + cols - 1) + cols * shelves * ((wM / cols) * dM);

    if (params.hasBackPanel) {
      backPanelCount = 1;
      area8 = wM * hM;
    }
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
    area18 = wM * dM * 2 + (wM + dM) * 0.12 * 2 + legPanels * (0.05 * hM * 4) + (isPedestal ? 0.9 : 0);
  }

  // 15% cutting kerf & trim factor
  const kerfFactor = 1.15;
  const netArea18 = area18 * 1.05; // 5% manufacturing edge banding tolerance
  const isPlywood = params.materialType === "plywood";

  // Standard Turkish Plate sizes:
  // Plywood: 2440 x 1220 mm = 2.9768 m²
  // MDF-Lam (Turkish Standard Jumbo): 2800 x 2100 mm = 5.88 m²
  const sheetArea = isPlywood ? 2.98 : 5.88;
  const sheetLabel = isPlywood ? "2440×1220mm Plywood Sheet" : "2800×2100mm MDF-Lam Plaka";
  const stdSheets = Math.max(1, Math.ceil((netArea18 * kerfFactor) / sheetArea));

  // Density calculation
  // Steel: 7800, MDF-Lam (Turkish standard): 720 kg/m³, Plywood: 680 kg/m³
  const density =
    params.materialType === "blackSteel"
      ? 7800
      : params.materialType === "whiteStudio"
      ? 720
      : isPlywood
      ? 680
      : 720;

  const weight18 = netArea18 * t * density;
  const weight8 = area8 * 0.008 * density;
  const estimatedWeight = Number((weight18 + weight8).toFixed(1));

  return {
    panelCount,
    backPanelCount,
    totalParts: panelCount + backPanelCount,
    surfaceArea18mm: Number(netArea18.toFixed(2)),
    surfaceArea8mm: Number(area8.toFixed(2)),
    totalSurfaceArea: Number((netArea18 + area8).toFixed(2)),
    stdSheets,
    sheetArea,
    sheetLabel,
    isPlywood,
    estimatedWeight,
  };
}
