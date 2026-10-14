"use client";

import { useEffect, useState, use } from "react";
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
  MdChevronRight,
  MdAdd,
  MdLayers,
  MdStraighten,
  MdSquareFoot,
  MdLineWeight,
  MdLockOutline,
  MdViewInAr,
} from "react-icons/md";
import { FaChevronLeft } from "react-icons/fa";
import styles from "./projectDetail.module.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectFurnituresPage({ params }: PageProps) {
  const { id: projectId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [furnitures, setFurnitures] = useState<FurnitureItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Derived Optimization Metrics for CNC & Material Cuts
  const totalPanels = furnitures.reduce((sum, f) => sum + (f.panelCount || 0), 0);
  const totalSurfaceArea = furnitures.reduce((sum, f) => sum + (f.surfaceArea || 0), 0);
  const totalWeight = furnitures.reduce((sum, f) => sum + (f.estimatedWeight || 0), 0);

  if (!authLoading && !user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <MdLockOutline />
          </div>
          <h2 className={styles.emptyTitle}>Sign In Required</h2>
          <p className={styles.emptyDesc}>
            Sign in to access furnitures and optimization parameters for this project.
          </p>
          <Link href="/login" className={styles.addFurnitureBtn}>
            Sign In
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
          <span>Projects</span>
        </Link>
        <MdChevronRight size={14} color="var(--textMuted)" />
        <span className={styles.crumbCurrent}>
          {project?.name || "Project Details"}
        </span>
      </nav>

      {/* Project Header & Add Furniture Action */}
      <header className={styles.projectHeader}>
        <div className={styles.headerMain}>
          <div className={styles.titleRow}>
            <h1 className={styles.projectTitle}>
              {project?.name || "Project Furnitures"}
            </h1>
            {project?.type && (
              <span className={styles.typeBadge}>{project.type}</span>
            )}
          </div>
          <p className={styles.headerSubtitle}>
            Optimization specifications, cutting lists, and parametric components
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link
            href={`/projects/${projectId}/model`}
            className={styles.addFurnitureBtn}
          >
            <MdAdd size={18} />
            <span>Add New Furniture</span>
          </Link>
        </div>
      </header>

      {/* Optimization Summary Bar (No 3D data, pure optimization metrics) */}
      <section className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdLayers />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Pieces</span>
            <span className={styles.metricValue}>{furnitures.length}</span>
            <span className={styles.metricSub}>Furniture items</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdSquareFoot />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Board Area</span>
            <span className={styles.metricValue}>
              {totalSurfaceArea.toFixed(2)} m²
            </span>
            <span className={styles.metricSub}>Est. sheet consumption</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdStraighten />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Panels / Cuts</span>
            <span className={styles.metricValue}>{totalPanels}</span>
            <span className={styles.metricSub}>For CNC nesting</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <MdLineWeight />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Total Weight</span>
            <span className={styles.metricValue}>
              {totalWeight.toFixed(1)} kg
            </span>
            <span className={styles.metricSub}>Est. material load</span>
          </div>
        </div>
      </section>

      {/* Empty State */}
      {!loading && furnitures.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <MdLayers />
          </div>
          <h2 className={styles.emptyTitle}>No Furniture Added Yet</h2>
          <p className={styles.emptyDesc}>
            This project does not contain any furniture pieces. Click below to add
            your first parametric piece and configure its dimensions.
          </p>
          <Link
            href={`/projects/${projectId}/model`}
            className={styles.addFurnitureBtn}
          >
            <MdAdd size={18} />
            <span>Create First Furniture</span>
          </Link>
        </div>
      )}

      {/* Furniture Grid with Basic Optimization Details */}
      {!loading && furnitures.length > 0 && (
        <section className={styles.furnitureGrid}>
          {furnitures.map((item) => (
            <article key={item.id} className={styles.furnitureCard}>
              <div className={styles.cardHead}>
                <h3 className={styles.furnitureTitle}>{item.name}</h3>
                <span className={styles.categoryTag}>{item.category}</span>
              </div>

              {/* Dimensions Box */}
              <div className={styles.dimensionsBox}>
                <div className={styles.dimItem}>
                  <span className={styles.dimName}>Width</span>
                  <span className={styles.dimVal}>
                    {item.width} <span className={styles.dimUnit}>mm</span>
                  </span>
                </div>
                <div className={styles.dimItem}>
                  <span className={styles.dimName}>Depth</span>
                  <span className={styles.dimVal}>
                    {item.depth} <span className={styles.dimUnit}>mm</span>
                  </span>
                </div>
                <div className={styles.dimItem}>
                  <span className={styles.dimName}>Height</span>
                  <span className={styles.dimVal}>
                    {item.height} <span className={styles.dimUnit}>mm</span>
                  </span>
                </div>
              </div>

              {/* Optimization Specs */}
              <div className={styles.optSpecsList}>
                <div className={optRowClass(styles)}>
                  <span className={styles.optLabel}>Material</span>
                  <span className={styles.optVal}>{item.material}</span>
                </div>
                <div className={optRowClass(styles)}>
                  <span className={styles.optLabel}>Panels / Parts</span>
                  <span className={styles.optVal}>{item.panelCount} cuts</span>
                </div>
                <div className={optRowClass(styles)}>
                  <span className={styles.optLabel}>Surface Area</span>
                  <span className={styles.optVal}>{item.surfaceArea} m²</span>
                </div>
                <div className={optRowClass(styles)}>
                  <span className={styles.optLabel}>Est. Weight</span>
                  <span className={styles.optVal}>{item.estimatedWeight} kg</span>
                </div>
              </div>

              {/* Action to Modeler */}
              <div className={styles.cardActions}>
                <Link
                  href={`/projects/${projectId}/model?furnitureId=${item.id}`}
                  className={styles.modelerBtn}
                >
                  <MdViewInAr size={16} />
                  <span>Open in 3D Modeler</span>
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function optRowClass(styles: Record<string, string>) {
  return styles.optRow;
}
