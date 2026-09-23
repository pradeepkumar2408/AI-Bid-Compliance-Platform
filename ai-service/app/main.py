import os
import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from app.ocr_engine import ocr_engine
from app.nlp_extractor import nlp_extractor
from app.forgery_detector import forgery_detector
from app.duplicate_detector import duplicate_detector
from app.shap_explainer import shap_explainer
from app.document_classifier import document_classifier
from app.rag_chatbot import rag_chatbot_engine
from app.bid_verifier import bid_verification_engine

# Configure standard logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("ai_service.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Diagnostic Check
    logger.info("==================================================================")
    logger.info("GeM AI Microservice Initializing...")
    diag = ocr_engine.get_diagnostic_info()
    if diag["tesseract_available"]:
        logger.info(f"[OK] Tesseract OCR Binary Found: version {diag['tesseract_version']} at '{diag['tesseract_path']}'")
    else:
        logger.warning("[WARNING] Tesseract OCR Binary NOT found on host system. Scanned document/image OCR will fail.")
        logger.warning("-> On Windows: Install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki and add to PATH.")

    if diag["poppler_available"]:
        logger.info(f"[OK] Poppler Utilities (pdftoppm) Found: at '{diag['poppler_path']}'")
    else:
        logger.warning("[WARNING] Poppler Utilities NOT found. Scanned PDF page conversion will not be available.")
        logger.warning("-> On Windows: Download Poppler from https://github.com/oschwartz10612/poppler-windows/releases and add bin/ to PATH.")

    logger.info("==================================================================")
    yield
    logger.info("GeM AI Microservice Shutting Down...")


app = FastAPI(
    title="GeM Procurement AI Compliance Verification Service",
    description="Microservice for Document Classification, OCR, NLP Entity Extraction, ELA Forgery Detection, Cross-Bidder Duplicate Detection & SHAP Explainability",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreExplainRequest(BaseModel):
    bidder_metrics: Dict[str, Any]
    tender_requirements: Dict[str, Any]


@app.get("/api/ai/health")
async def health_check():
    """
    Returns microservice health status along with full diagnostic details
    about OCR, Tesseract version/path, Poppler, and extraction engines.
    """
    diag = ocr_engine.get_diagnostic_info()
    return {
        "status": "HEALTHY",
        "service": "gem-ai-microservice",
        "diagnostics": diag,
        "ocr_available": diag["tesseract_available"]
    }


@app.post("/api/ai/classify-document")
async def classify_document_endpoint(
    file: UploadFile = File(...)
):
    """
    Stand-alone endpoint for instant pre-upload document classification and validation.
    """
    filename = file.filename or "uploaded_doc"
    contents = await file.read()
    ocr_result = ocr_engine.extract_text_and_meta(contents, filename)
    ocr_text = ocr_result.get("text", "")
    classification = document_classifier.classify_and_validate(ocr_text, filename, contents)
    return {
        "filename": filename,
        "classification": classification,
        "ocr_snippet": ocr_text[:300] if ocr_text else ""
    }


@app.post("/api/ai/process-document")
async def process_document(
    file: UploadFile = File(...),
    bidder_id: str = Form("anonymous"),
    tender_id: str = Form("TDR-DEFAULT"),
    doc_type: str = Form("GENERAL")
):
    filename = file.filename or "uploaded_doc"
    logger.info(f"[Process Document] Received '{filename}' (type: {doc_type}) from bidder '{bidder_id}' for tender '{tender_id}'")

    try:
        contents = await file.read()

        # 1. OCR & Text Extraction with full metadata and warnings
        ocr_result = ocr_engine.extract_text_and_meta(contents, filename)
        ocr_text = ocr_result.get("text", "")
        ocr_engine_used = ocr_result.get("ocr_engine_used", "none")
        warnings = list(ocr_result.get("warnings", []))
        ocr_status = ocr_result.get("status", "SUCCESS")

        logger.info(f"[Process Document] OCR on '{filename}': engine='{ocr_engine_used}', status='{ocr_status}', extracted {len(ocr_text)} characters")

        # 2. Document Classification & Validation Gate (Enforce Pre-processing Integrity)
        classification = document_classifier.classify_and_validate(
            text=ocr_text,
            filename=filename,
            file_bytes=contents,
            expected_doc_type=doc_type
        )

        if not classification.get("is_valid", False):
            logger.warning(f"[Process Document] REJECTED invalid document '{filename}': {classification.get('rejection_reason')}")
            return {
                "success": False,
                "is_valid": False,
                "status": "REJECTED",
                "validation_status": classification.get("validation_status", "INVALID"),
                "filename": filename,
                "doc_type": doc_type,
                "detected_category": classification.get("detected_category"),
                "category_label": classification.get("category_label"),
                "confidence_score": classification.get("confidence_score", 0.0),
                "rejection_reason": classification.get("rejection_reason"),
                "classification": classification,
                "ocr_text": ocr_text,
                "ocr_engine_used": ocr_engine_used,
                "ocr_status": ocr_status,
                "warnings": warnings,
                "entities": {},
                "tamper_analysis": {"tamper_detected": False, "tamper_score": 0.0, "reason": "Document rejected at classification stage"},
                "duplicate_analysis": {"is_duplicate": False}
            }

        # 3. NLP Entity Extraction (with normalized text & OCR repair)
        entities = nlp_extractor.extract_entities(ocr_text)

        # 4. Forgery & Tamper Detection (ELA)
        tamper_report = forgery_detector.analyze(contents, filename)

        # 5. Cross-bidder Duplicate Check
        duplicate_report = duplicate_detector.check_duplicate(
            file_bytes=contents,
            filename=filename,
            bidder_id=bidder_id,
            tender_id=tender_id
        )

        return {
            "success": True,
            "is_valid": True,
            "status": "VALID",
            "validation_status": "VALID",
            "filename": filename,
            "doc_type": doc_type,
            "detected_category": classification.get("detected_category"),
            "category_label": classification.get("category_label"),
            "confidence_score": classification.get("confidence_score", 0.0),
            "rejection_reason": None,
            "classification": classification,
            "ocr_text": ocr_text,
            "ocr_engine_used": ocr_engine_used,
            "ocr_status": ocr_status,
            "warnings": warnings,
            "entities": entities,
            "tamper_analysis": tamper_report,
            "duplicate_analysis": duplicate_report
        }

    except Exception as e:
        logger.error(f"[Process Document] Exception while processing '{filename}': {type(e).__name__} - {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Document processing error on {filename}",
                "exception_type": type(e).__name__,
                "message": str(e),
                "filename": filename
            }
        )


@app.post("/api/ai/explain-score")
async def explain_score(request: ScoreExplainRequest):
    try:
        explanation = shap_explainer.explain(
            bidder_metrics=request.bidder_metrics,
            tender_requirements=request.tender_requirements
        )
        return {
            "success": True,
            "explanation": explanation
        }
    except Exception as e:
        logger.error(f"[Explain Score] Exception: {type(e).__name__} - {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Explainability calculation error: {str(e)}")


@app.post("/api/ai/reset-registry")
async def reset_registry():
    duplicate_detector.doc_registry.clear()
    logger.info("[Registry] Duplicate document registry cleared.")
    return {"success": True, "message": "Duplicate registry cleared."}


class ChatQueryRequest(BaseModel):
    query: str
    user_info: Optional[Dict[str, Any]] = None
    active_tenders: Optional[List[Dict[str, Any]]] = None
    history: Optional[List[Dict[str, Any]]] = None


@app.post("/api/ai/chat/query")
async def chat_query_endpoint(request: ChatQueryRequest):
    """
    RAG-Powered Conversational Endpoint for Bidders:
    Performs TF-IDF semantic vector retrieval over GeM procurement policies,
    application guidelines, fraud detection metrics, and historical tenders.
    """
    try:
        response = rag_chatbot_engine.query(
            query_text=request.query,
            user_info=request.user_info,
            active_tenders=request.active_tenders,
            history=request.history
        )
        return response
    except Exception as e:
        logger.error(f"[Chat RAG] Error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


class VerifyBidPackageRequest(BaseModel):
    bidder_input: Dict[str, Any]
    documents: List[Dict[str, Any]]
    tender_requirements: Optional[Dict[str, Any]] = None


@app.post("/api/ai/verify-bid-package")
async def verify_bid_package_endpoint(request: VerifyBidPackageRequest):
    """
    Unified 14-Point AI Verification & Authenticity Detection Endpoint:
    Processes all 7 required procurement document categories, validates structured/unstructured data,
    performs cross-verification, detects tampering/duplicates, computes risk & authenticity score,
    and returns explainable evidence-based findings with officer decision-support advisories.
    """
    try:
        result = bid_verification_engine.verify_bid_package(
            bidder_input=request.bidder_input,
            documents=request.documents,
            tender_requirements=request.tender_requirements
        )
        return {"success": True, "result": result}
    except Exception as e:
        logger.error(f"[Verify Bid Package] Error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


