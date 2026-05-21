// Lightweight typed API client. Talks to FastAPI backend via /api/be/* rewrite.

const BASE = "/api/be";

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type ProjectStage =
  | "draft"
  | "benchmarking"
  | "quoted"
  | "deposit_pending"
  | "deposit_paid"
  | "generating_dataset"
  | "training"
  | "evaluating"
  | "patching"
  | "playground_ready"
  | "final_pending"
  | "final_paid"
  | "delivered"
  | "failed";

export type PaymentState =
  | "none"
  | "deposit_pending"
  | "deposit_paid"
  | "final_pending"
  | "final_paid";

export interface Project {
  id: string;
  name: string;
  domain: string;
  task_type: string;
  created_at: string;
  stage: ProjectStage;
  payment_state: PaymentState;
  base_model: string | null;
  quote_usd: number | null;
  accuracy_target: number | null;
  rows_generated: number;
  rows_target: number;
}

export interface Quote {
  base_model: string;
  base_model_reason: string;
  alternatives: { name: string; reason: string }[];
  dataset_rows: number;
  dataset_fields: number;
  gpu_type: string;
  gpu_hours_estimate: number;
  total_usd: number;
  deposit_usd: number;
  accuracy_target: number;
  eta_hours: number;
}

export interface JobEvent {
  id: string;
  ts: string;
  level: "info" | "warn" | "error" | "success";
  stage: string;
  message: string;
}

export const api = {
  listProjects: () => req<Project[]>("/projects"),
  getProject: (id: string) => req<Project>(`/projects/${id}`),
  createProject: (body: {
    name: string;
    domain: string;
    task_type: string;
    description: string;
  }) => req<Project>("/projects", { method: "POST", body: JSON.stringify(body) }),
  uploadCorpus: (id: string, files: { name: string; bytes: number }[]) =>
    req<{ accepted: number }>(`/projects/${id}/corpus`, {
      method: "POST",
      body: JSON.stringify({ files }),
    }),
  benchmark: (id: string) => req<Quote>(`/projects/${id}/benchmark`, { method: "POST" }),
  acceptQuote: (id: string) =>
    req<{ checkout_url: string }>(`/projects/${id}/quote/accept`, { method: "POST" }),
  payFinal: (id: string) =>
    req<{ checkout_url: string }>(`/projects/${id}/final-payment`, { method: "POST" }),
  events: (id: string) => req<JobEvent[]>(`/projects/${id}/events`),
  playgroundChat: (id: string, message: string) =>
    req<{ reply: string; latency_ms: number; tokens: number }>(
      `/projects/${id}/playground/chat`,
      { method: "POST", body: JSON.stringify({ message }) },
    ),
};
