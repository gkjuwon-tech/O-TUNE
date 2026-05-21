import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Privacy — O'Tune" };

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main>
        <PageHeader
          kicker="Privacy"
          title="What we do with your data."
          sub="Last updated 21 May 2026. Plain English. The legal version is in the DPA, which is the document your counsel will want."
        />
        <section style={{ padding: "64px 0 120px" }}>
          <div className="frame" style={{ maxWidth: 720 }}>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              We collect three things: documents you upload, metadata about your project (name,
              email, billing details), and operational telemetry (training logs, eval scores).
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              Documents you upload are stored encrypted in a per-tenant S3 bucket. They are not
              shared with any third party. Claude sees redacted, structured derivatives of your
              corpus during dataset generation; it does not see the originals. We do not use
              your data to train any general-purpose model.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              On final payment, we transfer the artifact to you and rotate keys. We retain only
              a SHA-256 of the rubric and the project metadata required for our audit
              obligations. We can attest to deletion in writing.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", marginBottom: 16 }}>
              Questions? Email <a href="mailto:privacy@otune.ai" style={{ color: "var(--ink)", borderBottom: "1px solid var(--ink-5)" }}>privacy@otune.ai</a>. Our DPO replies within two business days.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
