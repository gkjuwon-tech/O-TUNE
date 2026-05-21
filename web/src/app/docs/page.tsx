import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import styles from "./docs.module.css";

export const metadata = { title: "Docs — O'Tune" };

const sections = [
  {
    title: "Getting started",
    items: [
      { t: "What O'Tune does",            href: "#overview" },
      { t: "Engagement model: 50 / 50",   href: "#engagement" },
      { t: "Your first project",          href: "#first" },
    ],
  },
  {
    title: "The pipeline",
    items: [
      { t: "Corpus ingest",               href: "#ingest" },
      { t: "Benchmark report",            href: "#benchmark" },
      { t: "Dataset schema (10 fields)",  href: "#dataset" },
      { t: "Training config",             href: "#training" },
      { t: "Senior-model grading",        href: "#eval" },
      { t: "Patch-LoRA mechanics",        href: "#patch" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { t: "Artifact contents",           href: "#artifact" },
      { t: "Deploying behind a VPC",      href: "#deploy" },
      { t: "Self-hosting with vLLM",      href: "#vllm" },
      { t: "Quantising to GGUF",          href: "#gguf" },
    ],
  },
  {
    title: "Operations",
    items: [
      { t: "Tenant model",                href: "#tenancy" },
      { t: "Logging &amp; audit",         href: "#audit" },
      { t: "Incident disclosure policy",  href: "#disclosure" },
      { t: "Data retention",              href: "#retention" },
    ],
  },
  {
    title: "Reference",
    items: [
      { t: "Glossary",                    href: "#glossary" },
      { t: "Status page",                 href: "https://status.otune.ai" },
      { t: "Changelog",                   href: "#changelog" },
    ],
  },
];

export default function DocsPage() {
  return (
    <>
      <Nav />
      <main className={styles.page}>
        <div className="frame">
          <div className={styles.layout}>
            <aside className={styles.side}>
              <span className={styles.sideTop}>Documentation</span>
              {sections.map(s => (
                <div key={s.title} className={styles.group}>
                  <span className={styles.groupT}>{s.title}</span>
                  <ul>
                    {s.items.map(i => (
                      <li key={i.t}><Link href={i.href} dangerouslySetInnerHTML={{ __html: i.t }} /></li>
                    ))}
                  </ul>
                </div>
              ))}
            </aside>

            <article className={styles.article}>
              <header className={styles.head}>
                <span className={styles.crumb}>Docs / Getting started</span>
                <h1>What O&rsquo;Tune does</h1>
                <p className={styles.lede}>
                  This page is the short, honest version of how we work. If you want the
                  long version, scroll down. If you want to skip to the part where you
                  send us your data, jump to <Link href="#first">Your first project</Link>.
                </p>
              </header>

              <h2 id="overview">Overview</h2>
              <p>
                O&rsquo;Tune is a service. You give us a corpus and a description of the
                task you want a model to do well. We do everything between &ldquo;we read
                your docs&rdquo; and &ldquo;here are your weights and a Docker image,&rdquo;
                including the parts most teams underestimate: dataset authoring, evaluation,
                and the second training pass that fixes whatever the first one got wrong.
              </p>
              <p>
                We are explicitly not a platform. There is no dashboard you log into to
                kick off a tune at 2am. We are humans and we want to look at every project.
                The dashboard exists so you can <em>watch</em> the work happen, not start
                or finish it.
              </p>

              <h2 id="engagement">Engagement model: 50 / 50</h2>
              <p>
                A fine-tuning engagement is a fixed-price contract billed in two halves.
                The deposit covers our hard costs (GPU hours, Claude tokens for dataset
                authoring, eval credits). The balance is yours to withhold until you&rsquo;ve
                used the finished model in our playground and decided to deploy it.
              </p>
              <p>
                If you reject the model, the weights are deleted after fourteen days. The
                deposit is not refunded — but half of it is credited toward a follow-up
                engagement if you come back within ninety days. We&rsquo;ve found this is
                fair to both sides.
              </p>

              <h2 id="first">Your first project</h2>
              <ol className={styles.ol}>
                <li>Email <a href="mailto:founders@otune.ai">founders@otune.ai</a> with a paragraph about your use case. Include the rough size of your corpus and the task you want the model to do.</li>
                <li>We reply with either &ldquo;yes, here&rsquo;s a quote&rdquo;, &ldquo;no, here&rsquo;s why,&rdquo; or &ldquo;we need to ask a few questions first.&rdquo;</li>
                <li>If yes, we send a fixed quote and a Stripe link for the 50% deposit. The quote is good for fourteen days.</li>
                <li>You pay. We provision your tenant, ingest your corpus, and start the benchmark + dataset stages. You get a dashboard link the same day.</li>
                <li>You watch it run, and we send a short note at each stage transition.</li>
                <li>When the playground opens, you and your team try the model on real questions. Take as long as you need.</li>
                <li>If you&rsquo;re happy, you pay the balance. We hand you the weights and rotate keys. If you&rsquo;re not, we delete and move on.</li>
              </ol>

              <p className={styles.tail}>
                Everything below is depth on specific stages. Use the sidebar — it&rsquo;s
                shorter than it looks.
              </p>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
