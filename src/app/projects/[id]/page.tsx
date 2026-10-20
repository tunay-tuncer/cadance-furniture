"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ProjectItem,
  subscribeToUserProject,
} from "@/lib/firebase/projectService";
import {
  FurnitureItem,
  subscribeToProjectFurnitures,
} from "@/lib/firebase/furnitureService";
import {
  calculateProductionMetrics,
  DEFAULT_UNIT_PRICES,
  UnitPrices,
  ProductionMetrics,
} from "@/lib/production/productionCalculator";
import { FurnitureParams } from "@/components/modeler/FurnitureMesh";
import {
  MdChevronRight,
  MdAdd,
  MdLayers,
  MdStraighten,
  MdSquareFoot,
  MdLineWeight,
  MdLockOutline,
  MdViewInAr,
  MdSettings,
  MdClose,
  MdAttachMoney,
  MdTrendingUp,
  MdExpandMore,
  MdExpandLess,
  MdRefresh,
  MdLocalShipping,
} from "react-icons/md";
import { FaChevronLeft } from "react-icons/fa";
import styles from "./projectDetail.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STORAGE_KEY = "cadance_unit_prices";

// Helper to format currency in Turkish Lira
const formatTRY = (val: number): string => {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export default function ProjectFurnituresPage({ params }: PageProps) {
  const { id: projectId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [furnitures, setFurnitures] = useState<FurnitureItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Unit Prices & Pricing Settings State
  const [unitPrices, setUnitPrices] = useState<UnitPrices>(DEFAULT_UNIT_PRICES);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempPrices, setTempPrices] = useState<UnitPrices>(DEFAULT_UNIT_PRICES);

  // Accordion state for BOM breakdown per furniture item ID
  const [expandedBOM, setExpandedBOM] = useState<Record<string, boolean>>({});

  const toggleBOM = (id: string) => {
    setExpandedBOM((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Load saved unit prices from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUnitPrices((prev) => ({ ...prev, ...parsed }));
        setTempPrices((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.warn("Could not load unit prices from localStorage", err);
    }
  }, []);

  // Subscribe to Project and its Furnitures
  useEffect(() => {
    if (!user?.uid || !projectId) return;

    const unsubProj = subscribeToUserProject(user.uid, projectId, (proj) => {
      setProject(proj);
    });

    const unsubFurn = subscribeToProjectFurnitures(
      user.uid,
      projectId,
      (items) => {
        setFurnitures(items);
        setLoading(false);
      }
    );

    return () => {
      unsubProj();
      unsubFurn();
    };
  }, [user?.uid, projectId]);

  // Compute production metrics for each furniture item with the active unitPrices
  // Notice: individual furniture items don't include shipping (includeShippingInItem: false)
  // so shipping is charged ONCE at project level regardless of how many furnitures exist.
  const furnituresWithMetrics = useMemo(() => {
    return furnitures.map((item) => {
      // Build fallback params if item.params was not stored
      const p: FurnitureParams = item.params || {
        name: item.name,
        category: (item.category as FurnitureParams["category"]) || "Custom",
        width: item.width,
        height: item.height,
        depth: item.depth,
        materialType: item.material?.toLowerCase().includes("plywood")
          ? "plywood"
          : item.material?.toLowerCase().includes("white")
            ? "whiteStudio"
            : "oak",
        boardThickness: 18,
      };

      const metrics: ProductionMetrics = calculateProductionMetrics(
        p,
        unitPrices,
        { includeShippingInItem: false }
      );
      return {
        item,
        metrics,
      };
    });
  }, [furnitures, unitPrices]);

  // Derived Project-Wide Totals
  // Fixed shipping fee: 3000 TL is added once for the whole project (if there is at least 1 furniture)
  const projectTotals = useMemo(() => {
    let panels = 0;
    let surfaceArea = 0;
    let weight = 0;
    let sheets18 = 0;
    let sheets8 = 0;
    let edgeBanding = 0;
    let itemsNetCostSum = 0;

    furnituresWithMetrics.forEach(({ metrics, item }) => {
      panels += metrics.totalParts || item.panelCount || 0;
      surfaceArea += metrics.totalSurfaceArea || item.surfaceArea || 0;
      weight += metrics.estimatedWeight || item.estimatedWeight || 0;
      sheets18 += metrics.stdSheets || 0;
      sheets8 += metrics.stdSheets8mm || 0;
      edgeBanding += metrics.edgeBandingMeters || 0;
      // Excludes shipping because each furniture has shippingCost = 0
      itemsNetCostSum += metrics.cost.totalNetCost || 0;
    });

    // 1 adet sabit nakliye (1 mobilya da olsa 10 mobilya da olsa toplam 1 nakliye)
    const projectShippingFee = furnitures.length > 0 ? (unitPrices.shippingFeeTL ?? 3000) : 0;
    const netCost = itemsNetCostSum + projectShippingFee;
    const profitAmount = Math.round(netCost * (unitPrices.profitMarginPercent / 100));
    const customerPrice = netCost + profitAmount;

    return {
      panels,
      surfaceArea,
      weight,
      sheets18,
      sheets8,
      totalSheets: sheets18 + sheets8,
      edgeBanding,
      projectShippingFee,
      itemsNetCostSum,
      netCost,
      profitAmount,
      customerPrice,
    };
  }, [furnituresWithMetrics, furnitures.length, unitPrices]);

  // Handle saving modified unit prices
  const handleSavePrices = () => {
    setUnitPrices(tempPrices);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tempPrices));
    } catch (err) {
      console.warn("Could not save unit prices to localStorage", err);
    }
    setIsSettingsOpen(false);
  };

  const handleResetPrices = () => {
    setTempPrices(DEFAULT_UNIT_PRICES);
  };

  if (!authLoading && !user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <MdLockOutline />
          </div>
          <h2 className={styles.emptyTitle}>Giriş Yapılması Gerekiyor</h2>
          <p className={styles.emptyDesc}>
            Bu projenin mobilyalarına ve üretim maliyetlerine erişmek için lütfen giriş yapın.
          </p>
          <Link href="/login" className={styles.addFurnitureBtn}>
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumb}>
        <Link href="/projects" className={styles.backLink}>
          <FaChevronLeft size={10} />
          <span>Projeler</span>
        </Link>
        <MdChevronRight size={14} color="var(--textMuted)" />
        <span className={styles.crumbCurrent}>
          {project?.name || "Proje Detayları"}
        </span>
      </nav>

      {/* Project Header & Actions */}
      <header className={styles.projectHeader}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <h1 className={styles.projectTitle}>
              {project?.name || "Proje Mobilyaları"}
            </h1>
            {project?.type && (
              <span className={styles.typeBadge}>{project.type}</span>
            )}
          </div>
          <p className={styles.headerSubtitle}>
            Canlı imalat maliyeti, tam plaka fire hesapları, donanım listesi ve şantiye montaj fiyatlandırması
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.settingsBtn}
            onClick={() => {
              setTempPrices(unitPrices);
              setIsSettingsOpen(true);
            }}
            title="Birim Fiyat ve Kâr Marjı Ayarları"
          >
            <MdSettings size={18} />
            <span>Birim Fiyat Ayarları</span>
          </button>

          <Link
            href={`/projects/${projectId}/model`}
            className={styles.addFurnitureBtn}
          >
            <MdAdd size={18} />
            <span>Yeni Mobilya Ekle</span>
          </Link>
        </div>
      </header>

      {/* Comprehensive Optimization & Pricing Metrics Summary Bar */}
      <section className={styles.metricsBar}>
        {/* 1. Toplam Müşteri Satış Fiyatı */}
        <div className={styles.metricCard}>
          <div
            className={styles.metricIcon}
            style={{
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              borderColor: "rgba(56, 189, 248, 0.3)",
            }}
          >
            <MdTrendingUp />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Müşteri Satış Fiyatı</span>
            <span className={styles.metricValue} style={{ color: "#38bdf8" }}>
              {formatTRY(projectTotals.customerPrice)}
            </span>
            <span className={styles.metricSub}>%{unitPrices.profitMarginPercent} Marj Dahil</span>
          </div>
        </div>

        {/* 2. Toplam Net Üretim Maliyeti */}
        <div className={styles.metricCard}>
          <div
            className={styles.metricIcon}
            style={{
              background: "rgba(234, 179, 8, 0.12)",
              color: "#eab308",
              borderColor: "rgba(234, 179, 8, 0.3)",
            }}
          >
            <MdAttachMoney />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Net İmalat Maliyeti</span>
            <span className={styles.metricValue} style={{ color: "#fef08a" }}>
              {formatTRY(projectTotals.netCost)}
            </span>
            <span className={styles.metricSub}>
              Üretim + {formatTRY(projectTotals.projectShippingFee)} Sabit Nakliye (Tek)
            </span>
          </div>
        </div>

        {/* 3. Toplam Plaka Adedi (Tam Plaka Fireli) */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdLayers />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Tam Plaka İhtiyacı</span>
            <span className={styles.metricValue}>
              {projectTotals.totalSheets} <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>plaka</span>
            </span>
            <span className={styles.metricSub}>
              {projectTotals.sheets18}x 18mm + {projectTotals.sheets8}x 8mm arkalık
            </span>
          </div>
        </div>

        {/* 4. Toplam PVC Kenar Bandı */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdStraighten />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>PVC Kenar Bandı</span>
            <span className={styles.metricValue}>
              {projectTotals.edgeBanding} <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>mt</span>
            </span>
            <span className={styles.metricSub}>1mm PVC (Çekim dahil)</span>
          </div>
        </div>

        {/* 5. Toplam Kesim & Parça Adedi */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdSquareFoot />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>CNC Kesim Panelleri</span>
            <span className={styles.metricValue}>{projectTotals.panels}</span>
            <span className={styles.metricSub}>{projectTotals.surfaceArea.toFixed(1)} m² net alan</span>
          </div>
        </div>

        {/* 6. Toplam Ağırlık */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdLineWeight />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Toplam Ağırlık</span>
            <span className={styles.metricValue}>
              {projectTotals.weight.toFixed(0)} kg
            </span>
            <span className={styles.metricSub}>{furnitures.length} mobilya ünitesi</span>
          </div>
        </div>
      </section>

      {/* Empty State */}
      {!loading && furnitures.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <MdLayers />
          </div>
          <h2 className={styles.emptyTitle}>Henüz Mobilya Eklenmedi</h2>
          <p className={styles.emptyDesc}>
            Bu projede kayıtlı mobilya bulunmamaktadır. Parametrik 3D Studio ile ilk
            mobilyanızı tasarlamak ve canlı maliyetini hesaplamak için aşağıdaki butona tıklayın.
          </p>
          <Link
            href={`/projects/${projectId}/model`}
            className={styles.addFurnitureBtn}
          >
            <MdAdd size={18} />
            <span>İlk Mobilyayı Tasarla</span>
          </Link>
        </div>
      )}

      {/* Furniture Grid with Live Cost, Customer Price & BOM Details */}
      {!loading && furnitures.length > 0 && (
        <section className={styles.furnitureGrid}>
          {furnituresWithMetrics.map(({ item, metrics }) => {
            const isBOMOpen = !!expandedBOM[item.id];
            const { cost, hardware } = metrics;

            return (
              <article key={item.id} className={styles.furnitureCard}>
                <div className={styles.cardHead}>
                  <h3 className={styles.furnitureTitle}>{item.name}</h3>
                  <span className={styles.categoryTag}>{item.category}</span>
                </div>

                {/* Dimensions Box */}
                <div className={styles.dimensionsBox}>
                  <div className={styles.dimItem}>
                    <span className={styles.dimName}>Genişlik (W)</span>
                    <span className={styles.dimVal}>
                      {item.width} <span className={styles.dimUnit}>mm</span>
                    </span>
                  </div>
                  <div className={styles.dimItem}>
                    <span className={styles.dimName}>Derinlik (D)</span>
                    <span className={styles.dimVal}>
                      {item.depth} <span className={styles.dimUnit}>mm</span>
                    </span>
                  </div>
                  <div className={styles.dimItem}>
                    <span className={styles.dimName}>Yükseklik (H)</span>
                    <span className={styles.dimVal}>
                      {item.height} <span className={styles.dimUnit}>mm</span>
                    </span>
                  </div>
                </div>

                {/* Live Pricing & Cost Highlight Box */}
                <div className={styles.cardCostBox}>
                  <div className={styles.costRow}>
                    <span className={styles.costLabel}>Net İmalat Maliyeti</span>
                    <span className={styles.netCostVal}>
                      {formatTRY(cost.totalNetCost)}
                    </span>
                  </div>
                  <div className={styles.costRow}>
                    <span className={styles.costLabel} style={{ color: "#38bdf8" }}>
                      Müşteri Satış Fiyatı (%{unitPrices.profitMarginPercent})
                    </span>
                    <span className={styles.customerPriceVal}>
                      {formatTRY(cost.customerPrice)}
                    </span>
                  </div>
                </div>

                {/* Optimization Specs */}
                <div className={styles.optSpecsList}>
                  <div className={styles.optRow}>
                    <span className={styles.optLabel}>Malzeme</span>
                    <span className={styles.optVal}>{item.material}</span>
                  </div>
                  <div className={styles.optRow}>
                    <span className={styles.optLabel}>Tam Plaka İhtiyacı</span>
                    <span className={styles.optVal}>
                      {metrics.stdSheets} plaka (18mm)
                      {metrics.stdSheets8mm > 0 ? ` + ${metrics.stdSheets8mm} plaka (8mm)` : ""}
                    </span>
                  </div>
                  <div className={styles.optRow}>
                    <span className={styles.optLabel}>PVC Kenar Bandı</span>
                    <span className={styles.optVal}>{metrics.edgeBandingMeters} mt</span>
                  </div>
                  <div className={styles.optRow}>
                    <span className={styles.optLabel}>CNC Kesim Panelleri</span>
                    <span className={styles.optVal}>{metrics.totalParts} parça</span>
                  </div>
                </div>

                {/* BOM Accordion Toggle Button */}
                <button
                  type="button"
                  className={styles.bomToggleBtn}
                  onClick={() => toggleBOM(item.id)}
                >
                  <span>📋 Maliyet & Üretim Detayı (BOM)</span>
                  {isBOMOpen ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
                </button>

                {/* Collapsible BOM Content */}
                {isBOMOpen && (
                  <div className={styles.bomContent}>
                    <table className={styles.bomTable}>
                      <thead>
                        <tr>
                          <th>Kalem</th>
                          <th>Miktar</th>
                          <th>Tutar</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>18mm Gövde & Kapak Plakası</td>
                          <td>{metrics.stdSheets} plaka</td>
                          <td>{formatTRY(cost.material18Cost)}</td>
                        </tr>
                        {metrics.stdSheets8mm > 0 && (
                          <tr>
                            <td>8mm Arkalık Plakası</td>
                            <td>{metrics.stdSheets8mm} plaka</td>
                            <td>{formatTRY(cost.material8Cost)}</td>
                          </tr>
                        )}
                        <tr>
                          <td>CNC Ebatlama & Kanal İşçiliği</td>
                          <td>{metrics.stdSheets + metrics.stdSheets8mm} plaka</td>
                          <td>{formatTRY(cost.cuttingCncCost)}</td>
                        </tr>
                        <tr>
                          <td>1mm PVC Kenar Bandı & Çekim</td>
                          <td>{metrics.edgeBandingMeters} mt</td>
                          <td>{formatTRY(cost.edgeBandingCost)}</td>
                        </tr>
                        {hardware.hinges > 0 && (
                          <tr>
                            <td>Frenli Menteşe</td>
                            <td>{hardware.hinges} adet</td>
                            <td>{formatTRY(hardware.hinges * unitPrices.hingeSoftClose)}</td>
                          </tr>
                        )}
                        {hardware.slides > 0 && (
                          <tr>
                            <td>Tandem Frenli Ray Takımı</td>
                            <td>{hardware.slides} takım</td>
                            <td>{formatTRY(hardware.slides * unitPrices.slideTandem)}</td>
                          </tr>
                        )}
                        {hardware.handles > 0 && (
                          <tr>
                            <td>Mobilya Kulpu</td>
                            <td>{hardware.handles} adet</td>
                            <td>{formatTRY(hardware.handles * unitPrices.handle)}</td>
                          </tr>
                        )}
                        {hardware.legs > 0 && (
                          <tr>
                            <td>Baza / Gövde Ayakları</td>
                            <td>{hardware.legs} adet</td>
                            <td>{formatTRY(hardware.legs * unitPrices.leg)}</td>
                          </tr>
                        )}
                        {hardware.hangerRods > 0 && (
                          <tr>
                            <td>Askı Borusu Takımı</td>
                            <td>{hardware.hangerRods} takım</td>
                            <td>{formatTRY(hardware.hangerRods * unitPrices.hangerRod)}</td>
                          </tr>
                        )}
                        <tr>
                          <td>Atölye Pres Toplama (Minifikssiz)</td>
                          <td>{metrics.stdSheets} plaka</td>
                          <td>{formatTRY(cost.workshopLaborCost)}</td>
                        </tr>
                        <tr>
                          <td>Şantiye Montaj İşçiliği (%{unitPrices.siteInstallationPercent})</td>
                          <td>İşçilik</td>
                          <td>{formatTRY(cost.siteInstallationCost)}</td>
                        </tr>
                        <tr style={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)" }}>
                          <td>
                            <strong>Mobilya İmalat Maliyeti</strong>
                            <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: "normal" }}>
                              *Sabit nakliye ({formatTRY(unitPrices.shippingFeeTL ?? 3000)}) proje genelinde tek sefer eklenir.
                            </div>
                          </td>
                          <td>-</td>
                          <td><strong>{formatTRY(cost.totalNetCost)}</strong></td>
                        </tr>
                        <tr>
                          <td>Kâr Marjı Tutarı (%{unitPrices.profitMarginPercent})</td>
                          <td>-</td>
                          <td>{formatTRY(cost.profitAmount)}</td>
                        </tr>
                        <tr>
                          <td style={{ color: "#38bdf8" }}><strong>Müşteri Satış Fiyatı</strong></td>
                          <td>-</td>
                          <td style={{ color: "#38bdf8" }}><strong>{formatTRY(cost.customerPrice)}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Action to Modeler */}
                <div className={styles.cardActions}>
                  <Link
                    href={`/projects/${projectId}/model?furnitureId=${item.id}`}
                    className={styles.modelerBtn}
                  >
                    <MdViewInAr size={16} />
                    <span>3D Modeler'da Aç</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Unit Prices & Profit Margin Settings Modal */}
      {isSettingsOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsSettingsOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2 className={styles.modalTitle}>
                <MdSettings size={20} color="var(--accent)" />
                <span>⚙️ Birim Fiyat & Kâr Marjı Ayarları</span>
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Kapat"
              >
                <MdClose size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* 1. Plaka Birim Fiyatları */}
              <div className={styles.settingsSection}>
                <h4 className={styles.settingsSectionTitle}>1. Plaka Fiyatları (TL / Tam Plaka)</h4>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>18mm Beyaz Plaka</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={tempPrices.sheet18White}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, sheet18White: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>18mm Renkli / Ahşap Desenli</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={tempPrices.sheet18ColorWood}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, sheet18ColorWood: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>18mm Huş Plywood (2440×1220)</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={tempPrices.sheet18Plywood}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, sheet18Plywood: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>8mm Beyaz Arkalık</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={tempPrices.sheet8White}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, sheet8White: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>8mm Renkli Arkalık</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={tempPrices.sheet8Color}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, sheet8Color: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Kesim, CNC & Kenar Bandı */}
              <div className={styles.settingsSection}>
                <h4 className={styles.settingsSectionTitle}>2. Ebatlama, CNC & Kenar Bandı</h4>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>18mm Ebatlama + CNC Kesim</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={tempPrices.cuttingCnc18}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, cuttingCnc18: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / plaka</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>8mm Arkalık Kesimi</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={tempPrices.cuttingCnc8}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, cuttingCnc8: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / plaka</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>1mm PVC Kenar Bandı (Çekim Dahil)</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={tempPrices.edgeBandingPerMeter}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, edgeBandingPerMeter: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / mt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Donanım & Aksesuar Birim Fiyatları */}
              <div className={styles.settingsSection}>
                <h4 className={styles.settingsSectionTitle}>3. Aksesuar & Donanım</h4>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Frenli Menteşe</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={tempPrices.hingeSoftClose}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, hingeSoftClose: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / adet</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Tandem Gizli Frenli Ray</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="25"
                        value={tempPrices.slideTandem}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, slideTandem: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / takım</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Mobilya Kulpu</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={tempPrices.handle}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, handle: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / adet</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Baza / Gövde Ayağı</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={tempPrices.leg}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, leg: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / adet</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Askı Borusu + Rozet</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="25"
                        value={tempPrices.hangerRod}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, hangerRod: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / takım</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. İşçilik, Şantiye Montaj & Kâr Marjı */}
              <div className={styles.settingsSection}>
                <h4 className={styles.settingsSectionTitle}>4. İşçilik, Montaj & Kâr Marjı</h4>
                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Atölye Toplama (Minifikssiz Pres)</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={tempPrices.workshopAssemblyPerSheet}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, workshopAssemblyPerSheet: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / plaka</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Şantiye Montaj İşçiliği</label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={tempPrices.siteInstallationPercent}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, siteInstallationPercent: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>%</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel} style={{ color: "#facc15", fontWeight: 600 }}>
                      Sabit Proje Nakliyesi (Tek Sefer)
                    </label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        step="250"
                        value={tempPrices.shippingFeeTL}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, shippingFeeTL: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>TL / proje</span>
                    </div>
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel} style={{ color: "#38bdf8", fontWeight: 600 }}>
                      Kâr Marjı
                    </label>
                    <div className={styles.inputGroup}>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        step="1"
                        value={tempPrices.profitMarginPercent}
                        onChange={(e) =>
                          setTempPrices({ ...tempPrices, profitMarginPercent: Number(e.target.value) || 0 })
                        }
                      />
                      <span className={styles.inputUnit}>%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFoot}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetPrices}
              >
                <MdRefresh size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                Varsayılanlara Sıfırla
              </button>
              <button
                type="button"
                className={styles.saveSettingsBtn}
                onClick={handleSavePrices}
              >
                Ayarları Kaydet & Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

