import { FurnitureParams, KitchenCabinetUnit, WardrobeUnit } from "@/components/modeler/FurnitureMesh";

export interface UnitPrices {
  // Plakalar (TL / tam plaka)
  sheet18White: number;       // 18mm Beyaz Plaka: 3850 TL
  sheet18ColorWood: number;   // 18mm Renkli / Ahşap Desenli: 4750 TL
  sheet18Plywood: number;     // 18mm Huş Plywood: 6500 TL
  sheet8White: number;        // 8mm Beyaz Arkalık: 2650 TL
  sheet8Color: number;        // 8mm Renkli Arkalık: 3100 TL

  // Kesim & CNC (TL / plaka)
  cuttingCnc18: number;       // Ebatlama + CNC (18mm): 2250 TL/plaka
  cuttingCnc8: number;        // Ebatlama (8mm): 700 TL/plaka

  // Kenar Bandı (TL / metre)
  edgeBandingPerMeter: number; // 1mm PVC (Çekim dahil): 48 TL/mt

  // Aksesuar & Donanım (TL / adet)
  hingeSoftClose: number;     // Frenli Menteşe: 85 TL/adet
  slideTandem: number;        // Tandem Gizli Frenli Ray: 750 TL/takım
  handle: number;             // Mobilya Kulpu: 180 TL/adet
  leg: number;                // Baza Ayak / Metal Ayak: 40 TL/adet
  hangerRod: number;          // Askı Borusu + Rozet: 450 TL/takım

  // İşçilik, Nakliye & Montaj
  workshopAssemblyPerSheet: number; // Atölye Toplama İşçiliği (Minifikssiz kavela+tutkal pres): 2000 TL/plaka
  siteInstallationPercent: number;  // Şantiye Montaj İşçiliği: %10
  shippingFeeTL: number;            // Sabit Proje Nakliye Hizmeti (Proje başına tek sefer): 3000 TL
  profitMarginPercent: number;      // Kâr Marjı: %35
}

export const DEFAULT_UNIT_PRICES: UnitPrices = {
  sheet18White: 3850,
  sheet18ColorWood: 4750,
  sheet18Plywood: 6500,
  sheet8White: 2650,
  sheet8Color: 3100,
  cuttingCnc18: 2250,
  cuttingCnc8: 700,
  edgeBandingPerMeter: 48,
  hingeSoftClose: 85,
  slideTandem: 750,
  handle: 180,
  leg: 40,
  hangerRod: 450,
  workshopAssemblyPerSheet: 2000,
  siteInstallationPercent: 10,
  shippingFeeTL: 3000,
  profitMarginPercent: 35,
};

export interface HardwareBreakdown {
  hinges: number;     // frenli menteşe
  slides: number;     // tandem ray takımı
  handles: number;    // kulp
  legs: number;       // baza/gövde ayağı
  hangerRods: number; // gardırop askı borusu
}

export interface CostBreakdown {
  material18Cost: number;     // 18mm plaka maliyeti (tam plaka fireli)
  material8Cost: number;      // 8mm arkalık maliyeti (tam plaka fireli)
  totalMaterialCost: number;  // 18mm + 8mm
  cuttingCncCost: number;     // Ebatlama + CNC maliyeti
  edgeBandingCost: number;    // PVC bant + çekim maliyeti
  hardwareCost: number;       // Aksesuar ve donanım maliyeti
  workshopLaborCost: number;  // Atölye pres toplama işçiliği
  baseProductionCost: number; // Malzeme + Kesim + Bant + Donanım + Atölye
  siteInstallationCost: number;// Şantiye montaj işçiliği (%10)
  shippingCost: number;       // Nakliye bedeli (proje bazında veya mobilya payı)
  totalNetCost: number;       // Net Üretim Maliyeti (Kârsız)
  profitAmount: number;       // Kâr tutarı (%35)
  customerPrice: number;      // Müşteri Teklif / Satış Fiyatı (Kâr dahil)
}

export interface ProductionMetrics {
  panelCount: number; // 18mm structural panels, shelves, doors, drawer parts
  backPanelCount: number; // 8mm back panels (arkalık)
  totalParts: number; // panelCount + backPanelCount
  surfaceArea18mm: number; // in m² (18mm carcass, shelves, doors, drawers)
  surfaceArea8mm: number; // in m² (8mm back panels)
  totalSurfaceArea: number; // in m²
  stdSheets: number; // 18mm tam plaka adedi (Math.ceil ile)
  stdSheets8mm: number; // 8mm arkalık tam plaka adedi
  sheetArea: number; // 5.88 m² or 2.98 m²
  sheetLabel: string; // "2800×2100mm MDF-Lam Plaka" vs "2440×1220mm Plywood Sheet"
  isPlywood: boolean;
  estimatedWeight: number; // in kg
  edgeBandingMeters: number; // 1mm PVC kenar bandı metrajı
  hardware: HardwareBreakdown; // Donanım adetleri
  cost: CostBreakdown; // Canlı maliyet ve fiyat kırılımı
}

export interface CalculationOptions {
  includeShippingInItem?: boolean; // Mobilya bazında nakliye dahil edilsin mi? (varsayılan false, proje düzeyinde 1 kez eklenir)
  shippingShare?: number;          // Mobilyaya düşen özel nakliye payı (TL)
}

export function calculateProductionMetrics(
  params: FurnitureParams,
  customPrices?: Partial<UnitPrices>,
  options?: CalculationOptions
): ProductionMetrics {
  const prices: UnitPrices = {
    ...DEFAULT_UNIT_PRICES,
    ...(customPrices || {}),
  };

  let panelCount = 0;
  let backPanelCount = 0;
  let area18 = 0;
  let area8 = 0;
  let edgeBandingMeters = 0; // 1mm PVC edge banding in meters

  // Hardware counters
  let hinges = 0;
  let slides = 0;
  let handles = 0;
  let legs = 0;
  let hangerRods = 0;

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
      // Front edge banded (2 * uh), top & bottom usually banded on carcass (2 * ud)
      panelCount += 2;
      area18 += 2 * (uh * ud);
      edgeBandingMeters += 2 * (uh + ud);

      // 2. Bottom Panel (front edge banded)
      panelCount += 1;
      const innerW = Math.max(0, uw - 2 * t);
      area18 += innerW * ud;
      edgeBandingMeters += innerW;

      // 3. Top Panel vs. 2x Top Stretchers (Üst Kayıt)
      if (u.type === "base" || u.type === "corner-base") {
        panelCount += 2;
        area18 += 2 * innerW * 0.08;
        edgeBandingMeters += 2 * innerW; // front edge of stretchers
      } else {
        panelCount += 1;
        area18 += innerW * ud;
        edgeBandingMeters += innerW; // front edge
      }

      // 4. Internal Shelves (front edge banded)
      const shelves = u.internalShelves || 0;
      if (shelves > 0) {
        panelCount += shelves;
        const shelfD = Math.max(0, ud - 0.045);
        area18 += shelves * (innerW * shelfD);
        edgeBandingMeters += shelves * innerW;
      }

      // 5. Doors (Full perimeter banded: 2 * (w + h))
      const doorH = Math.max(0, uh - 0.004);
      const isCornerDouble = u.doorType === "cornerDouble";
      const isDouble = u.doorType === "double" || isCornerDouble;
      const isSingle = u.doorType === "singleLeft" || u.doorType === "singleRight" || u.doorType === "flipUp";

      if (isDouble) {
        panelCount += 2;
        const singleDoorW = uw / 2 - 0.004;
        area18 += 2 * (singleDoorW * doorH);
        edgeBandingMeters += 2 * (2 * (singleDoorW + doorH));

        // Hinges: 2 hinges per door minimum, 3 if doorH > 1.2m
        const hingesPerDoor = doorH > 1.2 ? 3 : 2;
        hinges += 2 * hingesPerDoor;
        handles += 2;
      } else if (isSingle) {
        panelCount += 1;
        const singleDoorW = uw - 0.004;
        area18 += singleDoorW * doorH;
        edgeBandingMeters += 2 * (singleDoorW + doorH);

        const hingesPerDoor = doorH > 1.2 ? 3 : 2;
        hinges += hingesPerDoor;
        handles += 1;
      }

      // 6. Drawers (Front 4 edges banded, box panels front edge banded)
      const drawerCount = u.drawerCount || 0;
      if (drawerCount > 0) {
        panelCount += drawerCount * 5;
        const dh = uh / drawerCount;
        const boxH = Math.max(0.1, dh - 0.06);
        const boxW = Math.max(0.1, uw - 2 * t - 0.026);
        const boxD = Math.max(0.2, ud - 0.05);

        area18 += drawerCount * (uw * (dh - 0.006) + 2 * (boxD * boxH) + 2 * (boxW * boxH) + boxW * boxD);
        // Drawer front perimeter + box top edges
        edgeBandingMeters += drawerCount * (2 * (uw + dh) + 2 * boxD + 2 * boxW);

        slides += drawerCount;
        handles += drawerCount;
      }

      // 7. Legs (Base cabinets use 4 legs per unit)
      if (u.type === "base" || u.type === "corner-base") {
        legs += 4;
      }

      // 8. Back Panel (Arkalık: 8mm MDF-Lam)
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

      // 1. Side Gables (full perimeter front + bottom)
      panelCount += 2;
      area18 += 2 * (uh * ud);
      edgeBandingMeters += 2 * (uh + ud);

      // 2. Bottom Panel
      panelCount += 1;
      const innerW = Math.max(0, uw - 2 * t);
      area18 += innerW * ud;
      edgeBandingMeters += innerW;

      // 3. Top Panel
      panelCount += 1;
      area18 += innerW * ud;
      edgeBandingMeters += innerW;

      // 4. Center Vertical Partition
      if (u.hasInternalDivider) {
        panelCount += 1;
        const partH = Math.max(0, uh - 2 * t);
        area18 += partH * Math.max(0, ud - 0.02);
        edgeBandingMeters += partH;
      }

      // 5. Internal Shelves
      const shelves = u.internalShelves || 0;
      if (shelves > 0) {
        panelCount += shelves;
        const shelfW = u.hasInternalDivider ? (uw - 3 * t) / 2 : innerW;
        area18 += shelves * (Math.max(0, shelfW) * Math.max(0, ud - 0.045));
        edgeBandingMeters += shelves * Math.max(0, shelfW);
      }

      // 6. Doors
      const doorH = Math.max(0, uh - 0.004);
      if (u.doorType === "hingedDouble" || u.doorType === "sliding") {
        panelCount += 2;
        const singleW = uw / 2 - 0.004;
        area18 += 2 * (singleW * doorH);
        edgeBandingMeters += 2 * (2 * (singleW + doorH));

        if (u.doorType === "hingedDouble") {
          // Standard tall wardrobe hinged door has 4-5 hinges
          const hingesPerDoor = doorH > 1.8 ? 5 : 4;
          hinges += 2 * hingesPerDoor;
        }
        handles += 2;
      } else if (u.doorType === "hingedSingle") {
        panelCount += 1;
        const singleW = uw - 0.004;
        area18 += singleW * doorH;
        edgeBandingMeters += 2 * (singleW + doorH);

        const hingesPerDoor = doorH > 1.8 ? 5 : 4;
        hinges += hingesPerDoor;
        handles += 1;
      }

      // 7. Drawers
      if (u.hasDrawers && (u.drawerCount || 0) > 0) {
        const dCount = u.drawerCount || 2;
        panelCount += dCount * 5;
        const dH = (u.drawerHeight || 200) / 1000;
        const boxW = Math.max(0.2, uw - 2 * t - 0.03);
        const boxD = Math.max(0.2, ud - 0.05);

        area18 += dCount * (uw * dH + 2 * (boxD * dH) + 2 * (boxW * dH) + boxW * boxD);
        edgeBandingMeters += dCount * (2 * (uw + dH) + 2 * boxD + 2 * boxW);

        slides += dCount;
        handles += dCount;
      }

      // 8. Clothes Hanger Rod
      if (u.hasClothesHangerRail !== false) {
        hangerRods += 1;
      }

      // 9. Base legs
      legs += 4;

      // 10. Back Panel (8mm MDF-Lam)
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
    // Shelf front edges + gable front edges
    edgeBandingMeters = 2 * wM + (2 + cols - 1) * hM + cols * shelves * (wM / cols);
    legs += 4;

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
    edgeBandingMeters = 2 * (wM + dM) * 1.5;

    if (params.hasDrawers) {
      const dCount = params.drawerCount || 1;
      slides += dCount;
      handles += dCount;
    }
    legs += 4;
  }

  // 15% cutting kerf & trim factor
  const kerfFactor = 1.15;
  const netArea18 = area18 * 1.05; // 5% manufacturing edge banding tolerance
  const isPlywood = params.materialType === "plywood";

  // Standard Turkish Plate sizes:
  // Plywood: 2440 x 1220 mm = 2.9768 m²
  // MDF-Lam (Turkish Standard Jumbo): 2800 x 2100 mm = 5.88 m²
  const sheetArea = isPlywood ? 2.98 : 5.88;
  const sheetLabel = isPlywood ? "2440×1220mm Huş Plywood" : "2800×2100mm MDF-Lam Plaka";

  // Tam plaka hesabı - kalan fire bizden (Math.ceil)
  const stdSheets = Math.max(1, Math.ceil((netArea18 * kerfFactor) / sheetArea));
  const stdSheets8mm = area8 > 0 ? Math.max(1, Math.ceil((area8 * kerfFactor) / 5.88)) : 0;

  // Density calculation
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

  // --- MALİYET VE FİYATLANDIRMA HESAPLARI (TÜRKİYE ÜRETİM STANDARTLARI) ---
  // 1. Plaka Birim Fiyatı Seçimi
  const price18PerSheet = isPlywood
    ? prices.sheet18Plywood
    : params.materialType === "whiteStudio"
    ? prices.sheet18White
    : prices.sheet18ColorWood;

  const price8PerSheet =
    params.materialType === "whiteStudio"
      ? prices.sheet8White
      : prices.sheet8Color;

  const material18Cost = stdSheets * price18PerSheet;
  const material8Cost = stdSheets8mm * price8PerSheet;
  const totalMaterialCost = material18Cost + material8Cost;

  // 2. Ebatlama & CNC Kesim Maliyeti
  const cuttingCncCost =
    stdSheets * prices.cuttingCnc18 + stdSheets8mm * prices.cuttingCnc8;

  // 3. PVC Kenar Bandı Maliyeti (1mm PVC çekim dahil)
  const roundedBandingMeters = Math.ceil(edgeBandingMeters * 1.1); // %10 pay
  const edgeBandingCost = roundedBandingMeters * prices.edgeBandingPerMeter;

  // 4. Aksesuar ve Donanım Maliyeti
  const hardwareCost =
    hinges * prices.hingeSoftClose +
    slides * prices.slideTandem +
    handles * prices.handle +
    legs * prices.leg +
    hangerRods * prices.hangerRod;

  // 5. Atölye Toplama İşçiliği (Minifikssiz kavela + tutkal presli üretim)
  const workshopLaborCost = stdSheets * prices.workshopAssemblyPerSheet;

  // 6. Şantiye Montaj İşçiliği (%10)
  // Taban üretim maliyeti üzerinden montaj işçiliği
  const baseProductionCost =
    totalMaterialCost +
    cuttingCncCost +
    edgeBandingCost +
    hardwareCost +
    workshopLaborCost;

  const siteInstallationCost = Math.round(
    baseProductionCost * (prices.siteInstallationPercent / 100)
  );

  // 7. Nakliye Bedeli
  // options.shippingShare belirtilmişse onu kullanır; options.includeShippingInItem ise prices.shippingFeeTL kullanır; yoksa 0 (proje toplamında 1 kez eklenir)
  const shippingCost =
    options?.shippingShare !== undefined
      ? options.shippingShare
      : options?.includeShippingInItem
      ? prices.shippingFeeTL
      : 0;

  // 8. Net Üretim Maliyeti (Kârsız)
  const totalNetCost = baseProductionCost + siteInstallationCost + shippingCost;

  // 9. Müşteri Teklif / Satış Fiyatı (Örn: %35 kâr marjı)
  const profitAmount = Math.round(
    totalNetCost * (prices.profitMarginPercent / 100)
  );
  const customerPrice = totalNetCost + profitAmount;

  const hardware: HardwareBreakdown = {
    hinges,
    slides,
    handles,
    legs,
    hangerRods,
  };

  const cost: CostBreakdown = {
    material18Cost,
    material8Cost,
    totalMaterialCost,
    cuttingCncCost,
    edgeBandingCost,
    hardwareCost,
    workshopLaborCost,
    baseProductionCost,
    siteInstallationCost,
    shippingCost,
    totalNetCost,
    profitAmount,
    customerPrice,
  };

  return {
    panelCount,
    backPanelCount,
    totalParts: panelCount + backPanelCount,
    surfaceArea18mm: Number(netArea18.toFixed(2)),
    surfaceArea8mm: Number(area8.toFixed(2)),
    totalSurfaceArea: Number((netArea18 + area8).toFixed(2)),
    stdSheets,
    stdSheets8mm,
    sheetArea,
    sheetLabel,
    isPlywood,
    estimatedWeight,
    edgeBandingMeters: roundedBandingMeters,
    hardware,
    cost,
  };
}
