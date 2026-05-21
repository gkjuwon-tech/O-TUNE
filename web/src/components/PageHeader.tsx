import styles from "./PageHeader.module.css";

export function PageHeader({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <header className={styles.head}>
      <div className="frame">
        <span className={styles.kicker}>{kicker}</span>
        <h1 className={styles.h1}>{title}</h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>
    </header>
  );
}
