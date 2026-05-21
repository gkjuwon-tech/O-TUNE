"use client";
import styles from "./Pricing.module.css";

const tiers = [
  { name: "Pilot",      price: "$4,900",  cadence: "fixed, per project" },
  { name: "Production", price: "$14,900", cadence: "fixed, per project" },
  { name: "Fleet",      price: "Custom",  cadence: "annual program" },
];

type Row =
  | { kind: "section"; label: string }
  | { kind: "row"; label: string; values: [string, string, string]; note?: string };

const rows: Row[] = [
  { kind: "section", label: "Dataset & training" },
  { kind: "row", label: "Dataset rows",            values: ["up to 5,000",        "up to 20,000",        "unlimited"] },
  { kind: "row", label: "Base model size",         values: ["7–9B",                "up to 70B",          "any open-weight"] },
  { kind: "row", label: "LoRA patch rounds",       values: ["1",                   "3",                   "unlimited"] },
  { kind: "row", label: "Held-out eval",           values: ["400 questions",      "800 questions",       "custom rubric"] },

  { kind: "section", label: "Delivery" },
  { kind: "row", label: "Weights you keep",        values: ["safetensors",         "safetensors + GGUF",  "safetensors + GGUF"] },
  { kind: "row", label: "Docker image",            values: ["—",                   "yes",                  "yes, hardened"] },
  { kind: "row", label: "Runbook",                 values: ["yes",                 "yes",                  "yes + deployment workshop"] },
  { kind: "row", label: "Eval report (signed PDF)",values: ["yes",                 "yes",                  "yes"] },

  { kind: "section", label: "Working with us" },
  { kind: "row", label: "Support",                 values: ["email",               "shared Slack, 1-day SLA","dedicated engineer"] },
  { kind: "row", label: "Compliance package",      values: ["DPA",                 "DPA + SOC2 evidence",  "DPA + SOC2 + custom"] },
  { kind: "row", label: "Where training runs",     values: ["our RunPod org",      "our RunPod org",      "your AWS / on-prem"] },

  { kind: "section", label: "Billing" },
  { kind: "row", label: "Deposit",                 values: ["50% on start",        "50% on start",        "net-30, milestone-based"] },
  { kind: "row", label: "Balance",                 values: ["50% on acceptance",   "50% on acceptance",   "milestone-based"] },
];

export function Pricing() {
  return (
    <section id="pricing" className={styles.section}>
      <div className="frame">
        <div className={styles.head}>
          <span className="eyebrow">Pricing</span>
          <h2 className={styles.h2}>Fixed quote. Half on start, half when it works.</h2>
          <p className={styles.sub}>
            We don't bill per token, per seat, or per anything. You get a single
            number on a single PDF. If the finished model doesn't earn your
            second payment, we delete the weights and you walk away.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thBlank} />
                {tiers.map((t, i) => (
                  <th key={t.name} className={`${styles.th} ${i === 1 ? styles.thHighlight : ""}`}>
                    <div className={styles.tierName}>{t.name}</div>
                    <div className={styles.tierPrice}>{t.price}</div>
                    <div className={styles.tierCadence}>{t.cadence}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) =>
                r.kind === "section" ? (
                  <tr key={idx} className={styles.sectionRow}>
                    <th colSpan={4}>{r.label}</th>
                  </tr>
                ) : (
                  <tr key={idx}>
                    <th scope="row" className={styles.rowLabel}>{r.label}</th>
                    {r.values.map((v, i) => (
                      <td key={i} className={`${styles.td} ${i === 1 ? styles.tdHighlight : ""}`}>{v}</td>
                    ))}
                  </tr>
                ),
              )}
              <tr>
                <td />
                {tiers.map((t, i) => (
                  <td key={t.name} className={`${styles.tdAction} ${i === 1 ? styles.tdHighlight : ""}`}>
                    <a href="mailto:founders@otune.ai?subject=Quote%20request" className={styles.action}>
                      {t.name === "Fleet" ? "Talk to us" : `Start a ${t.name}`} →
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
