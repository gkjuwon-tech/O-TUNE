# O'TUNE

Production-grade fine-tuning, on autopilot. Upload a corpus, accept a quote, watch a tuned LLM
get delivered to your own infrastructure.

## Pipeline

1. **Corpus ingest** — files land in a per-tenant S3 bucket.
2. **Benchmark sweep** — Tavily web search + Claude shortlist a base model with citations.
3. **Quote** — transparent GPU + dataset estimate. Pay **50% deposit** to start.
4. **Dataset generation** — Claude writes 5,000+ rows × 10 structured fields.
5. **LoRA training** — RunPod pod runs axolotl + PEFT on A100/H100.
6. **Senior-model exam** — Claude/GPT graders, RAG-grounded gold answers.
7. **Patch LoRA** — failing rubric clusters → surgical patch adapters.
8. **Playground** — chat with the tuned model in-app. **Pay final 50%** to unlock the download.
9. **Delivery** — safetensors + GGUF + Docker bundle, signed URLs.

## Repo layout

```
web/     Next.js 14 frontend (TypeScript, CSS Modules, no Tailwind)
api/     FastAPI backend (SQLAlchemy + Postgres, Anthropic, Stripe, RunPod)
docker-compose.yml  one-command dev stack
```

## Quickstart

```bash
cp api/.env.example api/.env       # fill in keys
docker compose up --build
# web → http://localhost:3000
# api → http://localhost:8000/docs
```

## Billing model

- **50% deposit** charged on quote acceptance via Stripe Checkout.
- Pipeline runs only after `checkout.session.completed` webhook lands.
- When training + eval complete, the playground opens — locked-state download buttons.
- **Final 50%** invoiced when the customer is satisfied. Only then do weights become downloadable.
- If the customer rejects the model, weights are deleted after 14 days. Deposit is retained
  (covers real GPU spend).
