# PostCare AI — Three Minute Thesis (Single Slide)

> **Syed Ashhad Ibrar** · Capstone · Pakistan Kidney & Liver Institute (Lahore) · Liver Transplant  
> *Prototype — not clinically validated*

---

## The problem

After discharge, **wound complications are often detected too late**. Patients recover at home without daily clinical oversight. Clinicians cannot manually review every wound photo. The gap between **discharge and the next visit** is where preventable complications escalate.

---

## Our solution

**PostCare AI** — a multi-agent platform for post-operative wound monitoring with **clinicians in the loop**.

| Step | What happens |
|:----:|--------------|
| **1** | **Patient check-in** — wound photo + pain, symptoms, post-op day |
| **2** | **MedSigLIP (fine-tuned)** — scores 6 visual signals: healing, erythema, edema, infection risk, urgency, exudate |
| **3** | **Safety rules + AI agents** — triage priority → patient guidance → clinician handoff summary |
| **4** | **RAG recovery chat** — patient asks recovery questions; vector search + personal case data |
| **5** | **Clinician dashboard** — priority queue, case review, mark complete |

---

## Why it matters

- **Not autonomous diagnosis** — decision support; humans make final calls  
- **Scalable remote monitoring** — vision AI handles daily screening at scale  
- **Prioritised handoff** — surgeons review high-risk patients first  
- **MLOps lineage** — Run 1 (underfit baseline) → Run 2 (production model, Youden thresholds, MLflow)

---

## Impact

Earlier detection · daily patient reassurance · structured clinician workflow · reproducible model training from Kaggle to production API

---

# Speaker notes (~3 minutes)

### 0:00–0:30 · Hook

Imagine you have just had liver transplant surgery. You are sent home with instructions — but who checks your wound every day? Infection and poor healing often show visual signs before patients realise. In settings like PKLI Lahore, follow-up is limited and clinicians cannot review hundreds of photos manually. **PostCare AI fills that gap.**

### 0:30–1:30 · What we built

Patients use a mobile web app to upload a daily wound photo and log symptoms. We fine-tuned **MedSigLIP** on the SurgWound dataset — six clinical visual labels — with a documented Run 1 to Run 2 training pipeline. Safety rules flag high pain and concerning scores. Three agents then triage priority, write patient guidance, and prepare a clinician summary. A **RAG chat assistant** lets patients ask recovery questions grounded in their own case data and a medical knowledge base.

### 1:30–2:30 · Why it matters

This is decision support, not replacement of care teams. High-priority cases surface on a clinician dashboard for human review. We combined computer vision, retrieval-augmented generation, and LLM agents into one pipeline — from Kaggle training to a FastAPI backend with patient and clinician frontends. The MLOps story shows iterative improvement, not a single black-box run.

### 2:30–3:00 · Close

PostCare AI aims to make post-operative wound monitoring **earlier, scalable, and safer** — daily reassurance for patients, a prioritised queue for clinicians. Next step: validation with qualified wound-care specialists. **Thank you.**

---

## Quick Q&A prep

| Question | Answer |
|----------|--------|
| Is it clinically approved? | No — research prototype / capstone |
| Why MedSigLIP? | Medical-domain vision model; fine-tuned on surgical wounds |
| What if the model is wrong? | Safety flags + mandatory clinician review pathway |
