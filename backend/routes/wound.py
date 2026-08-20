from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.services.wound_model import wound_model

router = APIRouter(prefix="/wound", tags=["wound"])


@router.post("/assess")
async def assess_wound(image: UploadFile = File(...)):
    if wound_model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "MedSigLIP model not loaded. Export training artifacts to "
                "models/medsiglip/ then restart the API."
            ),
        )

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload must be an image file.")

    image_bytes = await image.read()
    result = wound_model.predict(image_bytes)
    return result.model_dump()
