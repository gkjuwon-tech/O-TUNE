"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, ChevronLeft, Upload, Sparkles, FileCheck2, CreditCard, Building2 } from "lucide-react";
import { api, type Quote } from "@/lib/api";
import styles from "./wizard.module.css";

type StepKey = "scope" | "corpus" | "benchmark" | "quote" | "deposit";
const STEPS: { key: StepKey; label: string; icon: any }[] = [
  { key: "scope", label: "Scope", icon: Building2 },
  { key: "corpus", label: "Corpus", icon: Upload },
  { key: "benchmark", label: "Benchmark", icon: Sparkles },
  { key: "quote", label: "Quote", icon: FileCheck2 },
  { key: "deposit", label: "50% deposit", icon: CreditCard },
];

const TASK_TYPES = [
  { id: "qa", label: "Domain Q&A", hint: "Customer support, internal helpdesk, policy lookup." },
  { id: "extraction", label: "Structured extraction", hint: "Pull entities, fields, codes from documents." },
  { id: "classification", label: "Classification / triage", hint: "Tag tickets, label intents, route requests." },
  { id: "summarization", label: "Summarization", hint: "Long docs → executive briefs with citations." },
  { id: "agent", label: "Tool-using agent", hint: "Call internal APIs, follow runbooks, stay in-policy." },
];

export default function NewProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("scope");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [taskType, setTaskType] = useState("qa");
  const [description, setDescription] = useState("");

  // Step 2
  const [files, setFiles] = useState<File[]>([]);

  // Step 3
  const [quote, setQuote] = useState<Quote | null>(null);

  const idx = STEPS.findIndex(s => s.key === step);

  async function submitScope() {
    setSubmitting(true); setError(null);
    try {
      const p = await api.createProject({ name, domain, task_type: taskType, description });
      setProjectId(p.id);
      setStep("corpus");
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  async function submitCorpus() {
    if (!projectId) return;
    setSubmitting(true); setError(null);
    try {
      await api.uploadCorpus(
        projectId,
        files.map(f => ({ name: f.name, bytes: f.size })),
      );
      setStep("benchmark");
      const q = await api.benchmark(projectId);
      setQuote(q);
      setStep("quote");
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  async function acceptQuote() {
    if (!projectId) return;
    setSubmitting(true); setError(null);
    try {
      const { checkout_url } = await api.acceptQuote(projectId);
      window.location.href = checkout_url;
    } catch (e: any) { setError(e.message); setSubmitting(false); }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <div className={styles.kicker}>New project</div>
          <h1 className={styles.h1}>Spin up a fine-tune</h1>
          <p className={styles.sub}>About 90 seconds to a quote. No card required until you accept.</p>
        </div>
      </header>

      <ol className={styles.stepper} aria-label="Progress">
        {STEPS.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "todo";
          return (
            <li key={s.key} className={`${styles.step} ${styles[state]}`}>
              <span className={styles.stepDot}>{state === "done" ? <Check size={14} /> : <s.icon size={14} />}</span>
              <span className={styles.stepLabel}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {error && <div className={styles.error}>{error}</div>}

      {step === "scope" && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Tell us what you&rsquo;re tuning</h2>
          <p className={styles.panelHint}>This drives the benchmark agent&rsquo;s base-model search and the dataset blueprint.</p>

          <div className={styles.grid2}>
            <Field label="Project name" hint="Internal name. You can change it later.">
              <input className={styles.input} placeholder="Acme Support Copilot" value={name} onChange={e => setName(e.target.value)} />
            </Field>
            <Field label="Domain" hint="One or two words. The benchmark agent uses this to search.">
              <input className={styles.input} placeholder="Medical devices · HVAC · Tax law" value={domain} onChange={e => setDomain(e.target.value)} />
            </Field>
          </div>

          <Field label="Primary task" hint="Pick the closest match — we&rsquo;ll shape the dataset around it.">
            <div className={styles.taskGrid}>
              {TASK_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setTaskType(t.id)} className={`${styles.taskCard} ${taskType === t.id ? styles.taskActive : ""}`}>
                  <div className={styles.taskLabel}>{t.label}</div>
                  <div className={styles.taskHint}>{t.hint}</div>
                </button>
              ))}
            </div>
          </Field>

          <Field label="What does success look like?" hint="A short paragraph from the person who will actually evaluate the model.">
            <textarea className={styles.textarea} rows={5} placeholder="Our support engineers spend 40% of their time looking up part numbers across 12 PDFs. We want the model to answer those lookups in one shot, with the exact citation, and refuse if the answer isn't in the corpus." value={description} onChange={e => setDescription(e.target.value)} />
          </Field>

          <div className={styles.footer}>
            <button className={styles.next} disabled={!name || !domain || !description || submitting} onClick={submitScope}>
              {submitting ? "Saving…" : "Continue"} <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === "corpus" && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Upload your corpus</h2>
          <p className={styles.panelHint}>PDFs, Markdown, HTML, plain text. Up to 2 GB per project. We chunk and dedupe before anything leaves your tenant.</p>

          <FileDropper files={files} setFiles={setFiles} />

          <div className={styles.advisory}>
            <strong>Privacy note.</strong> Files are stored encrypted in a per-tenant bucket. Claude only sees redacted, synthetic derivatives during dataset generation — never the raw documents.
          </div>

          <div className={styles.footer}>
            <button className={styles.back} onClick={() => setStep("scope")}><ChevronLeft size={16} /> Back</button>
            <button className={styles.next} disabled={files.length === 0 || submitting} onClick={submitCorpus}>
              {submitting ? "Benchmarking models…" : "Run benchmark"} <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === "benchmark" && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Benchmarking the field…</h2>
          <p className={styles.panelHint}>The agent is scanning leaderboards, domain evals, and recent papers to shortlist base models for your task.</p>
          <BenchmarkSpinner />
        </section>
      )}

      {step === "quote" && quote && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Quote</h2>
          <p className={styles.panelHint}>You&rsquo;re committing to the 50% deposit only. Final 50% is invoiced after you accept the playground model.</p>

          <div className={styles.quoteGrid}>
            <div className={styles.quoteCard}>
              <div className={styles.qLabel}>Recommended base model</div>
              <div className={`mono ${styles.qValue}`}>{quote.base_model}</div>
              <p className={styles.qReason}>{quote.base_model_reason}</p>
              <details className={styles.alts}>
                <summary>Why not the alternatives?</summary>
                <ul>
                  {quote.alternatives.map(a => (
                    <li key={a.name}><span className="mono">{a.name}</span> — {a.reason}</li>
                  ))}
                </ul>
              </details>
            </div>
            <div className={styles.quoteCard}>
              <div className={styles.qLabel}>Plan</div>
              <ul className={styles.qList}>
                <li><span>Dataset rows</span><span className="mono">{quote.dataset_rows.toLocaleString()}</span></li>
                <li><span>Structured fields per row</span><span className="mono">{quote.dataset_fields}</span></li>
                <li><span>GPU type</span><span className="mono">{quote.gpu_type}</span></li>
                <li><span>GPU hours (est.)</span><span className="mono">{quote.gpu_hours_estimate}</span></li>
                <li><span>Accuracy target</span><span className="mono">{(quote.accuracy_target * 100).toFixed(0)}%</span></li>
                <li><span>ETA</span><span className="mono">~{quote.eta_hours}h</span></li>
              </ul>
            </div>
            <div className={`${styles.quoteCard} ${styles.priceCard}`}>
              <div className={styles.qLabel}>Total</div>
              <div className={styles.bigPrice}>${quote.total_usd.toLocaleString()}</div>
              <div className={styles.split}>
                <div><div className={styles.splitNum}>${quote.deposit_usd.toLocaleString()}</div><div className={styles.splitLbl}>50% now</div></div>
                <div className={styles.splitDiv} />
                <div><div className={styles.splitNum}>${(quote.total_usd - quote.deposit_usd).toLocaleString()}</div><div className={styles.splitLbl}>50% on acceptance</div></div>
              </div>
              <button className={styles.next} onClick={acceptQuote} disabled={submitting}>
                {submitting ? "Redirecting…" : "Accept & pay deposit"} <CreditCard size={16} />
              </button>
              <div className={styles.refundNote}>Deposit is non-refundable. Final 50% only invoiced if you keep the playground model.</div>
            </div>
          </div>

          <div className={styles.footer}>
            <button className={styles.back} onClick={() => setStep("scope")}><ChevronLeft size={16} /> Edit scope</button>
            <button className={styles.ghost} onClick={() => projectId && router.push(`/dashboard/projects/${projectId}`)}>Save & come back</button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {hint && <span className={styles.fieldHint}>{hint}</span>}
      {children}
    </label>
  );
}

function FileDropper({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  return (
    <div
      className={styles.drop}
      onDragOver={e => { e.preventDefault(); }}
      onDrop={e => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]); }}
    >
      <input
        id="filedrop"
        type="file"
        multiple
        className={styles.dropInput}
        onChange={e => setFiles([...files, ...Array.from(e.target.files ?? [])])}
      />
      <label htmlFor="filedrop" className={styles.dropLabel}>
        <Upload size={22} />
        <div className={styles.dropTitle}>Drop files or click to browse</div>
        <div className={styles.dropHint}>PDF · MD · HTML · TXT · DOCX · JSONL</div>
      </label>
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((f, i) => (
            <li key={i}>
              <span className={styles.fileName}>{f.name}</span>
              <span className={`mono ${styles.fileSize}`}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              <button className={styles.fileRm} onClick={() => setFiles(files.filter((_, j) => j !== i))}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BenchmarkSpinner() {
  const lines = [
    "→ Crawling Open LLM Leaderboard…",
    "→ Probing MTEB retrieval scores…",
    "→ Pulling HELM domain breakdown…",
    "→ Sampling recent arXiv abstracts…",
    "→ Scoring license & size fit…",
    "→ Drafting quote…",
  ];
  return (
    <ul className={styles.bench}>
      {lines.map((l, i) => (
        <li key={l} style={{ animationDelay: `${i * 0.35}s` }}>{l}</li>
      ))}
    </ul>
  );
}
