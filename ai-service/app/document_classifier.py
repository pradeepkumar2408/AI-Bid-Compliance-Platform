import re
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("ai_service.classifier")


class DocumentClassifier:
    """
    Robust Document Validation and Classification Engine for Procurement Platforms.
    Performs pre-processing validation to detect and classify the 7 Required Procurement Document types
    and reject irrelevant documents (e.g., Resumes, personal IDs, random invoices, blank/low-content files).
    """

    # 7 Statutory Tender Document Categories
    VALID_CATEGORIES = {
        "PAN_CARD": "1. PAN Card of the Business / Entity",
        "GST_CERTIFICATE": "2. GST Registration Certificate (Form GST REG-06)",
        "COMPANY_REGISTRATION": "3. Company Registration Certificate (CIN / MCA / Udyam MSME)",
        "EXPERIENCE_CERTIFICATES": "4. Experience & Past Performance / Completion Certificates",
        "FINANCIAL_DOCUMENTS": "5. Financial Documents (CA Turnover Certificate with UDIN & Balance Sheet)",
        "ISO_COMPLIANCE": "6. ISO / Quality & Statutory Compliance Certificates",
        "TECHNICAL_PROPOSAL": "7. Technical Proposal & Specification Compliance Matrix"
    }

    # Invalid Irrelevant Categories
    INVALID_CATEGORIES = {
        "RESUME_CV": "Resume / Curriculum Vitae (Individual Profile)",
        "PERSONAL_DOCUMENT": "Unlinked Personal ID (Non-Signatory / Unrelated)",
        "INVOICE_BILL": "Casual Utility Bill / Retail Invoice",
        "BLANK_OR_LOW_CONTENT": "Blank or Insufficient Text Content",
        "UNRELATED_DOCUMENT": "Unrelated / Non-Procurement Document"
    }

    def __init__(self):
        # 1. Valid Procurement Indicators (Patterns & Weights for 7 Categories)
        self.valid_patterns: Dict[str, List[Tuple[re.Pattern, float]]] = {
            "PAN_CARD": [
                (re.compile(r'\b(?:Income\s+Tax\s+Department|Govt\.?\s+of\s+India|Permanent\s+Account\s+Number|PAN\s+Card|INCOMETAX\s+DEPARTMENT)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b[A-Z]{3}[CPFAHTGELJ][A-Z][0-9]{4}[A-Z]\b', re.IGNORECASE), 4.5),
                (re.compile(r'\b(?:Father\'s\s+Name|Date\s+of\s+Birth|Date\s+of\s+Incorporation|Taxpayer\s+Identification)\b', re.IGNORECASE), 2.0),
            ],
            "GST_CERTIFICATE": [
                (re.compile(r'\b(?:GSTIN|Goods\s+(?:and|&)\s+Services\s+Tax|Form\s+GST\s+REG[\s\-]?06|Taxpayer\s+Type)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:Registration\s+Certificate|Principal\s+Place\s+of\s+Business|State\s+Jurisdiction|Centre\s+Jurisdiction|Government\s+of\s+India)\b', re.IGNORECASE), 2.5),
                (re.compile(r'\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b', re.IGNORECASE), 4.5),
            ],
            "COMPANY_REGISTRATION": [
                (re.compile(r'\b(?:Certificate\s+of\s+Incorporation|Registrar\s+of\s+Companies|Ministry\s+of\s+Corporate\s+Affairs|MCA|Udyam\s+Registration|MSME)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:Corporate\s+Identity\s+Number|CIN|LLPIN|Articles\s+of\s+Association|Memorandum\s+of\s+Association|MOA|AOA|Partnership\s+Deed)\b', re.IGNORECASE), 3.5),
                (re.compile(r'\b(?:Private\s+Limited|Pvt\.?\s+Ltd\.?|Limited|LLP|Shop\s+(?:and|&)\s+Establishment|Trade\s+Licen[sc]e|Enterprise\s+Type)\b', re.IGNORECASE), 2.5),
                (re.compile(r'\b(?:Companies\s+Act|Section\s+7|Section\s+8|Commercial\s+Enterprise|UDYAM[\s\-]?[A-Z]{2}[\s\-]?[0-9]{2}[\s\-]?[0-9]{7})\b', re.IGNORECASE), 3.0),
            ],
            "EXPERIENCE_CERTIFICATES": [
                (re.compile(r'\b(?:Work\s+Order|Purchase\s+Order|Completion\s+Certificate|Performance\s+Certificate|Client\s+Testimonial|Experience\s+Certificate)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:Experience\s+Letter|Executed\s+Value|Project\s+Scope|Contract\s+No\.?|Supply\s+Order|Satisfactory\s+Completion)\b', re.IGNORECASE), 3.5),
                (re.compile(r'\b(?:Successfully\s+completed|Years\s+of\s+(?:standing|experience)|Execution\s+period|Scope\s+of\s+Work)\b', re.IGNORECASE), 2.5),
            ],
            "FINANCIAL_DOCUMENTS": [
                (re.compile(r'\b(?:Chartered\s+Accountant|Auditor\'s\s+Report|Balance\s+Sheet|Profit\s+(?:and|&)\s+Loss|P&L|Turnover\s+Certificate)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:Annual\s+Turnover|Net\s+Worth|Financial\s+Year|FY\s+20[0-9]{2}|Gross\s+Revenue|Solvency\s+Certificate)\b', re.IGNORECASE), 3.5),
                (re.compile(r'\b(?:UDIN|Unique\s+Document\s+Identification\s+Number|Membership\s+No\.?|CA\s+Certified|Assets\s+and\s+Liabilities)\b', re.IGNORECASE), 3.5),
                (re.compile(r'\b(?:Crore|Crores|Lakhs|INR|Rs\.?|Audited\s+Financial\s+Statements)\b', re.IGNORECASE), 1.5),
            ],
            "ISO_COMPLIANCE": [
                (re.compile(r'\b(?:ISO[\s\-]?9001|ISO[\s\-]?27001|ISO[\s\-]?14001|ISO[\s\-]?45001|ISO[\s\-]?20000|ISO[\s\-]?22301)\b', re.IGNORECASE), 4.5),
                (re.compile(r'\b(?:Quality\s+Management\s+System|Information\s+Security\s+Management|Environmental\s+Management|CMMI|BIS|ISI)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:Certificate\s+of\s+Registration|Accreditation|NABCB|IAF|Valid\s+until|Expiry\s+Date|Standard)\b', re.IGNORECASE), 3.0),
            ],
            "TECHNICAL_PROPOSAL": [
                (re.compile(r'\b(?:Technical\s+Proposal|Technical\s+Specification|Scope\s+of\s+Work|Compliance\s+Matrix|Methodology)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:Bill\s+of\s+Materials|BOM|System\s+Architecture|Deliverables|Project\s+Plan|Implementation\s+Schedule)\b', re.IGNORECASE), 3.5),
                (re.compile(r'\b(?:Technical\s+Bid|Clause[\s\-]by[\s\-]Clause\s+Compliance|Functional\s+Requirements|SLA|Warranty)\b', re.IGNORECASE), 3.0),
            ]
        }

        # 2. Invalid Irrelevant Indicators (Patterns & Negative Weights)
        self.invalid_patterns: Dict[str, List[Tuple[re.Pattern, float]]] = {
            "RESUME_CV": [
                (re.compile(r'\b(?:Curriculum\s+Vitae|Resume|Biodata|Bio-data|CV)\b', re.IGNORECASE), 5.0),
                (re.compile(r'\b(?:Career\s+Objective|Professional\s+Summary|Academic\s+Background|Education|Qualifications)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:Technical\s+Skills|Key\s+Skills|Soft\s+Skills|Hobbies|Interests|Extracurricular)\b', re.IGNORECASE), 3.5),
                (re.compile(r'\b(?:Projects\s+Handled|Personal\s+Details|Languages\s+Known|Marital\s+Status)\b', re.IGNORECASE), 2.5),
                (re.compile(r'\b(?:Bachelor\s+of|Master\s+of|B\.?Tech|B\.?E\.?|MCA|MBA|B\.?Sc|CGPA|Percentage\s*\:)\b', re.IGNORECASE), 2.5),
            ],
            "PERSONAL_DOCUMENT": [
                (re.compile(r'\b(?:Driving\s+Licence|Driving\s+License|Voter\s+ID|Election\s+Commission\s+of\s+India|Passport\s+of\s+India)\b', re.IGNORECASE), 4.0),
                (re.compile(r'\b(?:DOB\s*\:|Date\s+of\s+Birth\s*\:|Gender\s*\:\s*(?:Male|Female|Transgender))\b', re.IGNORECASE), 2.5),
            ],
            "INVOICE_BILL": [
                (re.compile(r'\b(?:Restaurant|Food\s+Bill|Medical\s+Prescription|Hospital\s+Discharge|Flight\s+Ticket|Boarding\s+Pass|Movie\s+Ticket)\b', re.IGNORECASE), 4.5),
                (re.compile(r'\b(?:Electricity\s+Bill|Water\s+Bill|Gas\s+Bill|Broadband\s+Bill|Mobile\s+Recharge)\b', re.IGNORECASE), 3.5),
            ],
            "UNRELATED_DOCUMENT": [
                (re.compile(r'\b(?:Assignment|Homework|Class\s+Notes|Letter\s+to\s+Friend|Vacation|Holiday\s+Photos)\b', re.IGNORECASE), 4.0)
            ]
        }

    def classify_and_validate(self, text: str, filename: str = "", file_bytes: bytes = None, expected_doc_type: str = None) -> Dict[str, Any]:
        """
        Classifies the document and returns a structured validation outcome.
        Rejects invalid / irrelevant files and accurately identifies the 7 required document types.
        """
        clean_text = (text or "").strip()
        words = clean_text.split()
        char_count = len(clean_text)
        word_count = len(words)

        # 1. Minimum text threshold
        if word_count < 4 or char_count < 20:
            logger.warning(f"[Classifier] Document '{filename}' rejected: Low content (words={word_count}, chars={char_count})")
            return {
                "is_valid": False,
                "validation_status": "INVALID",
                "detected_category": "BLANK_OR_LOW_CONTENT",
                "category_label": self.INVALID_CATEGORIES["BLANK_OR_LOW_CONTENT"],
                "confidence_score": 0.95,
                "rejection_reason": "Document contains insufficient text or appears blank. Please upload a clear procurement document.",
                "details": {
                    "word_count": word_count,
                    "char_count": char_count,
                    "valid_score": 0.0,
                    "invalid_score": 5.0
                }
            }

        # 2. Compute Match Scores for Valid Categories
        category_scores: Dict[str, float] = {}
        for cat, patterns in self.valid_patterns.items():
            score = 0.0
            for pattern, weight in patterns:
                matches = pattern.findall(clean_text)
                if matches:
                    score += weight * min(len(matches), 3)
            category_scores[cat] = score

        # 3. Compute Match Scores for Invalid Categories
        invalid_scores: Dict[str, float] = {}
        for cat, patterns in self.invalid_patterns.items():
            score = 0.0
            for pattern, weight in patterns:
                matches = pattern.findall(clean_text)
                if matches:
                    score += weight * min(len(matches), 3)
            invalid_scores[cat] = score

        # Filename heuristics (objective detection, no slot bias)
        lower_fn = (filename or "").lower()
        exp_type = (expected_doc_type or "").upper()

        if any(kw in lower_fn for kw in ["pan"]):
            category_scores["PAN_CARD"] = category_scores.get("PAN_CARD", 0) + 2.5
        if any(kw in lower_fn for kw in ["gst", "reg06", "tax"]):
            category_scores["GST_CERTIFICATE"] = category_scores.get("GST_CERTIFICATE", 0) + 2.5
        if any(kw in lower_fn for kw in ["incorporation", "mca", "cin", "udyam", "msme", "registration", "coi"]):
            category_scores["COMPANY_REGISTRATION"] = category_scores.get("COMPANY_REGISTRATION", 0) + 2.5
        if any(kw in lower_fn for kw in ["exp", "experience", "workorder", "completion", "order", "past"]):
            category_scores["EXPERIENCE_CERTIFICATES"] = category_scores.get("EXPERIENCE_CERTIFICATES", 0) + 2.5
        if any(kw in lower_fn for kw in ["turnover", "balance", "audit", "pnl", "udin", "financial", "ca"]):
            category_scores["FINANCIAL_DOCUMENTS"] = category_scores.get("FINANCIAL_DOCUMENTS", 0) + 2.5
        if any(kw in lower_fn for kw in ["iso", "9001", "27001", "compliance", "quality", "cmmi", "bis"]):
            category_scores["ISO_COMPLIANCE"] = category_scores.get("ISO_COMPLIANCE", 0) + 2.5
        if any(kw in lower_fn for kw in ["technical", "proposal", "spec", "specification", "matrix", "methodology"]):
            category_scores["TECHNICAL_PROPOSAL"] = category_scores.get("TECHNICAL_PROPOSAL", 0) + 2.5

        # Check for invalid resumes / invoices
        if any(kw in lower_fn for kw in ["resume", "cv", "biodata", "curriculum"]):
            invalid_scores["RESUME_CV"] = invalid_scores.get("RESUME_CV", 0) + 4.5
        if any(kw in lower_fn for kw in ["flight", "hotel", "restaurant", "hospital", "prescription"]):
            invalid_scores["INVOICE_BILL"] = invalid_scores.get("INVOICE_BILL", 0) + 4.5

        top_valid_cat = max(category_scores, key=category_scores.get) if category_scores else "UNKNOWN"
        top_valid_score = category_scores.get(top_valid_cat, 0.0)

        top_invalid_cat = max(invalid_scores, key=invalid_scores.get) if invalid_scores else "UNKNOWN"
        top_invalid_score = invalid_scores.get(top_invalid_cat, 0.0)

        logger.info(f"[Classifier] '{filename}' (exp='{expected_doc_type}'): valid='{top_valid_cat}' ({top_valid_score:.1f}), invalid='{top_invalid_cat}' ({top_invalid_score:.1f})")

        # 1. Invalid Document Rejection Logic
        if top_invalid_score >= 3.5 and top_invalid_score > top_valid_score:
            inv_label = self.INVALID_CATEGORIES.get(top_invalid_cat, "Irrelevant Document")
            confidence = min(0.99, max(0.50, top_invalid_score / (top_invalid_score + top_valid_score + 0.1)))

            if top_invalid_cat == "RESUME_CV":
                reason = "Invalid document: Resume / Curriculum Vitae detected. Please upload official procurement certificates."
            elif top_invalid_cat == "PERSONAL_DOCUMENT":
                reason = "Invalid document: Personal ID detected. Please upload business entity registration documents."
            elif top_invalid_cat == "INVOICE_BILL":
                reason = "Invalid document: Personal bill or casual receipt detected. Please upload formal procurement documents."
            else:
                reason = "Invalid or irrelevant document uploaded. Please upload genuine tender-related certificates."

            return {
                "is_valid": False,
                "validation_status": "INVALID",
                "detected_category": top_invalid_cat,
                "category_label": inv_label,
                "confidence_score": round(confidence, 2),
                "rejection_reason": reason,
                "details": {
                    "valid_scores": category_scores,
                    "invalid_scores": invalid_scores,
                    "word_count": word_count
                }
            }

        # 2. Insufficient Procurement Markers
        if top_valid_score < 1.0:
            if exp_type and (exp_type.startswith("CUSTOM_") or exp_type not in self.VALID_CATEGORIES):
                # Valid custom document provided for officer-defined custom slot
                return {
                    "is_valid": True,
                    "validation_status": "VALID",
                    "detected_category": exp_type,
                    "expected_category": exp_type,
                    "category_label": "Custom Procurement Document",
                    "confidence_score": 0.90,
                    "rejection_reason": None,
                    "details": {
                        "valid_scores": category_scores,
                        "invalid_scores": invalid_scores,
                        "word_count": word_count
                    }
                }

            return {
                "is_valid": False,
                "validation_status": "INVALID",
                "detected_category": "UNRELATED_DOCUMENT",
                "category_label": self.INVALID_CATEGORIES["UNRELATED_DOCUMENT"],
                "confidence_score": 0.85,
                "rejection_reason": "Invalid or irrelevant document uploaded. Please upload procurement documents like PAN, GST, CIN/Udyam, Experience, Financials, ISO, or Technical Proposal.",
                "details": {
                    "valid_scores": category_scores,
                    "invalid_scores": invalid_scores,
                    "word_count": word_count
                }
            }

        # 3. Dynamic Genuine Confidence Calculation
        total_valid = sum(category_scores.values())
        ratio = top_valid_score / (total_valid if total_valid > 0 else 1.0)
        evidence_factor = min(1.0, top_valid_score / 5.0)
        confidence = min(0.99, max(0.40, ratio * (0.65 + 0.34 * evidence_factor)))
        valid_label = self.VALID_CATEGORIES.get(top_valid_cat, "Procurement Document")

        # 4. Slot Category Mismatch Check
        if exp_type and exp_type in self.VALID_CATEGORIES and exp_type != top_valid_cat:
            exp_label = self.VALID_CATEGORIES.get(exp_type, exp_type)
            logger.warning(f"[Classifier] Slot mismatch for '{filename}': expected '{exp_type}', detected '{top_valid_cat}'")
            return {
                "is_valid": False,
                "validation_status": "MISMATCH",
                "detected_category": top_valid_cat,
                "expected_category": exp_type,
                "category_label": valid_label,
                "confidence_score": round(confidence, 2),
                "rejection_reason": f"Document Slot Mismatch: AI classified this file as '{valid_label}', but it was uploaded into the '{exp_label}' slot. Please upload this file into its matching slot.",
                "details": {
                    "valid_scores": category_scores,
                    "invalid_scores": invalid_scores,
                    "dominant_category": top_valid_cat,
                    "expected_category": exp_type,
                    "word_count": word_count
                }
            }

        return {
            "is_valid": True,
            "validation_status": "VALID",
            "detected_category": top_valid_cat,
            "expected_category": exp_type or top_valid_cat,
            "category_label": valid_label,
            "confidence_score": round(confidence, 2),
            "rejection_reason": None,
            "details": {
                "valid_scores": category_scores,
                "invalid_scores": invalid_scores,
                "dominant_category": top_valid_cat,
                "word_count": word_count
            }
        }


# Global Singleton Instance
document_classifier = DocumentClassifier()
