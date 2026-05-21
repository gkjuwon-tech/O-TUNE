"use client";
import { use, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Activity, Download, Lock, Send, ShieldCheck, Sparkles, Cpu, GraduationCap, Wrench, PackageCheck, CreditCard, FileText } from "lucide-react";
import { api, type Project, type JobEvent } from "@/lib/api";
import styles from "./project.module.css";

const STAGE_ORDER = [
  "draft", "benchmarking", "quoted", "deposit_pending", "deposit_paid",
  "generating_dataset", "training", "evaluating", "patching",
  "playground_ready", "final_pending", "final_paid", "delivered",
];

const STAGE_GROUPS = [
  { key: "dataset", label: "Dataset", icon: Sparkles, stages: ["generating_dataset"] },
  { key: "train", label: "Train", icon: Cpu, stages: ["training"] },
  { key: "eval", label: "Evaluate", icon: GraduationCap, stages: ["evaluating"] },
  { key: "patch", label: "Patch", icon: Wrench, stages: ["patching"] },
  { key: "deliver", label: "Deliver", icon: PackageCheck, stages: ["playground_ready", "final_pending", "final_paid", "delivered"] },
];

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, mutate } = useSWR<Project>(["project", id], () => api.getProject(id), { refreshInterval: 5000 });
  const { data: events } = useSWR<JobEvent[]>(["events", id], () => api.events(id), { refreshInterval: 3000 });

  if (!project) return <div className={styles.loading}>Loading project…</div>;
  const reachedIdx = STAGE_ORDER.indexOf(project.stage);

  return (
    <div>
      <header className={styles.header}>
        <div>
          <div className={styles.crumbs}>
            <a href="/dashboard">Projects</a> / <span>{project.name}</span>
          </div>
          <h1 className={styles.h1}>{project.name}</h1>
          <div className={styles.metaRow}>
            <span className="mono">{project.domain}</span>
            <span>·</span><span>{project.task_type}</span>
            {project.base_model && (<><span>·</span><span className="mono">{project.base_model}</span></>)}
            {project.quote_usd && (<><span>·</span><span className="mono">${project.quote_usd.toLocaleString()}</span></>)}
          </div>
        </div>
        <PaymentActions project={project} onPaid={() => mutate()} />
      </header>

      <section className={styles.timeline}>
        {STAGE_GROUPS.map(g => {
          const groupActive = g.stages.includes(project.stage);
          const groupDone = STAGE_ORDER.indexOf(g.stages[g.stages.length - 1]) <= reachedIdx;
          const state = groupActive ? "active" : groupDone ? "done" : "todo";
          return (
            <div key={g.key} className={`${styles.tlNode} ${styles[state]}`}>
              <div className={styles.tlIcon}><g.icon size={16} /></div>
              <div className={styles.tlLabel}>{g.label}</div>
            </div>
          );
        })}
      </section>

      <div className={styles.grid}>
        <div className={styles.col}>
          <DatasetCard project={project} />
          <TrainingCard project={project} />
          <EvalCard project={project} />
          <DeliveryCard project={project} />
        </div>
        <div className={styles.col}>
          {project.stage === "playground_ready" || project.stage === "final_pending" || project.stage === "final_paid" || project.stage === "delivered" ? (
            <Playground projectId={project.id} locked={project.payment_state !== "final_paid" && project.stage !== "delivered"} />
          ) : (
            <PlaygroundLocked project={project} />
          )}
          <EventLog events={events ?? []} />
        </div>
      </div>
    </div>
  );
}

function PaymentActions({ project, onPaid }: { project: Project; onPaid: () => void }) {
  const [busy, setBusy] = useState(false);

  async function doFinal() {
    setBusy(true);
    try {
      const { checkout_url } = await api.payFinal(project.id);
      window.location.href = checkout_url;
    } finally { setBusy(false); onPaid(); }
  }

  if (project.stage === "final_pending" || (project.stage === "playground_ready" && project.payment_state === "deposit_paid")) {
    return (
      <button className={styles.payCta} onClick={doFinal} disabled={busy}>
        {busy ? "Redirecting…" : `Pay final $${(project.quote_usd ?? 0) / 2}`} <CreditCard size={16} />
      </button>
    );
  }
  if (project.stage === "delivered") {
    return (
      <a className={styles.payCta} href={`/api/be/projects/${project.id}/artifact`} download>
        Download weights <Download size={16} />
      </a>
    );
  }
  return null;
}

function DatasetCard({ project }: { project: Project }) {
  const pct = Math.min(100, Math.round((project.rows_generated / Math.max(1, project.rows_target)) * 100));
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><Sparkles size={16} /></div>
        <h3>Dataset</h3>
        <span className={styles.cardTag}>{project.rows_generated.toLocaleString()} / {project.rows_target.toLocaleString()} rows</span>
      </header>
      <div className={styles.progress}><div style={{ width: `${pct}%` }} /></div>
      <p className={styles.cardBody}>
        Claude is writing 10-field exam-grade rows: question, context, gold answer, distractors,
        citations, difficulty, rubric, domain tags, source span, follow-up. Every row is graded by a
        second-pass model before it lands in the training set.
      </p>
    </article>
  );
}

function TrainingCard({ project }: { project: Project }) {
  const running = project.stage === "training";
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><Cpu size={16} /></div>
        <h3>LoRA training</h3>
        <span className={styles.cardTag}>{running ? "RUNPOD · LIVE" : "queued"}</span>
      </header>
      <MiniLossChart running={running} />
      <p className={styles.cardBody}>Axolotl + PEFT on a dedicated pod. Checkpoints every epoch. Streaming loss curves below.</p>
    </article>
  );
}

function EvalCard({ project }: { project: Project }) {
  const active = ["evaluating", "patching"].includes(project.stage);
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><GraduationCap size={16} /></div>
        <h3>Senior-model exam</h3>
        <span className={styles.cardTag}>{active ? "in progress" : "pending"}</span>
      </header>
      <ul className={styles.rubric}>
        <li><span>Factual accuracy (RAG-grounded)</span><b>—</b></li>
        <li><span>Refusal correctness</span><b>—</b></li>
        <li><span>Citation precision</span><b>—</b></li>
        <li><span>Out-of-distribution handling</span><b>—</b></li>
      </ul>
      <p className={styles.cardBody}>A senior model (Claude / GPT-class) interrogates the tuned model. Misses cluster into rubric categories that drive the next patch round.</p>
    </article>
  );
}

function DeliveryCard({ project }: { project: Project }) {
  const playable = ["playground_ready", "final_pending", "final_paid", "delivered"].includes(project.stage);
  const unlocked = project.payment_state === "final_paid" || project.stage === "delivered";
  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><PackageCheck size={16} /></div>
        <h3>Delivery</h3>
        <span className={styles.cardTag}>{unlocked ? "ready" : playable ? "preview" : "pending"}</span>
      </header>
      <ul className={styles.artifacts}>
        <li><FileText size={14} /> <span>safetensors</span> {unlocked ? <a href={`/api/be/projects/${project.id}/artifact?fmt=safetensors`}>download</a> : <Lock size={14} />}</li>
        <li><FileText size={14} /> <span>GGUF (q4_K_M, q8_0)</span> {unlocked ? <a href={`/api/be/projects/${project.id}/artifact?fmt=gguf`}>download</a> : <Lock size={14} />}</li>
        <li><FileText size={14} /> <span>Docker image + deploy bundle</span> {unlocked ? <a href={`/api/be/projects/${project.id}/artifact?fmt=docker`}>pull</a> : <Lock size={14} />}</li>
        <li><FileText size={14} /> <span>Eval report (PDF, signed)</span> {playable ? <a href={`/api/be/projects/${project.id}/eval-report`}>open</a> : <Lock size={14} />}</li>
      </ul>
    </article>
  );
}

function Playground({ projectId, locked }: { projectId: string; locked: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; latency?: number }[]>([
    { role: "assistant", text: "I'm the tuned model. Ask me anything within scope — I'll cite when I can and refuse when I can't." },
  ]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    const userMsg = input;
    setMessages(m => [...m, { role: "user", text: userMsg }]);
    setInput(""); setSending(true);
    try {
      const r = await api.playgroundChat(projectId, userMsg);
      setMessages(m => [...m, { role: "assistant", text: r.reply, latency: r.latency_ms }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: "assistant", text: `(error) ${e.message}` }]);
    } finally { setSending(false); }
  }

  return (
    <article className={`${styles.card} ${styles.playground}`}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><Activity size={16} /></div>
        <h3>Playground</h3>
        {locked ? <span className={`${styles.cardTag} ${styles.tagWarn}`}>preview · pay final to download</span> : <span className={`${styles.cardTag} ${styles.tagOk}`}>unlocked</span>}
      </header>
      <div ref={scrollRef} className={styles.chat}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.msg} ${styles[`msg_${m.role}`]}`}>
            <div className={styles.msgRole}>{m.role === "user" ? "you" : "model"}{m.latency ? ` · ${m.latency} ms` : ""}</div>
            <div className={styles.msgText}>{m.text}</div>
          </div>
        ))}
        {sending && <div className={styles.typing}>· · ·</div>}
      </div>
      <div className={styles.composer}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Ask the model a real question from your domain…"
        />
        <button onClick={send} disabled={sending}><Send size={14} /> Send</button>
      </div>
    </article>
  );
}

function PlaygroundLocked({ project }: { project: Project }) {
  return (
    <article className={`${styles.card} ${styles.locked}`}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><Lock size={16} /></div>
        <h3>Playground</h3>
        <span className={styles.cardTag}>locked</span>
      </header>
      <p className={styles.cardBody}>
        The playground opens automatically when training and evaluation finish. You&rsquo;ll be able to
        chat with the tuned model before paying the final 50%.
      </p>
      <div className={styles.lockHint}><ShieldCheck size={14} /> Current stage: <span className="mono">{project.stage}</span></div>
    </article>
  );
}

function EventLog({ events }: { events: JobEvent[] }) {
  return (
    <article className={`${styles.card} ${styles.log}`}>
      <header className={styles.cardHead}>
        <div className={styles.cardIcon}><Activity size={16} /></div>
        <h3>Event log</h3>
        <span className={styles.cardTag}>{events.length} entries</span>
      </header>
      <div className={styles.logBox}>
        {events.length === 0 && <div className={styles.logEmpty}>Waiting for the pipeline to emit events…</div>}
        {events.map(e => (
          <div key={e.id} className={`${styles.logLine} ${styles[`lvl_${e.level}`]}`}>
            <span className={styles.logTs}>{new Date(e.ts).toLocaleTimeString()}</span>
            <span className={styles.logStage}>{e.stage}</span>
            <span className={styles.logMsg}>{e.message}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function MiniLossChart({ running }: { running: boolean }) {
  // tiny static SVG with animated path — purely decorative; real metrics arrive via events
  return (
    <svg viewBox="0 0 320 80" className={styles.loss}>
      <defs>
        <linearGradient id="lg-loss" x1="0" x2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M0,60 C40,55 70,45 110,38 C150,30 180,22 220,18 C260,14 290,12 320,10"
        fill="none" stroke="url(#lg-loss)" strokeWidth="2"
        strokeDasharray={running ? "0" : "4 6"}
      />
      <line x1="0" x2="320" y1="78" y2="78" stroke="rgba(255,255,255,0.08)" />
    </svg>
  );
}
