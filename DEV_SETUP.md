# O'Tune — Dev setup

End-to-end pipeline using **Qwen2.5-0.5B-Instruct** trained locally with PEFT.
No RunPod, no S3, no GPU required (CPU works, slowly).

## What you'll do

1. Install Postgres + Python deps
2. Drop API keys into `api/.env`
3. Run one script (`run_dev_pipeline.py`) that walks the entire pipeline
4. Chat with the resulting tuned model in the playground

End-to-end cost: roughly **$3–$6** in Anthropic credits. Everything else is free.

---

## 1 — Keys checklist

Paste these into `api/.env` (copy from `api/.env.example`).

| Variable | Get it from | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | $5 of credit is plenty for a dev run |
| `GOOGLE_CSE_API_KEY` | console.cloud.google.com → enable "Custom Search API" → Credentials | Free tier: 100 queries/day |
| `GOOGLE_CSE_ID` | programmablesearchengine.google.com → create engine, enable "Search the entire web" | The `cx` value |
| `HUGGINGFACE_TOKEN` | huggingface.co/settings/tokens → "Read" scope | Needed to pull Qwen weights |
| `STRIPE_API_KEY` | dashboard.stripe.com → **toggle to Test mode** → Developers → API keys → secret key (`sk_test_...`) | Free |
| `STRIPE_WEBHOOK_SECRET` | Run `stripe listen --forward-to localhost:8000/stripe/webhook` and copy the `whsec_...` it prints | Requires `stripe-cli` |
| `OPENAI_API_KEY` | platform.openai.com | Optional. Used as fallback grader |

**Skipped for dev:** `RUNPOD_API_KEY`, `AWS_*`. We use local filesystem and local PEFT training instead.

---

## 2 — Install

```bash
# from repo root
cd api
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt   # adds torch, transformers, peft, datasets

# spin up Postgres in another terminal
docker compose up db -d
```

Confirm: `python -c "import torch; print(torch.cuda.is_available())"`
- `True` → training will use your GPU (fast, ~3 minutes)
- `False` → training falls back to CPU (slow, ~25 minutes for Qwen-0.5B on 100 rows)

---

## 3 — Run the dev pipeline

```bash
cd api
python scripts/run_dev_pipeline.py
```

This script bypasses Stripe and walks every stage of the real pipeline:

```
[01]  create project "Dev tune — medical device support"
[02]  ingest mock corpus (12 PDFs from ./scripts/fixtures/)
[03]  benchmark sweep → pick Qwen2.5-0.5B-Instruct (forced for dev)
[04]  print quote (no real billing; payment_state forced to deposit_paid)
[05]  generate dataset: 100 rows × 10 fields via Claude
[06]  train LoRA locally on Qwen2.5-0.5B-Instruct (CPU or GPU)
[07]  evaluate against 20 held-out rows with Claude as grader
[08]  patch-LoRA round if pass-rate < 0.80
[09]  open playground — model is loaded into memory
[10]  hit POST /projects/<id>/playground/chat with sample question
```

When it finishes, you'll see:

```
Pipeline finished in 4m 17s.
Project ID: proj_a1b2c3d4
Playground:  http://localhost:3000/dashboard/projects/proj_a1b2c3d4
Artifacts:   ./data/projects/proj_a1b2c3d4/
```

---

## 4 — Try the playground

Start the web + API:

```bash
# terminal 1
cd api && uvicorn otune.main:app --reload

# terminal 2
cd web && npm run dev
```

Open `http://localhost:3000/dashboard/projects/<id>`. The playground card will be unlocked (we set `stage=playground_ready` in the dev script). Ask it a question from the seeded domain.

---

## 5 — Costs to know about

- Dataset gen: ~$3 for 100 rows on Claude Sonnet 4.5 (10 fields each)
- Eval grader: ~$1 for 20 held-out questions
- Patch round (if triggered): ~$1
- Local training: $0 (your hardware)

If you want to test the full 5,000-row production path, expect $30–$50 in Anthropic credits and 30+ minutes on a single H100. Don't do that on a laptop.

---

## 6 — Useful one-offs

```bash
# Re-generate just the dataset (skip training)
python scripts/run_dev_pipeline.py --stage dataset

# Train on an existing dataset
python scripts/run_dev_pipeline.py --project proj_a1b2c3d4 --stage train

# Drop everything
docker compose down -v && rm -rf api/data/
```

---

## 7 — What's not in dev mode yet

- Real S3 (we use `./data/`)
- Real RunPod (we use local PEFT)
- vLLM serving (we use plain `transformers` for playground inference)
- GGUF quantisation (skip — the merged safetensors is enough for dev)
- Stripe Connect / invoices (test-mode Checkout only)
