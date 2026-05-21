"use client";
import styles from "./FAQ.module.css";

const faqs = [
  {
    q: "Why 50/50 instead of charging up front?",
    a: "Fine-tuning is expensive to commit to before you've seen the model work. The deposit covers our hard costs — GPU hours and dataset authoring — and the balance is yours to withhold until you've used the finished model in our playground and decided you'd actually deploy it.",
  },
  {
    q: "What happens if we reject the model?",
    a: "You keep the eval report and the dataset metadata. We delete the weights after fourteen days. The deposit isn't refunded because the GPU and Claude time it covered isn't refundable to us either. You're welcome to come back with a tighter scope and a new deposit, and we'll credit half of the previous deposit toward the new one.",
  },
  {
    q: "Which base models do you actually use?",
    a: "Anything open-weight under a license that permits commercial use. In practice that's Llama 3.1 (8B and 70B), Qwen 2.5, Mistral, Mixtral, Gemma 2, DeepSeek V2.5, and Phi-3. Our research agent picks one for your project and shows its reasoning before you sign.",
  },
  {
    q: "How is the dataset built? Isn't synthetic data worse than real data?",
    a: "Synthetic data done badly is worse than real data. Synthetic data done well — graded by a senior model, grounded in your corpus, structured into ten fields per row — often outperforms scraped data because it covers the long tail of your domain on purpose. We've benchmarked both. Happy to share the results.",
  },
  {
    q: "Where does training happen?",
    a: "Default: a dedicated RunPod pod under our org, with an S3 bucket scoped to your project. Production and Fleet tiers can train inside your AWS account via a cross-account role. We support both H100 80GB and A100 80GB.",
  },
  {
    q: "Do you retain access to the model afterward?",
    a: "No. On final payment we transfer the artifact, rotate keys, and delete our copies. We keep only a SHA-256 hash of the rubric and the project metadata required for our audit obligations. We can attest to this in writing.",
  },
  {
    q: "What about non-English domains?",
    a: "Most of the base models we use are multilingual. Where they aren't, we score a multilingual alternative during the benchmark step and recommend it. Our dataset author handles Korean, Japanese, Arabic, and most CJK scripts natively.",
  },
  {
    q: "Can we deploy the model inside our VPC?",
    a: "Yes. Production and Fleet tiers ship a hardened Docker image and a Terraform module that drops the model into your VPC behind a private load balancer. Inference is then entirely on your infrastructure.",
  },
  {
    q: "How small can a project be?",
    a: "Our smallest delivered project to date was a 7B fine-tune on roughly 400 internal documents for a four-person dev tools team. Pilot tier is designed for that scope. Below that, you'd be better off with a good RAG setup and we'll happily say so.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className={styles.section}>
      <div className="frame">
        <div className={styles.head}>
          <span className="eyebrow">Questions</span>
          <h2 className={styles.h2}>Things customers ask before signing.</h2>
        </div>

        <div className={styles.list}>
          {faqs.map((f) => (
            <div key={f.q} className={styles.item}>
              <h3 className={styles.q}>{f.q}</h3>
              <p className={styles.a}>{f.a}</p>
            </div>
          ))}
        </div>

        <p className={styles.tail}>
          Anything else? Email <a href="mailto:founders@otune.ai">founders@otune.ai</a>. The
          two of us read every message — usually within a few hours.
        </p>
      </div>
    </section>
  );
}
