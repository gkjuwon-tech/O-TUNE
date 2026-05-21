"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import styles from "./login.module.css";

export function LoginPanel({ callbackUrl }: { callbackUrl: string }) {
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  async function go(provider: "google" | "apple") {
    if (busy) return;
    setBusy(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setBusy(null);
    }
  }

  return (
    <div className={styles.providers}>
      <button
        type="button"
        className={`${styles.provider} ${styles.providerGoogle}`}
        onClick={() => go("google")}
        disabled={busy !== null}
        aria-busy={busy === "google"}
      >
        <GoogleMark />
        <span>{busy === "google" ? "Redirecting…" : "Continue with Google"}</span>
      </button>

      <button
        type="button"
        className={`${styles.provider} ${styles.providerApple}`}
        onClick={() => go("apple")}
        disabled={busy !== null}
        aria-busy={busy === "apple"}
      >
        <AppleMark />
        <span>{busy === "apple" ? "Redirecting…" : "Continue with Apple"}</span>
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.32A9 9 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.71V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3.02-2.32z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 9 0a9 9 0 0 0-8.05 4.97l3.02 2.32C4.68 5.16 6.66 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" aria-hidden>
      <path
        fill="currentColor"
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM254.7 91.1C282.8 57.7 280.3 27.3 279.5 16.4c-25.3 1.5-54.6 17.3-71.3 36.7-18.4 20.8-29.2 46.5-26.9 73.9 27.4 2.1 52.4-12 73.4-35.9z"
      />
    </svg>
  );
}
