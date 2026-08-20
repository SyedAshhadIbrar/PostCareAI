# PostCare — AI Post-Operative Wound Care Platform

Multi-agent post-operative care system: patients upload wound photos and daily logs; **MedSigLIP** assesses the wound; **RAG + safety rules + LLM agents** guide the patient and prioritize cases on the **clinician dashboard** (human-in-the-loop).

> **Prototype / capstone** — not clinically validated. Safety thresholds and agent outputs require review by qualified clinicians.

## Architecture

```
Patient UI (/ui/patient/)  ← flow starts here
   │  1. Take wound photo + enter pain, procedure, symptoms
   ▼
Backend POST /patient/case
   ├─ MedSigLIP wound assessment
   ├─ Safety flags + RAG evidence
   └─ PostCare-Gemini agents (triage → patient + clinician)
   ▼
Patient recovery dashboard          Clinician dashboard (/ui/clinician/)
   (AI guidance)                      (priority queue + review)
```

## Repository structure

```
PostCare/
├── backend/           FastAPI — routes, services, agents, schemas
├── models/medsiglip/  Inference artifacts (config, thresholds, weights*)
├── rag/documents/     RAG knowledge base (Phase 3)
├── frontend/          Patient + clinician UIs (Phase 5)
└── training/          MedSigLIP fine-tuning + MLOps (Run 1 / Run 2)
```

## Quick start — Phase 1 (wound API)

### 1. Install dependencies

```bash
pip install -r requirements.txt
pip install -r training/requirements.txt   # if training locally
```

### 2. Export trained model

After Run 2 training completes:

```bash
python training/scripts/export_production_model.py
```

Set `HF_TOKEN` if weights are not yet exported (gated `google/medsiglip-448`).

### 3. Run API

From repo root:

```bash
uvicorn backend.main:app --reload
```

### 4. Test wound assessment

```bash
curl -X POST http://127.0.0.1:8000/wound/assess \
  -F "image=@path/to/wound.jpg"
```

### 4. Build & open the React UI (recommended)

```bash
cd frontend
npm install
npm run build
cd ..
uvicorn backend.main:app --reload
```

| App | URL |
|-----|-----|
| **React UI** (patient + clinician) | http://127.0.0.1:8000/ |
| Legacy patient UI | http://127.0.0.1:8000/ui/patient/ |
| Legacy clinician UI | http://127.0.0.1:8000/ui/clinician/ |

For frontend development with hot reload, run `npm run dev` in `frontend/` (port 5173) alongside the API on port 8000.

## MLOps & version control

| Practice | Location |
|----------|----------|
| Experiment configs | `training/configs/run1_underfitting.yaml`, `run2_best.yaml` |
| Run lineage (Run 1 underfit → Run 2 best) | `training/experiments/EXPERIMENT_LOG.md` |
| MLflow tracking | `training/mlruns/` |
| Model promotion | `training/scripts/export_production_model.py` → `models/medsiglip/` |
| Version metadata | `models/medsiglip/postcare_config.json` (`model_version`, `training_run`) |
| GitHub | https://github.com/SyedAshhadIbrar/PostCare |

**Judges / reviewers:** Run 1 documents intentional underfitting; Run 2 shows iterative improvement with differential LR, 300 optimizer steps, and per-label Youden thresholds.

## Build phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | `training/`, `models/`, wound API | **Implemented** |
| 2 | Database + `/patient/case` | **Implemented** (SQLite) |
| 3 | RAG + safety integration | **Implemented** (keyword RAG) |
| 4 | Triage + patient + clinician agents | **Implemented** |
| 5 | Frontends | **Implemented** (vanilla web) |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `HF_TOKEN` | Hugging Face auth for MedSigLIP download |
| `POSTCARE_MODEL_DIR` | Override model path (default: `models/medsiglip`) |
| `POSTCARE_DEVICE` | `cuda` or `cpu` |
| `POSTCARE_DATABASE_URL` | Phase 2 DB connection |
| `POSTCARE_GEMINI_API_KEY` | Google Gemini API key for PostCare-Gemini agents |
| `POSTCARE_GEMINI_MODEL` | Gemini model id (default: `gemini-2.0-flash`) |

Agents use **PostCare-Gemini** when `POSTCARE_GEMINI_API_KEY` is set; otherwise rule-based fallback (`PostCare-rules`).

## License

See [LICENSE](LICENSE).
