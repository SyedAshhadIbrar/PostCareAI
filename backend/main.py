from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import db
from backend.routes.clinician import router as clinician_router
from backend.routes.patient import router as patient_router
from backend.routes.wound import router as wound_router
from backend.routes.auth import router as auth_router
from backend.spa import serve_react

REPO_ROOT = Path(__file__).resolve().parents[1]

app = FastAPI(
    title="PostCare API",
    description="Post-operative wound assessment and multi-agent care guidance.",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wound_router)
app.include_router(patient_router)
app.include_router(clinician_router)
app.include_router(auth_router)

from backend.routes.patient import upload_patient_log

app.add_api_route(
    "/api/patients/upload",
    upload_patient_log,
    methods=["POST"],
    tags=["patient"],
)

app.mount("/ui/patient", StaticFiles(directory=REPO_ROOT / "frontend-old" / "patient", html=True), name="patient-ui")
app.mount("/ui/clinician", StaticFiles(directory=REPO_ROOT / "frontend-old" / "clinician", html=True), name="clinician-ui")


@app.on_event("startup")
def startup() -> None:
    db.init_db()
    db.seed_demo_users()
    from backend.services.vector_store import vector_store

    vector_store.load_or_build()


@app.get("/health")
def health():
    from backend.services import postcare_gemini
    from backend.services.vector_store import vector_store
    from backend.services.wound_model import wound_model as wm

    return {
        "status": "ok",
        "model_loaded": wm is not None,
        "model_version": wm.model_version if wm else None,
        "postcare_gemini": {
            "configured": postcare_gemini.is_configured(),
            "agent_name": postcare_gemini.AGENT_NAME,
            "model": postcare_gemini.MODEL,
        },
        "rag": {
            "chunks_indexed": len(vector_store.chunks),
            "embed_model": vector_store.embed_model or None,
        },
    }


@app.get("/")
async def react_root():
    return serve_react()


@app.get("/{full_path:path}")
async def react_catch_all(full_path: str):
    return serve_react(full_path)
