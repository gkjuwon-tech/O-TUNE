"use client";

/**
 * Project detail page — rebuilt from scratch in the landing-page tone.
 *
 * Endpoints are UNCHANGED:
 *   - api.getProject(id)
 *   - api.events(id)
 *   - api.payFinal(id)
 *   - api.playgroundChat(id, message)
 *   - /api/be/projects/:id/artifact[?fmt=safetensors|gguf|docker]
 *   - /api/be/projects/:id/eval-report
 */

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Cpu,
  Download,
  FileText,
  GraduationCap,
  Lock,
  PackageCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { api, type JobEvent, type Project, type ProjectStage } from "@/lib/api";
import styles from "./project.module.css";

/* ── Stage taxonomy ───────────────────────────────── */

const STAGE_ORDER: ProjectStage[] = [
  "draft",
  "benchmarking",
  "quoted",
  "deposit_pending",
  "deposit_paid",
  "generating_dataset",
  "training",
  "evaluating",
  "patching",
  "playground_ready",
  "final_pending",
  "final_paid",
  "delivered",
];

type StageGroup = {
  key: string;
  label: string;
  meta: string;
  icon: LucideIcon;
  stages: ProjectStage[];
};

const STAGE_GROUPS: StageGroup[] = [
  { key: "dataset", label: "Dataset",  meta: "synthesize",  icon: Sparkles,      stages: ["generating_dataset"] },
  { key: "train",   label: "Train",    meta: "lora · pod",  icon: Cpu,           stages: ["training"] },
  { key: "eval",    label: "Evaluate", meta: "senior exam", icon: GraduationCap, stages: ["evaluating"] },
  { key: "patch",   label: "Patch",    meta: "round-2",     icon: Wrench,        stages: ["patching"] },
  { key: "deliver", label: "Deliver",  meta: "weights",     icon: PackageCheck,  stages: ["playground_ready", "final_pending", "final_paid", "delivered"] },
];

const STAGE_LABEL: Record<ProjectStage, { label: string; tone: "ok" | "warn" | "danger" | "neutral" }> = {
  draft:              { label: "draft",              tone: "neutral" },
  benchmarking:       { label: "benchmarking",       tone: "neutral" },
  quoted:             { label: "quote ready",        tone: "neutral" },
  deposit_pending:    { label: "awaiting deposit",   tone: "warn"    },
  deposit_paid:       { label: "deposit paid",       tone: "neutral" },
  generating_dataset: { label: "building dataset",   tone: "neutral" },
  training:           { label: "training",           tone: "neutral" },
  evaluating:         { label: "evaluating",         tone: "neutral" },
  patching:           { label: "patching",           tone: "neutral" },
  playground_ready:   { label: "playground open",    tone: "ok"      },
  final_pending:      { label: "awaiting final 50%", tone: "warn"    },
  final_paid:         { label: "final paid",         tone: "ok"      },
  delivered:          { label: "delivered",          tone: "ok"      },
  failed:             { label: "failed",             tone: "danger"  },
};

const PLAYGROUND_STAGES: ProjectStage[] = [
  "playground_ready",
  "final_pending",
  "final_paid",
  "delivered",
];

/* ── Page entry ───────────────────────────────────── */

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: project, mutate, error } = useSWR<Project>(
    ["project", id],
    () => api.getProject(id),
    { refreshInterval: 5000 },
  );
  const { data: events } = useSWR<JobEvent[]>(
    ["events", id],
    () => api.events(id),
    { refreshInterval: 3000 },
  );

  if (error && !project) {
    return <div className={styles.loading}>Couldn&rsquo;t load project. The API may be down.</div>;
  }
  if (!project) {
    return <div className={styles.loading}>Loading project…</div>;
  }

  return <ProjectView project={project} events={events ?? []} onChange={() => mutate()} />;
}

/* ── Inner view ───────────────────────────────────── */

function ProjectView({
  project,
  events,
  onChange,
}: {
  project: Project;
  events: JobEvent[];
  onChange: () => void;
}) {
  const reachedIdx = STAGE_ORDER.indexOf(project.stage);
  const stageMeta = STAGE_LABEL[project.stage] ?? STAGE_LABEL.draft;
  const playgroundOpen = PLAYGROUND_STAGES.includes(project.stage);

  const toneClass =
    stageMeta.tone === "ok"     ? styles.stageTagOk :
    stageMeta.tone === "warn"   ? styles.stageTagWarn :
    stageMeta.tone === "danger" ? styles.stageTagDanger :
    "";

  return (
    <div>
      <div className={styles.crumbs}>
        <Link href="/dashboard">
          <ArrowLeft size={12} style={{ marginRight: 4, verticalAlign: "-1px" }} />
          Projects
        </Link>
        <ChevronRight size={12} />
        <span>{project.name}</span>
      </div>

      <header className={styles.header}>
        <div className={styles.headLeft}>
          <h1 className={styles.h1}>{project.name}</h1>
          <div className={styles.metaRow}>
            <b>{project.domain}</b>
            <span className={styles.sep}>·</span>
            <span>{project.task_type}</span>
            {project.base_model && (
              <>
                <span className={styles.sep}>·</span>
                <span className="mono">{project.base_model}</span>
              </>
            )}
            {project.quote_usd != null && (
              <>
                <span className={styles.sep}>·</span>
                <span className="mono">${project.quote_usd.toLocaleString()}</span>
              </>
            )}
          </div>
          <span className={`${styles.stageTag} ${toneClass}`}>{stageMeta.label}</span>
        </div>

        <HeaderActions project={project} onChange={onChange} />
      </header>

      <Timeline project={project} reachedIdx={reachedIdx} />

      <div className={styles.grid}>
        <div className={styles.col}>
          <DatasetCard project={project} />
          <TrainingCard project={project} />
          <EvalCard project={project} />
          <DeliveryCard project={project} />
        </div>

        <div className={styles.col}>
          {playgroundOpen ? (
            <Playground
              projectId={project.id}
              locked={project.payment_state !== "final_paid" && project.stage !== "delivered"}
            />
          ) : (
            <PlaygroundLocked stage={project.stage} />
          )}
          <EventLog events={events} />
        </div>
      </div>
    </div>
  );
}

/* ── Header actions ───────────────────────────────── */

function HeaderActions({ project, onChange }: { project: Project; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  async function payFinal() {
    setBusy(true);
    try {
      const { checkout_url } = await api.payFinal(project.id);
      window.location.href = checkout_url;
    } catch (e) {
      console.error(e);
      setBusy(false);
      onChange();
    }
  }

  const showPayFinal =
    project.stage === "final_pending" ||
    (project.stage === "playground_ready" && project.payment_state === "deposit_paid");

  if (showPayFinal) {
    const half = project.quote_usd != null ? project.quote_usd / 2 : null;
    return (
      <div className={styles.headRight}>
        <button className={styles.primaryCta} onClick={payFinal} disabled={busy}>
          <CreditCard size={15} />
          {busy ? "Redirecting…" : half != null ? `Pay final $${half.toLocaleString()}` : "Pay final 50%"}
        </button>
        <span className={styles.ctaHint}>50% on acceptance · non-refundable</span>
      </div>
    );
  }

  if (project.stage === "delivered") {
    return (
      <div className={styles.headRight}>
        <a className={styles.primaryCta} href={`/api/be/projects/${project.id}/artifact`} download>
          <Download size={15} /> Download weights
        </a>
        <span className={styles.ctaHint}>safetensors · ~0.5 GB</span>
      </div>
    );
  }

  return null;
}

/* ── Timeline ─────────────────────────────────────── */

function Timeline({ project, reachedIdx }: { project: Project; reachedIdx: number }) {
  return (
    <section className={styles.timeline} aria-label="Pipeline progress">
      {STAGE_GROUPS.map(group => {
        const lastStageIdx = STAGE_ORDER.indexOf(group.stages[group.stages.length - 1]);
        const groupActive = group.stages.includes(project.stage);
        const groupDone = !groupActive && lastStageIdx <= reachedIdx;
        const state = groupActive ? "active" : groupDone ? "done" : "todo";
        const Icon = group.icon;
        return (
          <div key={group.key} className={`${styles.tlNode} ${styles[state]}`}>
            <div className={styles.tlIcon}>
              <Icon size={14} strokeWidth={1.7} />
            </div>
            <div>
              <div className={styles.tlLabel}>{group.label}</div>
              <span className={styles.tlMeta}>{group.meta}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ── Card shell ───────────────────────────────────── */

function CardShell({
  icon,
  title,
  tag,
  tagTone,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  tag?: string;
  tagTone?: "ok" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  const tagToneClass =
    tagTone === "ok" ? styles.cardTagOk : tagTone === "warn" ? styles.cardTagWarn : "";
  return (
    <article className={`${styles.card} ${className || ""}`}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}>{icon}</div>
        <h3>{title}</h3>
        {tag && <span className={`${styles.cardTag} ${tagToneClass}`}>{tag}</span>}
      </header>
      {children}
    </article>
  );
}

/* ── Cards: dataset / train / eval / delivery ──── */

function DatasetCard({ project }: { project: Project }) {
  const pct = Math.min(100, Math.round((project.rows_generated / Math.max(1, project.rows_target)) * 100));
  const running = project.stage === "generating_dataset";
  return (
    <CardShell
      icon={<Sparkles size={13} strokeWidth={1.8} />}
      title="Dataset"
      tag={running ? "claude · streaming" : `${pct}%`}
      tagTone={pct >= 100 ? "ok" : undefined}
    >
      <div className={styles.cardBody}>
        <p>
          10-field exam-grade rows: question, context, gold answer, distractors, citations,
          difficulty, rubric, domain tags, source span, follow-up. Every row is graded by a
          second-pass model before it lands in the training set.
        </p>
        <div className={styles.progress}><div style={{ width: `${pct}%` }} /></div>
      </div>
      <div className={styles.statRow}>
        <div className={styles.statCell}>
          <span className={styles.statK}>Generated</span>
          <div className={styles.statV}>
            {project.rows_generated.toLocaleString()}
            <span className="unit">rows</span>
          </div>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statK}>Target</span>
          <div className={styles.statV}>
            {project.rows_target.toLocaleString()}
            <span className="unit">rows</span>
          </div>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statK}>Yield</span>
          <div className={styles.statV}>
            {pct}
            <span className="unit">%</span>
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function TrainingCard({ project }: { project: Project }) {
  const running = project.stage === "training";
  return (
    <CardShell
      icon={<Cpu size={13} strokeWidth={1.8} />}
      title="LoRA training"
      tag={running ? "runpod · live" : "queued"}
      tagTone={running ? "ok" : undefined}
    >
      <div className={styles.cardBody}>
        <p>
          Axolotl + PEFT on a dedicated pod. Checkpoints every epoch, streaming loss curve below.
          If the senior-model exam fails specific rubric categories, we patch with a second
          training pass before delivery.
        </p>
        <div className={styles.lossWrap}>
          <div className={styles.lossHead}>
            <span>train/loss</span>
            <span>{running ? "live" : "—"}</span>
          </div>
          <MiniLossChart running={running} />
        </div>
      </div>
    </CardShell>
  );
}

function EvalCard({ project }: { project: Project }) {
  const active = project.stage === "evaluating" || project.stage === "patching";
  const settled = PLAYGROUND_STAGES.includes(project.stage);
  return (
    <CardShell
      icon={<GraduationCap size={13} strokeWidth={1.8} />}
      title="Senior-model exam"
      tag={active ? "in progress" : settled ? "passed" : "pending"}
      tagTone={active ? "ok" : settled ? "ok" : undefined}
    >
      <div className={styles.cardBody}>
        <p>
          A senior model (Claude / GPT-class) interrogates the tuned model. Misses cluster into
          rubric categories that drive the next patch round.
        </p>
        <ul className={styles.rubric} style={{ marginTop: 14 }}>
          <RubricRow label="Factual accuracy (RAG-grounded)" value={rubricScore(project)} pending={!settled} />
          <RubricRow label="Refusal correctness"             value={rubricScore(project)} pending={!settled} />
          <RubricRow label="Citation precision"              value={rubricScore(project)} pending={!settled} />
          <RubricRow label="Out-of-distribution handling"    value={rubricScore(project)} pending={!settled} />
        </ul>
      </div>
    </CardShell>
  );
}

function RubricRow({ label, value, pending }: { label: string; value: string; pending: boolean }) {
  return (
    <li>
      <span>{label}</span>
      <b className={pending ? styles.pending : ""}>{value}</b>
    </li>
  );
}

function rubricScore(project: Project) {
  const target = project.accuracy_target;
  if (target == null || !PLAYGROUND_STAGES.includes(project.stage)) return "—";
  return `${Math.round(target * 100)}%`;
}

function DeliveryCard({ project }: { project: Project }) {
  const playable = PLAYGROUND_STAGES.includes(project.stage);
  const unlocked = project.payment_state === "final_paid" || project.stage === "delivered";
  return (
    <CardShell
      icon={<PackageCheck size={13} strokeWidth={1.8} />}
      title="Delivery"
      tag={unlocked ? "ready" : playable ? "preview" : "pending"}
      tagTone={unlocked ? "ok" : playable ? "warn" : undefined}
    >
      <div className={styles.cardBody}>
        <ul className={styles.artifacts}>
          <ArtifactRow
            label="safetensors"
            fmt="fp16"
            href={unlocked ? `/api/be/projects/${project.id}/artifact?fmt=safetensors` : null}
          />
          <ArtifactRow
            label="GGUF"
            fmt="q4_K_M · q8_0"
            href={unlocked ? `/api/be/projects/${project.id}/artifact?fmt=gguf` : null}
          />
          <ArtifactRow
            label="Docker image"
            fmt="deploy bundle"
            href={unlocked ? `/api/be/projects/${project.id}/artifact?fmt=docker` : null}
            actionLabel="pull"
          />
          <ArtifactRow
            label="Eval report"
            fmt="PDF · signed"
            href={playable ? `/api/be/projects/${project.id}/eval-report` : null}
            actionLabel="open"
          />
        </ul>
      </div>
    </CardShell>
  );
}

function ArtifactRow({
  label,
  fmt,
  href,
  actionLabel = "download",
}: {
  label: string;
  fmt: string;
  href: string | null;
  actionLabel?: string;
}) {
  return (
    <li>
      <FileText size={14} strokeWidth={1.7} />
      <span className={styles.artifactName}>
        {label}
        <span className="fmt">{fmt}</span>
      </span>
      {href ? (
        <a href={href} {...(actionLabel === "download" ? { download: true } : {})}>
          {actionLabel}
        </a>
      ) : (
        <span className={styles.artifactLocked}>
          <Lock size={11} strokeWidth={2} /> locked
        </span>
      )}
    </li>
  );
}

/* ── Playground ───────────────────────────────────── */

type Msg = { role: "user" | "assistant"; text: string; latency?: number };

function Playground({ projectId, locked }: { projectId: string; locked: boolean }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "I'm the tuned model. Ask me anything within scope — I'll cite when I can and refuse when I can't.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setSending(true);
    try {
      const r = await api.playgroundChat(projectId, userMsg);
      setMessages(m => [...m, { role: "assistant", text: r.reply, latency: r.latency_ms }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages(m => [...m, { role: "assistant", text: `(error) ${msg}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <article className={`${styles.card} ${styles.playground}`}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}>
          <Activity size={13} strokeWidth={1.8} />
        </div>
        <h3>Playground</h3>
        <span className={`${styles.cardTag} ${locked ? styles.cardTagWarn : styles.cardTagOk}`}>
          {locked ? "preview · pay final to download" : "unlocked"}
        </span>
      </header>

      <div className={styles.playgroundBody}>
        <div ref={scrollRef} className={styles.chat}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${styles[`msg_${m.role}`]}`}>
              <div className={styles.msgRole}>
                {m.role === "user" ? "you" : "model"}
                {m.latency != null && ` · ${m.latency} ms`}
              </div>
              <div className={styles.msgText}>{m.text}</div>
            </div>
          ))}
          {sending && <div className={styles.typing}>· · ·</div>}
        </div>

        <div className={styles.composer}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask the model a real question from your domain…"
            disabled={sending}
          />
          <button onClick={send} disabled={sending || !input.trim()}>
            <Send size={13} /> Send
          </button>
        </div>
      </div>
    </article>
  );
}

function PlaygroundLocked({ stage }: { stage: ProjectStage }) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}>
          <Lock size={13} strokeWidth={1.8} />
        </div>
        <h3>Playground</h3>
        <span className={styles.cardTag}>locked</span>
      </header>
      <div className={styles.lockedBody}>
        <div className={styles.lockedIcon}>
          <ShieldCheck size={18} strokeWidth={1.6} />
        </div>
        <div className={styles.lockedTitle}>Opens after evaluation</div>
        <p className={styles.lockedSub}>
          You&rsquo;ll be able to chat with the tuned model the moment evaluation finishes —
          before paying the final 50%.
        </p>
        <span className={styles.lockedStage}>current stage: {stage}</span>
      </div>
    </article>
  );
}

/* ── Event log ────────────────────────────────────── */

function EventLog({ events }: { events: JobEvent[] }) {
  const sorted = useMemo(() => [...events].sort((a, b) => (a.ts < b.ts ? 1 : -1)), [events]);

  return (
    <article className={`${styles.card} ${styles.log}`}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}>
          <Activity size={13} strokeWidth={1.8} />
        </div>
        <h3>Event log</h3>
        <span className={styles.cardTag}>{events.length} entries</span>
      </header>
      <div className={styles.logBox}>
        {sorted.length === 0 && (
          <div className={styles.logEmpty}>Waiting for the pipeline to emit events…</div>
        )}
        {sorted.map(e => (
          <div key={e.id} className={`${styles.logLine} ${styles[`lvl_${e.level}`]}`}>
            <span className={styles.logTs}>{formatTime(e.ts)}</span>
            <span className={styles.logStage}>{e.stage}</span>
            <span className={styles.logMsg}>{e.message}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

/* ── Mini loss chart ──────────────────────────────── */

function MiniLossChart({ running }: { running: boolean }) {
  return (
    <svg viewBox="0 0 320 80" className={styles.loss} aria-hidden>
      <defs>
        <linearGradient id="lg-loss" x1="0" x2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--ink-2)" />
        </linearGradient>
      </defs>
      {/* grid baseline */}
      <line x1="0" x2="320" y1="76" y2="76" stroke="var(--rule)" strokeWidth="1" />
      <line x1="0" x2="320" y1="50" y2="50" stroke="var(--rule)" strokeWidth="1" strokeDasharray="2 4" />
      <line x1="0" x2="320" y1="24" y2="24" stroke="var(--rule)" strokeWidth="1" strokeDasharray="2 4" />
      <path
        d="M0,60 C40,55 70,45 110,38 C150,30 180,22 220,18 C260,14 290,12 320,10"
        fill="none"
        stroke="url(#lg-loss)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray={running ? undefined : "4 6"}
      />
    </svg>
  );
}
