# PostCareAI

**A Multimodal Multi-Agent System for Clinician Supervised Post-Operative Patient Follow-Up** — patients submit daily wound photos and symptom logs via a mobile app; a fine-tuned **MedSigLIP** model assesses wounds; **RAG + safety rules + LLM agents** guide recovery and triage cases on a **clinician web dashboard** (human-in-the-loop).

> **Capstone prototype** — not clinically validated. Model outputs and agent responses require review by qualified clinicians. Do not use for real medical decisions.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)]()
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)]()
[![PyTorch](https://img.shields.io/badge/PyTorch-2.1+-EE4C2C?logo=pytorch&logoColor=white)]()

---

## Highlights

- **Fine-tuned MedSigLIP** (`google/medsiglip-448`) on SurgWound — 6-label multi-label wound classification
- **0.745 macro AUC** on held-out test set (137 samples); **0.793 validation macro AUC** at best epoch
- **Per-label Youden J thresholds** tuned for clinical safety (high sensitivity on infection & urgency)
- **Multi-agent pipeline** — triage → patient guidance → clinician handoff (Gemini or rule fallback)
- **Vector RAG** over clinical care documents for 24/7 patient coaching
- **Dual frontend** — mobile-first patient app + web clinician command center
- **Automated tests** — pytest suite covering wound API, safety rules, triage, and RAG

---

## Demo

| Role | URL | Credentials |
|------|-----|-------------|
| **Login** | http://127.0.0.1:5173/ (dev) or http://127.0.0.1:8000/ (prod build) | — |
| **Patient** | `/patient` | `patient@postcare.test` / `patient123` |
| **Clinician** | `/clinician` | `clinician@postcare.test` / `clinician123` |

**API docs:** http://127.0.0.1:8000/docs

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PATIENT (Mobile App)                          │
│  Daily check-in: wound photo + pain slider + symptoms + optional note   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ POST /api/patients/upload
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  MedSigLIP   │  │ Safety Rules │  │  RAG Engine  │  │   Agents    │ │
│  │  6-label CV  │→ │  Thresholds  │→ │  MiniLM +    │→ │ Triage /    │ │
│  │  inference   │  │  + symptoms  │  │  care PDFs   │  │ Patient /   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  │ Clinician   │ │
│                                                         └─────────────┘ │
│  SQLite · JWT auth · case store · chat history                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
          ┌────────────────────────┴────────────────────────┐
          ▼                                                  ▼
┌──────────────────────┐                    ┌──────────────────────────────┐
│  Patient Recovery    │                    │  Clinician Web Dashboard     │
│  AI coach (RAG chat) │                    │  Priority queue · case review│
│  Metrics & care path │                    │  MedSigLIP scores · handoff  │
└──────────────────────┘                    └──────────────────────────────┘
```

### Agent pipeline

1. **MedSigLIP** — wound image → 6 probability scores
2. **Safety rules** — combine CV scores + patient symptoms + pain level → flags
3. **Triage agent** — assign priority (`urgent` / `review` / `routine`)
4. **Patient agent** — empathetic recovery guidance for the patient
5. **Clinician agent** — structured handoff note for the care team
6. **RAG chat** — semantic search over care guides + case context

Agents use **PostCare-Gemini** (`gemini-2.0-flash`) when `POSTCARE_GEMINI_API_KEY` is set; otherwise **PostCare-rules** fallback.

---

## Model performance (Run 2 — test set)

**Model:** `medsiglip-448-surgwound-v2` · **Checkpoint:** `checkpoint-180` · **Test samples:** 137

### Ranking quality (AUC — threshold-independent)

| Label | AUC | Notes |
|-------|-----|-------|
| **Exudate** | **0.846** | Best-performing label |
| Edema | 0.756 | |
| Healing status | 0.752 | |
| Infection risk | 0.730 | |
| Urgency | 0.710 | Rarest class (57 positives in train) |
| Erythema | 0.676 | |
| **Macro AUC** | **0.745** | |

### Production operating points (Youden J thresholds)

Thresholds shift sensitivity/specificity tradeoff; macro AUC is unchanged.

| Label | Threshold | Sensitivity | Specificity | Design intent |
|-------|-----------|-------------|-------------|---------------|
| infection_risk | **0.25** | 90.0% | 45.3% | Catch infections early |
| urgency | **0.24** | 87.5% | 49.6% | Flag urgent cases for clinician |
| healing_status | 0.38 | 83.6% | 54.9% | Detect poor healing |
| erythema | 0.51 | 67.5% | 64.8% | Balanced redness detection |
| edema | 0.71 | 33.3% | 91.5% | Conservative — reduce false swelling alerts |
| exudate | 0.78 | 50.0% | 87.2% | Conservative — reduce false discharge alerts |

```json
{
  "healing_status": 0.38,
  "erythema": 0.51,
  "edema": 0.71,
  "infection_risk": 0.25,
  "urgency": 0.24,
  "exudate": 0.78
}
```

### Training summary

| Metric | Run 1 (baseline) | Run 2 (production) |
|--------|------------------|----------------------|
| Optimizer steps | 40 | **300** |
| Unfrozen blocks | 4 | **8** |
| Learning rate | single 5e-5 | differential backbone/head |
| Thresholds | fixed 0.5 | **per-label Youden J** |
| Val macro AUC (best epoch) | underfit | **0.793** |
| Training time | — | 22.5 min |

### Class imbalance handling

Training set: **480 samples × 6 labels**. `pos_weight` in BCE loss upweights rare positives:

| Label | Positives | pos_weight |
|-------|-----------|------------|
| urgency | 57 | 7.42 |
| edema | 50 | 6.56 |
| exudate | 70 | 5.24 |
| infection_risk | 78 | 5.15 |
| erythema | 129 | 2.59 |
| healing_status | 198 | 1.42 |

---

## Frontends

### Patient app (mobile-first)

Whoop-inspired dark UI with bottom tab navigation:

| Tab | Route | Purpose |
|-----|-------|---------|
| Home | `/patient` | Recovery ring, metrics, medications, check-in CTA |
| Check-In | `/patient/log` | Camera upload, pain slider, symptom toggles |
| Recovery | `/patient/recovery` | AI guidance, wound scores, care path |
| Coach | `/patient/assistant` | RAG-powered recovery chat |
| You | `/patient/settings` | Profile and preferences |

### Clinician portal (web dashboard)

Desktop sidebar layout with case management:

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/clinician` | Stats cards + recent assessments table |
| Patient Queue | `/clinician/queue` | Searchable, filterable case queue |
| Site Management | `/clinician/sites` | Ward / care site configuration |
| System Admin | `/clinician/system-admin` | API health and system status |
| User Management | `/clinician/add-user` | Add patient / clinician accounts |

Priority pills: **Urgent** (red) · **Review** (amber) · **Routine** (green)

---

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) CUDA GPU for faster inference
- (Optional) `HF_TOKEN` for downloading gated MedSigLIP weights

### 1. Clone and install

```bash
git clone https://github.com/SyedAshhadIbrar/PostCareAI.git
cd PostCareAI

pip install -r requirements.txt
```

### 2. Export production model

After Run 2 training (or if weights already exist locally):

```bash
python training/scripts/export_production_model.py
```

This copies the best checkpoint and tuned `thresholds.json` into `models/medsiglip/`.

### 3. Run backend

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify: http://127.0.0.1:8000/health

### 4. Run frontend (development)

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 and log in with demo credentials above.

### 5. Production build (single server)

```bash
cd frontend && npm run build && cd ..
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Serves React UI at http://127.0.0.1:8000/

### 6. Run tests

```bash
pytest tests/ -v
```

---

## API overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Model loaded, RAG index, Gemini status |
| `/wound/assess` | POST | Direct wound image assessment (MedSigLIP) |
| `/api/auth/login` | POST | Patient / clinician login |
| `/api/patients/upload` | POST | Daily check-in (photo + symptoms) |
| `/patient/status` | GET | Patient recovery status |
| `/patient/case/{id}/chat` | POST | RAG recovery chat |
| `/clinician/cases` | GET | Clinician case queue |
| `/clinician/cases/{id}` | GET | Case detail + AI handoff |
| `/clinician/cases/{id}/review` | POST | Mark case reviewed |

Full interactive docs: http://127.0.0.1:8000/docs

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| **ML** | PyTorch, Hugging Face Transformers, MedSigLIP-448, SurgWound dataset |
| **MLOps** | MLflow, YAML configs, experiment lineage (Run 1 → Run 2) |
| **Backend** | FastAPI, SQLAlchemy, SQLite, Pydantic |
| **RAG** | sentence-transformers (`all-MiniLM-L6-v2`), pypdf, 16 indexed chunks |
| **Agents** | Google Gemini 2.0 Flash (optional) + rule-based fallback |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router |
| **Testing** | pytest, httpx |

---

## Project structure

```
PostCareAI/
├── backend/
│   ├── agents/          # Triage, patient, clinician, recovery chat
│   ├── routes/          # FastAPI routers (wound, patient, clinician, auth)
│   ├── services/        # Wound inference, RAG, safety, vector store
│   └── database/        # SQLite models and seed data
├── frontend/
│   └── src/
│       ├── components/  # Patient (mobile) + clinician (web) UIs
│       └── lib/         # API client, site config
├── models/medsiglip/    # Production inference artifacts (config, thresholds, weights*)
├── rag/documents/       # Clinical care guide PDFs for RAG
├── training/
│   ├── configs/         # run1_underfitting.yaml, run2_best.yaml
│   ├── experiments/     # EXPERIMENT_LOG.md
│   ├── scripts/       # train.py, export_production_model.py
│   └── outputs/         # Run artifacts (not in git)
├── tests/               # pytest suite (API, safety, triage, RAG)
└── requirements.txt
```

\* Model weights are not committed to git. Export via `training/scripts/export_production_model.py`.

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HF_TOKEN` | — | Hugging Face auth for gated `google/medsiglip-448` |
| `POSTCARE_MODEL_DIR` | `models/medsiglip` | Override model artifact path |
| `POSTCARE_DEVICE` | auto | `cuda` or `cpu` |
| `POSTCARE_DATABASE_URL` | SQLite local | Database connection string |
| `POSTCARE_GEMINI_API_KEY` | — | Enable Gemini agents (optional) |
| `POSTCARE_GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model ID |
| `VITE_API_BASE` | `http://127.0.0.1:8000` | Frontend API URL (dev) |

---

## MLOps workflow

```
Run 1 (underfit baseline)  →  Run 2 (production)  →  export_production_model.py  →  FastAPI inference
     40 steps                      300 steps                    models/medsiglip/
     fixed 0.5 thresholds          Youden J thresholds          thresholds.json
```

| Artifact | Location |
|----------|----------|
| Experiment configs | `training/configs/` |
| Run lineage log | `training/experiments/EXPERIMENT_LOG.md` |
| MLflow tracking | `training/mlruns/` |
| Model metadata | `models/medsiglip/postcare_config.json` |
| Per-label thresholds | `models/medsiglip/thresholds.json` |

Reproduce training:

```bash
cd training
pip install -r requirements.txt
export HF_TOKEN=...
python scripts/run_experiment_lineage.py   # Run 1 → Run 2
mlflow ui --backend-store-uri ./mlruns    # view experiments
```

---

## Limitations

- **Not clinically validated** — prototype for research and demonstration
- **Small dataset** — 480 train / 137 test images; results may not generalize
- **Urgency sensitivity** — 87.5% with tuned threshold, but AUC only 0.71; clinician review is essential
- **Edema** — 102 missing labels in training; sensitivity remains low (33%)
- **Prototype auth** — demo credentials; not production-grade security
- **No real-time monitoring** — no alerting, FHIR integration, or EHR connectivity

---

## License

See [LICENSE](LICENSE).
