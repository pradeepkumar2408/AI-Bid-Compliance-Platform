import os
import io
from app.ocr_engine import ocr_engine
from app.nlp_extractor import nlp_extractor
from app.forgery_detector import forgery_detector
from app.duplicate_detector import duplicate_detector
from app.shap_explainer import shap_explainer

def test_ocr_and_nlp_pipeline():
    print("=== 1. DIAGNOSTICS CHECK ===")
    diag = ocr_engine.get_diagnostic_info()
    print("OCR Diagnostics:", diag)
    assert "tesseract_available" in diag
    assert "poppler_available" in diag
    print("[PASS] Diagnostics check passed.\n")

    print("=== 2. NO FAKE PLACEHOLDERS ON UNREADABLE / EMPTY INPUT ===")
    empty_result = ocr_engine.extract_text_and_meta(b"", "empty.pdf")
    print("Empty file result:", empty_result)
    assert empty_result["text"] == ""
    assert empty_result["status"] == "FAILED"
    assert len(empty_result["warnings"]) > 0
    assert "Scanned procurement document" not in empty_result["text"]
    assert "Scanned Certificate image" not in empty_result["text"]
    print("[PASS] Zero fake placeholders verified.\n")

    print("=== 3. NLP TEXT NORMALIZATION & OCR CONFUSION REPAIR ===")
    # Raw OCR text with OCR errors:
    # - "AAACB l234F" (digit 1 recognized as lowercase L)
    # - "O7AAACB 1234F 1Z5" (first digit 0 recognized as letter O)
    # - Multiline broken turnover: "Turnover:\n INR 28.5 Crores"
    # - Excessive whitespace and newline breaks
    ocr_corrupted_text = """
    Chartered Accountant Audit Statement
    Company Name:   M/s Bharat Tech Solutions Pvt Ltd  

    PAN Number:   AAACBl234F
    GSTIN:   O7AAACB1234F125

    Annual  Turnover:
    INR 28.5  Crores
    
    Standing: 9 years of experience in HPC systems
    Certifications: ISO-9001:2015, ISO 27001, CMMI Level 5
    """

    entities = nlp_extractor.extract_entities(ocr_corrupted_text)
    print("Extracted Entities with OCR repair:", entities)
    assert entities["pan"] == "AAACB1234F", f"Expected AAACB1234F, got {entities['pan']}"
    assert entities["gstin"] == "07AAACB1234F1Z5", f"Expected 07AAACB1234F1Z5, got {entities['gstin']}"
    assert entities["turnover_inr"] == 285000000.0, f"Expected 285000000.0, got {entities['turnover_inr']}"
    assert entities["experience_years"] == 9.0, f"Expected 9.0, got {entities['experience_years']}"
    assert "ISO-9001" in entities["certifications"]
    assert "ISO-27001" in entities["certifications"]
    assert "CMMI-Level-3/5" in entities["certifications"]
    print("[PASS] NLP normalization and OCR repair passed.\n")

    print("=== 4. DIGITAL TEXT EXTRACTION ===")
    sample_txt = "Chartered Accountant Certified Turnover INR 50 Crores. PAN: BBBCB5678G. GSTIN: 27BBBCB5678G1Z8. Experience: 6 years. Certifications: ISO-9001."
    res = ocr_engine.extract_text_and_meta(sample_txt.encode('utf-8'), "audit.txt")
    print("Plain Text extract result:", res["status"], res["ocr_engine_used"])
    assert res["text"] == sample_txt
    assert res["ocr_engine_used"] == "utf8_decode"
    print("[PASS] Plain text / digital extract passed.\n")

    print("=== 5. SHAP EXPLAINABILITY ===")
    explanation = shap_explainer.explain(
        bidder_metrics={"turnover_inr": 285000000.0, "experience_years": 9.0, "certifications_match_ratio": 1.0, "identity_score": 1.0, "tamper_score": 0.05, "is_duplicate": False},
        tender_requirements={"min_turnover_inr": 100000000.0, "min_experience_years": 5.0}
    )
    print(f"SHAP Score: {explanation['final_score']}%, Risk: {explanation['risk_level']}")
    assert explanation["final_score"] > 80.0
    print("[PASS] SHAP explainability passed.\n")

from app.document_classifier import document_classifier

def test_document_classifier():
    print("=== 6. DOCUMENT CLASSIFICATION & VALIDATION GATE ===")
    
    # Test 1: Valid GST Certificate
    gst_text = "Government of India - Form GST REG-06 - Registration Certificate. GSTIN: 07AAACB1234F1Z5. Legal Name: Bharat Tech Solutions Pvt Ltd. Principal Place of Business: Delhi."
    c1 = document_classifier.classify_and_validate(gst_text, "gst_cert.pdf")
    print("GST Classification:", c1["validation_status"], c1["detected_category"], f"Confidence: {c1['confidence_score']}")
    assert c1["is_valid"] is True
    assert c1["detected_category"] == "GST_CERTIFICATE"

    # Test 2: Valid Financial Balance Sheet
    fin_text = "Chartered Accountant Certified Audit Report. Annual Turnover for FY 2024-25 is INR 28.5 Crores. UDIN: 24012345ABCD. Net Worth: Positive."
    c2 = document_classifier.classify_and_validate(fin_text, "balance_sheet.pdf")
    print("Financials Classification:", c2["validation_status"], c2["detected_category"])
    assert c2["is_valid"] is True
    assert c2["detected_category"] == "FINANCIAL_STATEMENTS"

    # Test 3: Invalid - Resume / CV
    resume_text = "Curriculum Vitae - John Doe. Career Objective: Looking for a challenging role in software. Technical Skills: Python, Java, React. Education: B.Tech Computer Science CGPA 8.5. Hobbies: Chess."
    c3 = document_classifier.classify_and_validate(resume_text, "john_resume.pdf")
    print("Resume Classification (Expected INVALID):", c3["validation_status"], c3["detected_category"])
    assert c3["is_valid"] is False
    assert c3["detected_category"] == "RESUME_CV"
    assert "Invalid or irrelevant document uploaded" in c3["rejection_reason"]

    # Test 4: Invalid - Personal Aadhaar Card
    aadhaar_text = "Unique Identification Authority of India - Government of India. Mera Aadhaar, Meri Pehchan. DOB: 12/04/1998. Gender: Male. Address: 123 Street, New Delhi."
    c4 = document_classifier.classify_and_validate(aadhaar_text, "aadhaar_card.jpg")
    print("Aadhaar Classification (Expected INVALID):", c4["validation_status"], c4["detected_category"])
    assert c4["is_valid"] is False
    assert c4["detected_category"] == "PERSONAL_DOCUMENT"
    assert "Invalid or irrelevant document uploaded" in c4["rejection_reason"]

    # Test 5: Invalid - Blank or Low content
    blank_text = "Scan file"
    c5 = document_classifier.classify_and_validate(blank_text, "scan.jpg")
    print("Blank File Classification (Expected INVALID):", c5["validation_status"], c5["detected_category"])
    assert c5["is_valid"] is False
    assert c5["detected_category"] == "BLANK_OR_LOW_CONTENT"

    print("[PASS] Document classification & irrelevant document rejection gate verified.\n")


def test_all():
    test_ocr_and_nlp_pipeline()
    test_document_classifier()
    print(">>> ALL UNIT & CLASSIFICATION TESTS PASSED! <<<")


if __name__ == "__main__":
    test_all()

