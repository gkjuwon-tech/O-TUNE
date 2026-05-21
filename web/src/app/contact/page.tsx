import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";
import styles from "./contact.module.css";

export const metadata = { title: "Contact — O'Tune" };

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader
          kicker="Contact"
          title="Write to us. We read everything."
          sub="The two of us split the inbox. Whichever one is awake will reply first — usually within a few hours, almost always within a day."
        />
        <section className={styles.body}>
          <div className="frame">
            <div className={styles.grid}>
              <a href="mailto:founders@otune.ai?subject=Quote%20request" className={styles.card}>
                <span className={styles.kicker}>For a quote</span>
                <span className={styles.email}>founders@otune.ai</span>
                <p className={styles.p}>
                  A paragraph about your use case is enough. If we can help, we&rsquo;ll have a
                  quote in your inbox by the next morning.
                </p>
              </a>
              <a href="mailto:security@otune.ai" className={styles.card}>
                <span className={styles.kicker}>Security &amp; compliance</span>
                <span className={styles.email}>security@otune.ai</span>
                <p className={styles.p}>
                  DPAs, SOC 2 evidence, security questionnaires, pentest scoping. Goes
                  straight to Junho.
                </p>
              </a>
              <a href="mailto:press@otune.ai" className={styles.card}>
                <span className={styles.kicker}>Press &amp; writing</span>
                <span className={styles.email}>press@otune.ai</span>
                <p className={styles.p}>
                  We rarely do press, but we&rsquo;re happy to talk to writers working on
                  good pieces about open-weight models.
                </p>
              </a>
              <div className={`${styles.card} ${styles.cardPlain}`}>
                <span className={styles.kicker}>By post</span>
                <span className={styles.email}>O&rsquo;Tune Studio, Inc.</span>
                <p className={styles.p}>
                  255 Franklin Street, Floor 6<br />
                  Brooklyn, NY 11222<br />
                  United States
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
