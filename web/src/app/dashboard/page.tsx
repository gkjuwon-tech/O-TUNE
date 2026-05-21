"use client";
import Link from "next/link";
import useSWR from "swr";
import { Plus, ArrowRight, Cpu, Sparkles } from "lucide-react";
import { api, type Project } from "@/lib/api";
import styles from "./dashboard.module.css";

const fetcher = () => api.listProjects();

const STAGE_LABEL: Record<string, { label: string; tone: "neutral" | "warn" | "ok" | "info" }> = {
  draft: { label: "Draft", tone: "neutral" },
  benchmarking: { label: "Benchmarking", tone: "info" },
  quoted: { label: "Quote ready", tone: "info" },
  deposit_pending: { label: "Awaiting 50% deposit", tone: "warn" },
  deposit_paid: { label: "Deposit paid", tone: "info" },
  generating_dataset: { label: "Building dataset", tone: "info" },
  training: { label: "Training", tone: "info" },
  evaluating: { label: "Evaluating", tone: "info" },
  patching: { label: "Patching LoRA", tone: "info" },
  playground_ready: { label: "Try in playground", tone: "ok" },
  final_pending: { label: "Awaiting final 50%", tone: "warn" },
  final_paid: { label: "Final paid", tone: "ok" },
  delivered: { label: "Delivered", tone: "ok" },
  failed: { label: "Failed", tone: "warn" },
};

export default function DashboardHome() {
  const { data, error, isLoading } = useSWR<Project[]>("projects", fetcher);

  return (
    <div>
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>Workspace</div>
          <h1 className={styles.h1}>Your tuned models</h1>
          <p className={styles.sub}>Every project, from corpus upload to weights handover.</p>
        </div>
        <Link href="/dashboard/new" className={styles.cta}>
          <Plus size={16} /> New tune
        </Link>
      </header>

      <div className={styles.summary}>
        <SummaryCard icon={<Cpu size={18} />} label="Active runs" value={(data ?? []).filter(p => ["training", "evaluating", "patching", "generating_dataset"].includes(p.stage)).length || 0} />
        <SummaryCard icon={<Sparkles size={18} />} label="Playgrounds open" value={(data ?? []).filter(p => p.stage === "playground_ready").length || 0} />
        <SummaryCard label="Delivered models" value={(data ?? []).filter(p => p.stage === "delivered").length || 0} />
        <SummaryCard label="GPU hours used (mo)" value="—" />
      </div>

      <section className={styles.listWrap}>
        <div className={styles.listHead}>
          <h2>Projects</h2>
          <div className={styles.filters}>
            <button className={`${styles.chip} ${styles.chipActive}`}>All</button>
            <button className={styles.chip}>In progress</button>
            <button className={styles.chip}>Playground</button>
            <button className={styles.chip}>Delivered</button>
          </div>
        </div>

        {isLoading && <div className={styles.empty}>Loading projects…</div>}
        {error && <div className={styles.empty}>Couldn&rsquo;t reach the backend. Is the API running?</div>}
        {!isLoading && !error && (data?.length ?? 0) === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No projects yet</div>
            <p>Start your first tune — it takes about 90 seconds to get a quote.</p>
            <Link href="/dashboard/new" className={styles.cta}><Plus size={16} /> New tune</Link>
          </div>
        )}

        <div className={styles.list}>
          {(data ?? []).map(p => {
            const meta = STAGE_LABEL[p.stage] ?? { label: p.stage, tone: "neutral" as const };
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowName}>{p.name}</div>
                  <div className={styles.rowMeta}>
                    <span className={`mono ${styles.rowDomain}`}>{p.domain}</span>
                    <span>·</span>
                    <span>{p.task_type}</span>
                    {p.base_model && (<><span>·</span><span className="mono">{p.base_model}</span></>)}
                  </div>
                </div>
                <div className={styles.rowSide}>
                  <span className={`${styles.badge} ${styles[meta.tone]}`}>{meta.label}</span>
                  <ArrowRight size={16} className={styles.rowArrow} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className={styles.sumCard}>
      <div className={styles.sumLabel}>
        {icon}<span>{label}</span>
      </div>
      <div className={`mono ${styles.sumVal}`}>{value}</div>
    </div>
  );
}
