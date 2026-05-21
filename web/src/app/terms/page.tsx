import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Terms — O'Tune" };

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader
          kicker="Terms of service"
          title="The short version."
          sub="The signed MSA is the document that actually governs the engagement. This page summarises what's in it."
        />
        <section style={{ padding: "64px 0 120px" }}>
          <div className="frame" style={{ maxWidth: 720 }}>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              When you commission a project, you&rsquo;re entering into a fixed-price engagement
              billed in two halves: 50% on signature, 50% on your acceptance of the finished
              model in the playground.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              The deposit is non-refundable, because the costs it covers (GPU hours, Claude
              tokens) are not refundable to us either. If you reject the finished model, we
              delete the weights after fourteen days and the balance is never invoiced.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              On final payment, all rights to the model artifact pass to you, including the
              right to deploy, fork, fine-tune further, or sell the weights. We retain no
              license. We do not include the model in any portfolio or case study without your
              written permission.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              For the full MSA and DPA, email <a href="mailto:founders@otune.ai" style={{ color: "var(--ink)", borderBottom: "1px solid var(--ink-5)" }}>founders@otune.ai</a> — we send them before signature, not after.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
