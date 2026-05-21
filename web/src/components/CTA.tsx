"use client";
import styles from "./CTA.module.css";

export function CTA() {
  return (
    <section className={styles.section}>
      <div className="frame">
        <div className={styles.grid}>
          <p className={styles.kicker}>If you've read this far —</p>
          <h2 className={styles.h2}>
            Tell us what you're trying to build.
          </h2>
          <p className={styles.body}>
            Send us a paragraph about your use case. We'll reply with a yes,
            a no, or a question, usually within a few hours. If it's a yes,
            you'll have a quote in your inbox by the next morning.
          </p>
          <p className={styles.contact}>
            <a href="mailto:founders@otune.ai?subject=Use%20case" className={styles.email}>
              founders@otune.ai
            </a>
            <span className={styles.sep}>·</span>
            <span className={styles.sig}>Junho &amp; Mira, founders</span>
          </p>
        </div>
      </div>
    </section>
  );
}
