"use client";
import styles from "./Features.module.css";

type Cell = string | { v: string; note?: string };

const rows: { label: string; otune: Cell; vendor: Cell; diy: Cell }[] = [
  { label: "Time to first model",       otune: "~6 hours",                  vendor: "4–8 weeks",                diy: "3–6 months" },
  { label: "Base model selection",      otune: "Researched per project",    vendor: "Vendor default",           diy: "Whatever you read on Twitter" },
  { label: "Dataset",                   otune: "5,000+ exam-grade rows",    vendor: "You bring it",             diy: "You build it" },
  { label: "Eval methodology",          otune: "Senior-model grading",      vendor: "Loss curves",              diy: "Loss curves" },
  { label: "Patch when it fails",       otune: "Surgical LoRA patch",       vendor: "Re-quote, re-train",       diy: "Start over" },
  { label: "Where weights live",        otune: "Your VPC, your bucket",     vendor: "Vendor inference API",     diy: "Wherever you put them" },
  { label: "Lock-in",                   otune: "None — you own the weights", vendor: "API contract + per-token",  diy: "None, but no support" },
  { label: "Pricing model",             otune: "Fixed quote, 50 / 50",      vendor: "Setup fee + per-token",    diy: "Salary × headcount" },
  { label: "Starts at",                 otune: "$4,900",                    vendor: "$50k+ engagement",         diy: "1–2 ML hires" },
];

const cols = [
  { key: "otune",  label: "O'Tune",                  sub: "this page" },
  { key: "vendor", label: "Typical fine-tuning vendor", sub: "consulting model" },
  { key: "diy",    label: "Hiring an ML team",       sub: "DIY" },
] as const;

export function Features() {
  return (
    <section id="models" className={styles.section}>
      <div className="frame">
        <div className={styles.head}>
          <span className="eyebrow">What you'd compare us against</span>
          <h2 className={styles.h2}>
            Three honest ways to fine-tune a model.
          </h2>
          <p className={styles.sub}>
            We didn't invent fine-tuning. You have other options. Here's how we
            stack up against the two we hear about most when we talk to customers.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thLabel} />
                {cols.map((c, i) => (
                  <th key={c.key} className={`${styles.th} ${i === 0 ? styles.thUs : ""}`}>
                    <div className={styles.thMain}>{c.label}</div>
                    <div className={styles.thSub}>{c.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th className={styles.rowLabel} scope="row">{r.label}</th>
                  {cols.map((c, i) => {
                    const cell = r[c.key];
                    const v = typeof cell === "string" ? cell : cell.v;
                    return (
                      <td key={c.key} className={`${styles.td} ${i === 0 ? styles.tdUs : ""}`}>{v}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
