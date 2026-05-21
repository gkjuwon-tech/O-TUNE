import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import styles from "./about.module.css";

export const metadata = { title: "About — O'Tune" };

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader
          kicker="About"
          title="We're a two-person studio in Brooklyn."
        />

        <section className={styles.body}>
          <div className="frame">
            <div className={styles.grid}>
              <div className={styles.left}>
                <p>
                  We started O&rsquo;Tune in 2025 after spending most of the previous three years
                  watching the same pattern play out at customer after customer: a smart team
                  wants a fine-tuned model, hires a consultancy, waits two months, and ends up
                  with a slightly worse RAG setup billed at $80,000.
                </p>
                <p>
                  The bottleneck is almost never the training. It&rsquo;s the dataset, the eval,
                  and the patience to keep iterating after the first run. We built a small set of
                  tools that automate the boring parts of that loop, and we sell the time we
                  spend on the parts that aren&rsquo;t boring.
                </p>
                <p>
                  We&rsquo;re intentionally small. We don&rsquo;t plan to raise. We take on a
                  handful of projects at a time so we can give each one the attention it
                  deserves. If we&rsquo;re full, we&rsquo;ll tell you and recommend someone
                  else.
                </p>

                <h2 className={styles.h2}>Who we are</h2>

                <div className={styles.bios}>
                  <div className={styles.bio}>
                    <h3>Junho Park</h3>
                    <p className={styles.role}>Co-founder · Models &amp; Infrastructure</p>
                    <p>
                      Previously at Hugging Face and a fintech in Seoul. Has fine-tuned more
                      models than he&rsquo;d like to admit. Maintains the training pipeline and
                      most of the eval code. Will argue about tokenisers for hours.
                    </p>
                  </div>
                  <div className={styles.bio}>
                    <h3>Mira Castellanos</h3>
                    <p className={styles.role}>Co-founder · Datasets &amp; Customers</p>
                    <p>
                      Previously a research engineer at Anthropic and before that, a linguist
                      at a translation startup. Designs the dataset schemas and runs every
                      customer engagement end-to-end. Refuses to write a deck.
                    </p>
                  </div>
                </div>
              </div>

              <aside className={styles.aside}>
                <dl className={styles.facts}>
                  <div><dt>Founded</dt><dd>March 2025</dd></div>
                  <div><dt>Headcount</dt><dd>Two, plus a part-time accountant</dd></div>
                  <div><dt>Where</dt><dd>255 Franklin St., Brooklyn NY</dd></div>
                  <div><dt>Funding</dt><dd>Bootstrapped</dd></div>
                  <div><dt>Projects shipped</dt><dd>9 in 2025, 14 in flight</dd></div>
                  <div><dt>Open to hire</dt><dd>Not yet — happy as we are</dd></div>
                </dl>
                <p className={styles.mailto}>
                  Want to talk to us? <a href="mailto:founders@otune.ai">founders@otune.ai</a>
                </p>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
