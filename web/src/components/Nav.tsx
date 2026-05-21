"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./Nav.module.css";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`frame ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="O'Tune — home">
          O&rsquo;Tune
        </Link>

        <nav className={styles.links}>
          <Link href="/#how">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#security">Security</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/about">About</Link>
        </nav>

        <div className={styles.right}>
          <Link href="/dashboard" className={styles.muted}>Sign in</Link>
          <a href="mailto:founders@otune.ai?subject=Quote%20request" className={styles.action}>
            Get a quote <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </header>
  );
}
