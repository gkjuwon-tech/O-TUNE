"use client";
import styles from "./Security.module.css";

const items = [
  ["Tenant isolation",   "Every customer gets a dedicated S3 bucket, KMS key, and RunPod pod. Nothing is shared between tenants — not storage, not GPUs, not network."],
  ["Bring-your-own KMS", "If you'd rather hold the keys, point us at your AWS, GCP, or Azure KMS. We decrypt your corpus only inside the training pod, only during the training window."],
  ["Where the model runs","Default is our RunPod org. Production and Fleet tiers can run training inside your own AWS account via a cross-account role, with VPC peering and PrivateLink."],
  ["What leaves the tenant","Raw documents do not leave your tenant. Claude only sees redacted derivatives during dataset generation. The senior grader only sees rubric-grounded answer keys."],
  ["Audit trail",        "Every dataset row, training step, eval prompt, and webhook payload is hashed and persisted to a tamper-evident log. You get the log on delivery."],
  ["After delivery",     "On final payment, we transfer the artifact and rotate keys. We retain only a SHA-256 of the rubric for our own audits. We can attest in writing that nothing else remains."],
  ["Compliance posture", "SOC 2 Type II in progress (auditor engaged Q1 2026). HIPAA-aligned controls available on Fleet. GDPR DPA available before signature, not after."],
  ["Disclosure policy",  "If we discover an incident affecting your project, you hear about it from us within 24 hours, in writing, with a postmortem within seven days. No exceptions."],
];

export function Security() {
  return (
    <section id="security" className={styles.section}>
      <div className="frame">
        <div className={styles.grid}>
          <div className={styles.head}>
            <span className="eyebrow">Security</span>
            <h2 className={styles.h2}>What we promise your legal team.</h2>
            <p className={styles.sub}>
              We're a small studio, which means we can't hide behind layers of
              compliance theatre. Below is what we actually do.
            </p>
            <p className={styles.contact}>
              Need a DPA, SOC 2 evidence, or a security questionnaire?<br />
              Email <a href="mailto:security@otune.ai">security@otune.ai</a> and you'll have
              what you need by end of day.
            </p>
          </div>

          <dl className={styles.list}>
            {items.map(([k, v]) => (
              <div key={k} className={styles.row}>
                <dt className={styles.k}>{k}</dt>
                <dd className={styles.v}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
