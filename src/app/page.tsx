"use client";

import Link from "next/link";
import { MdWorkOutline, MdLayers, MdArrowForward } from "react-icons/md";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.statusCard}>
          <div className={styles.heroBadge}>
            <MdLayers size={14} />
            <span>Parametric Furniture Studio</span>
          </div>

          <h1 className={styles.cardTitle}>3D Studio & Generator</h1>
          <p className={styles.cardDescription}>
            Design customizable parametric furniture in real-time, view linked
            Cadance client projects, and export production-ready 3D files (.OBJ, .GLTF, .STL).
          </p>

          <div className={styles.specsList}>
            <div className={styles.specItem}>
              <span className={styles.specDot} />
              <span>Synced with <strong>Cadance Dashboard</strong> Firebase backend</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specDot} />
              <span>Real-time project furnitures viewer & cutting lists</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specDot} />
              <span>Built with Next.js 16, React Three Fiber & Three.js</span>
            </div>
          </div>

          <div className={styles.actionRow}>
            <Link href="/projects" className={styles.primaryBtn}>
              <MdWorkOutline size={16} />
              <span>View Cadance Projects</span>
              <MdArrowForward size={14} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
