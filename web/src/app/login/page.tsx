import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { LoginPanel } from "./LoginPanel";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Sign in · O'Tune",
  description: "Sign in to your O'Tune workspace.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const callbackUrl = searchParams?.callbackUrl || "/dashboard";
  const error = searchParams?.error;

  return (
    <>
      <Nav />
      <main className={styles.page}>
        <div className={`frame ${styles.frame}`}>
          <section className={styles.left}>
            <div className={styles.kicker}>Workspace</div>
            <h1 className={styles.title}>
              Sign in to keep tuning your model.
            </h1>
            <p className={styles.sub}>
              We use Google or Apple so we never see your password.
              Your weights, your datasets, and your billing live behind this
              single sign-in.
            </p>

            <ul className={styles.list}>
              <li>
                <span className={styles.dot} />
                Resume any project where you left off — drafts, benchmarks, training runs, evals.
              </li>
              <li>
                <span className={styles.dot} />
                Download safetensors / GGUF artifacts once final payment clears.
              </li>
              <li>
                <span className={styles.dot} />
                Same account works across web playground and CLI deploys.
              </li>
            </ul>
          </section>

          <section className={styles.right}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardLabel}>sign-in.terminal</div>
                <span className={styles.cardDot} />
              </div>

              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>Continue with</h2>
                <p className={styles.cardSub}>
                  Use the same identity you&rsquo;ll use to download weights.
                </p>

                {error && (
                  <div className={styles.error}>
                    {decodeAuthError(error)}
                  </div>
                )}

                <LoginPanel callbackUrl={callbackUrl} />

                <div className={styles.fine}>
                  By continuing you agree to our{" "}
                  <a href="/terms">Terms</a> and{" "}
                  <a href="/privacy">Privacy Policy</a>.
                </div>
              </div>

              <div className={styles.cardFoot}>
                <span>need an enterprise SSO?</span>
                <a href="mailto:founders@otune.ai?subject=SSO%20request">
                  founders@otune.ai
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function decodeAuthError(code: string) {
  switch (code) {
    case "OAuthAccountNotLinked":
      return "That email is already linked to another sign-in method. Use the original provider you signed up with.";
    case "AccessDenied":
      return "Access was denied by the provider. Try again or use the other sign-in option.";
    case "Configuration":
      return "Sign-in is misconfigured on the server. Ping founders@otune.ai.";
    case "Verification":
      return "That sign-in link has expired or already been used.";
    default:
      return "We couldn't complete that sign-in. Please try again.";
  }
}
