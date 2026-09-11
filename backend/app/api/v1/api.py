from fastapi import APIRouter
from app.api.v1 import health, documents, auth, review, training

api_router = APIRouter()

# Health endpoints
api_router.include_router(health.router, tags=["Health"])

# Authentication & User endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Documents & Extraction endpoints
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])

# Active Learning Human Review Queue endpoints
api_router.include_router(review.router, prefix="/review", tags=["Review Queue"])

# Active Learning Model Training & Registry endpoints
api_router.include_router(training.router, prefix="/training", tags=["Model Training & Registry"])

