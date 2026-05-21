import Link from "next/link";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`frame ${styles.inner}`}>
        <div className={styles.left}>
          <span className={styles.brand}>O&rsquo;Tune</span>
          <span className={styles.sep}>·</span>
          <span className={styles.muted}>An ML studio. Brooklyn, NY.</span>
        </div>

        <nav className={styles.right} aria-label="Footer">
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
      <div className={`frame ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} O&rsquo;Tune Studio, Inc.</span>
        <span className={styles.muted}>Last updated 21 May 2026</span>
      </div>
    </footer>
  );
}
