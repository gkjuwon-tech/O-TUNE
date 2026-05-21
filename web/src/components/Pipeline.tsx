"use client";
import styles from "./Pipeline.module.css";

const steps = [
  {
    n: "01",
    title: "You send us your data",
    body: "PDFs, wikis, support tickets, internal docs — whatever you have. We chunk, dedupe, and redact PII inside an isolated tenant. The originals never leave your storage if you don't want them to.",
    artifact: (
      <Mock label="ingest.log" foot="2,847 documents · 14.6 MB">
        {`→ /upload                                    2,847 files
→ chunking (1024 tok)                       18,392 spans
→ dedup (minhash, 0.86 jaccard)             16,108 spans
→ pii redaction (presidio + claude review)  16,108 spans
→ archived to s3://otune-tenants/<you>/raw
done in 1m 42s`}
      </Mock>
    ),
  },
  {
    n: "02",
    title: "Our research agent picks a base model",
    body: "It reads the Open LLM Leaderboard, MTEB, recent benchmark papers, and license registries, then writes you a short report explaining the recommendation. You can override it.",
    artifact: (
      <Mock label="shortlist.md" foot="generated in 1m 47s">
        {`# Domain: medical device support

Recommended: Qwen2.5-14B-Instruct  (score 0.847)
  Apache-2.0. Strong on tool use + multilingual.

Fallback:    Llama-3.1-8B-Instruct  (score 0.812)
  Cheaper to serve. Slightly weaker on multi-turn.

Not chosen:  Gemma-2-9B   (license restrictions)
             Mixtral-8x7B (too large for inference SLA)`}
      </Mock>
    ),
  },
  {
    n: "03",
    title: "You sign for half",
    body: "We send a fixed quote — GPU hours, dataset rows, eval budget. Nothing variable, nothing usage-based. You pay 50% to begin. The other 50% is owed only after you've used the finished model and decided to keep it.",
    artifact: (
      <Mock label="quote.txt" foot="quote valid for 14 days">
        {`────────────────────────────────────────────
  Quote #00148  ·  Medical device support
────────────────────────────────────────────
  Base model           Qwen2.5-14B-Instruct
  Dataset rows         6,800 × 10 fields
  GPU hours (est.)     9.4  on H100 80GB
  Eval budget          800 rubric-graded Qs
  ────────────────────────────────────────
  Total                $11,400
  Deposit (50%)        $5,700  due now
  Balance (50%)        $5,700  due on accept`}
      </Mock>
    ),
  },
  {
    n: "04",
    title: "Claude writes the dataset",
    body: "5,000–20,000 rows, ten structured fields each: question, context, gold answer, distractors, citations, rubric, source span, difficulty, tags, follow-up. Every row is graded by a second model before it joins the training set.",
    artifact: (
      <Mock label="row-04219.json" foot="quality score 0.93 / 1.00">
        {`{
  "id": "04219",
  "question": "What is the recommended torque for the
               M6 securing screw on the v3 pump head?",
  "gold_answer": "1.2 N·m, per service manual §4.3.2.",
  "citations": ["service_manual_v3.pdf#p41"],
  "difficulty": "medium",
  "rubric": [
    "must cite §4.3.2 or service_manual_v3",
    "must include units (N·m)"
  ],
  "distractors": [
    {"text": "0.6 N·m",  "why_wrong": "v2 spec"},
    {"text": "2.4 N·m",  "why_wrong": "different fastener"}
  ]
}`}
      </Mock>
    ),
  },
  {
    n: "05",
    title: "Training runs on dedicated GPUs",
    body: "RunPod H100 or A100 pods, axolotl + LoRA. Loss curves stream into your dashboard, checkpoints every epoch, the full config is yours to keep. Your data never touches a shared pod.",
    artifact: (
      <Mock label="train.log" foot="epoch 3 / 3 · 02h 18m elapsed">
        {`step 0100  loss 1.847  grad_norm 0.42  lr 1.8e-4
step 0400  loss 1.213  grad_norm 0.31  lr 1.6e-4
step 0800  loss 0.946  grad_norm 0.24  lr 1.2e-4
step 1200  loss 0.811  grad_norm 0.19  lr 0.8e-4
step 1600  loss 0.742  grad_norm 0.17  lr 0.4e-4
step 2000  loss 0.704  grad_norm 0.15  lr 0.1e-4
→ best checkpoint: step 1840 (eval loss 0.698)`}
      </Mock>
    ),
  },
  {
    n: "06",
    title: "A senior model grades it",
    body: "Claude or GPT-class — whichever is stronger on your task — quizzes the tuned model against RAG-grounded answer keys. Every miss is logged against a rubric category, and clusters of misses spawn a targeted patch.",
    artifact: (
      <Mock label="eval-report.md" foot="overall pass-rate 0.882">
        {`Held-out exam:   800 questions
Pass-rate:       0.882  (target 0.85 ✓)

By rubric category
  factual accuracy        0.918   ✓
  citation precision      0.901   ✓
  refusal correctness     0.847   ✓
  out-of-distribution     0.762   ✗  → patch
  arithmetic              0.834   ✗  → patch

Patches applied:  2 (out-of-distribution, arithmetic)
Pass-rate after:  0.927`}
      </Mock>
    ),
  },
  {
    n: "07",
    title: "You try it in a playground",
    body: "When training and eval finish, we open a private chat UI scoped to your tenant. You can run real questions against the tuned model, share the link with your team, and decide whether to keep it.",
    artifact: (
      <Mock label="playground · /chat" foot="73 ms · 412 tokens">
        {`you:    The v3 pump is throwing E-204 after a coolant
        flush. Where do I start?

model:  E-204 is a flow-sensor mismatch. After a flush,
        you usually need to re-prime the secondary loop
        before the sensor reads correctly.

        Steps (service_manual_v3 §6.1):
          1. Drain residual coolant
          2. Re-seat the flow sensor (P/N 4419-A)
          3. Run the prime cycle in service mode

        If E-204 persists after prime, the sensor itself
        is suspect — replace P/N 4419-A.`}
      </Mock>
    ),
  },
  {
    n: "08",
    title: "You pay the rest and take the weights",
    body: "If the model works, you pay the balance and we hand you safetensors, a quantised GGUF, a Docker image with the playground UI baked in, and the eval report signed. We then delete our copies of the weights.",
    artifact: (
      <Mock label="delivery.tar.gz" foot="3.4 GB · sha256 verified">
        {`./model/
  adapter_model.safetensors          512 MB
  config.json                          2 KB
  tokenizer.model                    1.8 MB
./quantised/
  model-q4_K_M.gguf                 4.2 GB
  model-q8_0.gguf                   8.1 GB
./docker/
  Dockerfile                         2 KB
  docker-compose.yml                 1 KB
./docs/
  eval-report.signed.pdf             1 MB
  training-config.yml                3 KB
  runbook.md                         8 KB`}
      </Mock>
    ),
  },
];

export function Pipeline() {
  return (
    <section id="how" className={styles.section}>
      <div className="frame">
        <div className={styles.head}>
          <span className="eyebrow">How it works</span>
          <h2 className={styles.h2}>
            Eight steps from your raw documents to a private model.
          </h2>
        </div>

        <div className={styles.steps}>
          {steps.map((s, i) => (
            <article key={s.n} className={`${styles.step} ${i % 2 === 1 ? styles.flip : ""}`}>
              <div className={styles.copy}>
                <span className={styles.n}>{s.n}</span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.body}>{s.body}</p>
              </div>
              <div className={styles.viz}>{s.artifact}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Mock({ label, foot, children }: { label: string; foot: string; children: React.ReactNode }) {
  return (
    <div className={styles.mock}>
      <div className={styles.mockHead}>
        <span className={styles.mockLabel}>{label}</span>
        <span className={styles.mockDot} />
      </div>
      <pre className={styles.mockCode}>{children}</pre>
      <div className={styles.mockFoot}>{foot}</div>
    </div>
  );
}
