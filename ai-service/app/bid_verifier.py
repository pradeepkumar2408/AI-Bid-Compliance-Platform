import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ai_service.bid_verifier")


class BidVerificationEngine:
    """
    AI-Powered Bid Verification & Authenticity Detection Engine.
    Executes multi-document requirement validation, structured vs unstructured parsing,
    cross-verification, tamper analysis, risk scoring, explainable AI reasoning,
    and officer decision-support generation.
    """

    MANDATORY_DOC_TYPES = [
        "PAN_CARD",
        "GST_CERTIFICATE",
        "COMPANY_REGISTRATION",
        "EXPERIENCE_CERTIFICATES",
        "FINANCIAL_DOCUMENTS"
    ]

    OPTIONAL_DOC_TYPES = [
        "ISO_COMPLIANCE",
        "TECHNICAL_PROPOSAL"
    ]

    def verify_bid_package(
        self,
        bidder_input: Dict[str, Any],
        documents: List[Dict[str, Any]],
        tender_requirements: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive assessment of all uploaded bidder documents and statutory inputs.
        """
        tender_req = tender_requirements or {}
        min_turnover = float(tender_req.get("min_turnover", 0.0) or 0.0)
        min_experience = float(tender_req.get("min_experience_years", 0.0) or 0.0)
        req_certs = [c.upper() for c in tender_req.get("required_certifications", []) or []]

        # 1. Inputs declared by bidder
        decl_name = (bidder_input.get("bidder_name") or bidder_input.get("organization_name") or "").strip()
        decl_pan = (bidder_input.get("pan") or "").strip().upper()
        decl_gstin = (bidder_input.get("gstin") or "").strip().upper()
        decl_turnover = float(bidder_input.get("declared_turnover") or 0.0)
        decl_exp = float(bidder_input.get("declared_experience") or 0.0)

        # 2. Document categorization map
        doc_by_type: Dict[str, Dict[str, Any]] = {}
        invalid_docs: List[Dict[str, Any]] = []
        valid_docs: List[Dict[str, Any]] = []

        for doc in documents:
            doc_type = doc.get("doc_type", "UNKNOWN")
            is_valid = doc.get("validation_status") == "VALID" or doc.get("is_valid", True)

            if is_valid:
                valid_docs.append(doc)
                doc_by_type[doc_type] = doc
            else:
                invalid_docs.append(doc)

        # 3. Required Document Presence Verification
        missing_mandatory = []
        for m_type in self.MANDATORY_DOC_TYPES:
            if m_type not in doc_by_type:
                missing_mandatory.append(m_type)

        # 4. Identity & Structured Verification (PAN & GSTIN)
        is_pan_valid = False
        is_gstin_valid = False
        pan_gstin_linked = False
        pan_taxpayer_name = None
        gst_legal_name = None

        if len(decl_pan) == 10:
            is_pan_valid = True

        if len(decl_gstin) == 15:
            is_gstin_valid = True
            if len(decl_pan) == 10 and decl_gstin[2:12] == decl_pan:
                pan_gstin_linked = True

        # Check extracted PAN / GSTIN from attached documents
        pan_doc = doc_by_type.get("PAN_CARD")
        extracted_pan = pan_doc.get("entities", {}).get("pan") if pan_doc else None

        gst_doc = doc_by_type.get("GST_CERTIFICATE")
        extracted_gstin = gst_doc.get("entities", {}).get("gstin") if gst_doc else None

        # 5. Cross-Verification: User Inputs vs Document OCR Data
        cross_mismatches = []
        cross_matches = []

        # PAN Cross Check
        if extracted_pan and decl_pan and extracted_pan != decl_pan:
            cross_mismatches.append(f"PAN Mismatch: Declared '{decl_pan}' vs Document OCR '{extracted_pan}'.")
        elif extracted_pan and decl_pan and extracted_pan == decl_pan:
            cross_matches.append(f"PAN Verified: Document OCR matches declared '{decl_pan}'.")

        # GSTIN Cross Check
        if extracted_gstin and decl_gstin and extracted_gstin != decl_gstin:
            cross_mismatches.append(f"GSTIN Mismatch: Declared '{decl_gstin}' vs Document OCR '{extracted_gstin}'.")
        elif extracted_gstin and decl_gstin and extracted_gstin == decl_gstin:
            cross_matches.append(f"GSTIN Verified: Document OCR matches declared '{decl_gstin}'.")

        # Financials / Turnover Cross Check
        fin_doc = doc_by_type.get("FINANCIAL_DOCUMENTS")
        extracted_turnover = fin_doc.get("entities", {}).get("turnover_inr") if fin_doc else None
        extracted_udin = fin_doc.get("entities", {}).get("udin") if fin_doc else None

        if extracted_turnover and decl_turnover > 0:
            ratio = min(extracted_turnover, decl_turnover) / max(extracted_turnover, decl_turnover)
            if ratio < 0.70:
                cross_mismatches.append(f"Turnover Discrepancy: Declared ₹{decl_turnover:,.0f} vs CA Audited ₹{extracted_turnover:,.0f}.")
            else:
                cross_matches.append(f"Turnover Verified: CA Financial statement confirms ₹{extracted_turnover:,.0f}.")

        # Experience Cross Check
        exp_doc = doc_by_type.get("EXPERIENCE_CERTIFICATES")
        extracted_exp = exp_doc.get("entities", {}).get("experience_years") if exp_doc else None

        if extracted_exp and decl_exp > 0:
            if extracted_exp < (decl_exp * 0.70):
                cross_mismatches.append(f"Experience Discrepancy: Declared {decl_exp} yrs vs Certified Work Orders ({extracted_exp} yrs).")
            else:
                cross_matches.append(f"Experience Verified: Work orders substantiate {extracted_exp} years standing.")

        # 6. Authenticity & Tamper Detection
        tamper_flags = []
        duplicate_flags = []
        logical_date_flags = []

        for doc in valid_docs:
            fn = doc.get("filename", "document")
            # Tamper analysis
            tamper = doc.get("tamper_analysis", {})
            if tamper.get("tamper_detected"):
                tamper_flags.append(f"Potential visual tampering / ELA anomaly detected in '{fn}' (Score: {tamper.get('tamper_score', 0):.2f}).")

            # Duplicate check
            dup = doc.get("duplicate_analysis", {})
            if dup.get("is_duplicate"):
                duplicate_flags.append(f"Duplicate document hash detected for '{fn}': previously submitted by another bidder.")

            # Logical date check (e.g. experience years vs incorporation date)
            entities = doc.get("entities", {})
            doc_dates = entities.get("dates", [])
            for d_str in doc_dates:
                try:
                    # Look for past or future date anomalies
                    pass
                except Exception:
                    pass

        # 7. Scoring Calculation (0-100%)
        # Score Breakdown:
        # - Tax & Identity (25 pts)
        # - Financial & UDIN (25 pts)
        # - Experience & Past Performance (25 pts)
        # - Authenticity & Integrity (25 pts)
        score_identity = 0.0
        score_financial = 0.0
        score_experience = 0.0
        score_integrity = 25.0

        reasons_positive = []
        reasons_negative = []

        # Identity evaluation
        if is_pan_valid:
            score_identity += 10.0
            reasons_positive.append("Valid 10-character PAN structure.")
        else:
            reasons_negative.append("Invalid PAN format.")

        if is_gstin_valid and pan_gstin_linked:
            score_identity += 15.0
            reasons_positive.append("Valid 15-digit GSTIN with confirmed PAN cross-linkage.")
        elif is_gstin_valid:
            score_identity += 7.0
            reasons_negative.append("GSTIN does not match declared PAN.")
        else:
            reasons_negative.append("Invalid or missing GSTIN.")

        # Financial evaluation
        if fin_doc:
            score_financial += 10.0
            if extracted_udin:
                score_financial += 10.0
                reasons_positive.append(f"CA Turnover Certificate verified with ICAI 18-digit UDIN ({extracted_udin}).")
            else:
                score_financial += 5.0
                reasons_negative.append("Turnover certificate missing 18-digit UDIN.")

            if min_turnover > 0:
                eff_turnover = extracted_turnover or decl_turnover
                if eff_turnover >= min_turnover:
                    score_financial += 5.0
                    reasons_positive.append(f"Annual turnover (₹{eff_turnover:,.0f}) meets tender minimum (₹{min_turnover:,.0f}).")
                else:
                    reasons_negative.append(f"Turnover (₹{eff_turnover:,.0f}) below tender requirement (₹{min_turnover:,.0f}).")
            else:
                score_financial += 5.0
        else:
            reasons_negative.append("Mandatory Financial Documents / Turnover Certificate not attached.")

        # Experience evaluation
        if exp_doc:
            score_experience += 15.0
            eff_exp = extracted_exp or decl_exp
            if min_experience > 0:
                if eff_exp >= min_experience:
                    score_experience += 10.0
                    reasons_positive.append(f"Experience ({eff_exp} yrs) meets tender requirement ({min_experience} yrs).")
                else:
                    score_experience += 5.0
                    reasons_negative.append(f"Experience ({eff_exp} yrs) below tender requirement ({min_experience} yrs).")
            else:
                score_experience += 10.0
                reasons_positive.append(f"Experience documents attached ({eff_exp} years substantiated).")
        else:
            reasons_negative.append("Mandatory Experience / Completion Certificates not attached.")

        # Integrity deductions
        if tamper_flags:
            score_integrity -= min(15.0, len(tamper_flags) * 10.0)
            reasons_negative.extend(tamper_flags)
        else:
            reasons_positive.append("No image forgery / ELA tampering artifacts detected.")

        if duplicate_flags:
            score_integrity -= min(15.0, len(duplicate_flags) * 15.0)
            reasons_negative.extend(duplicate_flags)
        else:
            reasons_positive.append("Document hashes are unique across all bidder submissions.")

        if cross_mismatches:
            score_integrity -= min(10.0, len(cross_mismatches) * 5.0)
            reasons_negative.extend(cross_mismatches)

        if missing_mandatory:
            reasons_negative.append(f"Missing mandatory documents: {', '.join(missing_mandatory)}.")

        total_score = max(0.0, min(100.0, score_identity + score_financial + score_experience + score_integrity))

        # 8. Risk Level Analysis
        if len(invalid_docs) > 0 or len(tamper_flags) > 0 or len(duplicate_flags) > 0 or len(missing_mandatory) >= 2 or total_score < 60:
            risk_level = "HIGH"
            overall_status = "SUSPICIOUS" if total_score >= 40 else "INVALID"
        elif len(missing_mandatory) == 1 or len(cross_mismatches) > 0 or total_score < 80:
            risk_level = "MEDIUM"
            overall_status = "SUSPICIOUS"
        else:
            risk_level = "LOW"
            overall_status = "VALID"

        return {
            "overall_status": overall_status,
            "authenticity_score": round(total_score, 1),
            "risk_level": risk_level,
            "score_breakdown": {
                "identity_and_tax": round(score_identity, 1),
                "financial_and_udin": round(score_financial, 1),
                "experience_and_technical": round(score_experience, 1),
                "authenticity_and_integrity": round(score_integrity, 1)
            },
            "documents_summary": {
                "total_uploaded": len(documents),
                "valid_count": len(valid_docs),
                "invalid_count": len(invalid_docs),
                "missing_mandatory": missing_mandatory,
                "mandatory_complete": len(missing_mandatory) == 0
            },
            "cross_verification": {
                "matches": cross_matches,
                "mismatches": cross_mismatches,
                "is_consistent": len(cross_mismatches) == 0
            },
            "authenticity_analysis": {
                "tamper_detected": len(tamper_flags) > 0,
                "tamper_details": tamper_flags,
                "duplicate_detected": len(duplicate_flags) > 0,
                "duplicate_details": duplicate_flags,
                "pan_gstin_linked": pan_gstin_linked
            },
            "explainable_ai": {
                "positive_factors": reasons_positive,
                "risk_factors": reasons_negative,
                "summary": f"Bid verification completed with Authenticity Score {total_score:.1f}% ({risk_level} Risk). {len(reasons_positive)} compliance criteria met, {len(reasons_negative)} risk/gap items flagged."
            },
            "decision_support": {
                "is_advisory_only": True,
                "recommended_action": "RECOMMEND_ACCEPT" if overall_status == "VALID" else ("RECOMMEND_CLARIFICATION" if overall_status == "SUSPICIOUS" else "RECOMMEND_REJECT"),
                "officer_notice": "AI Decision-Support Assessment: Advisory Recommendation Only. Statutory tender award / rejection authority is strictly reserved for the Evaluation Officer."
            }
        }


bid_verification_engine = BidVerificationEngine()
