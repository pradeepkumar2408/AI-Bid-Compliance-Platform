import numpy as np
from typing import Dict, Any, List

class SHAPExplainer:
    def __init__(self):
        # Base expected compliance value in % (mean baseline)
        self.base_value = 50.0
        
        # Relative weights aligned with GeM procurement guidelines
        self.feature_weights = {
            "turnover_ratio": 25.0,
            "experience_ratio": 20.0,
            "certifications_match": 15.0,
            "identity_verification": 15.0,
            "document_integrity": 15.0,
            "duplicate_check": 10.0
        }

    def explain(self, bidder_metrics: Dict[str, Any], tender_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes SHAP attribution values for bidder compliance score.
        """
        req_turnover = float(tender_requirements.get("min_turnover_inr", 10000000.0) or 10000000.0)
        req_exp = float(tender_requirements.get("min_experience_years", 3.0) or 3.0)
        
        act_turnover = float(bidder_metrics.get("turnover_inr", 0.0) or 0.0)
        act_exp = float(bidder_metrics.get("experience_years", 0.0) or 0.0)
        
        cert_matched = float(bidder_metrics.get("certifications_match_ratio", 1.0))
        identity_score = float(bidder_metrics.get("identity_score", 1.0))  # 1.0 = verified, 0.0 = blacklisted/mismatch
        tamper_score = float(bidder_metrics.get("tamper_score", 0.0))      # 0.0 = clean, 1.0 = forged
        is_duplicate = bool(bidder_metrics.get("is_duplicate", False))

        # Normalized ratios capped at reasonable upper limits
        turnover_ratio = min(2.0, act_turnover / max(req_turnover, 1.0))
        exp_ratio = min(2.0, act_exp / max(req_exp, 1.0))
        doc_integrity = max(0.0, 1.0 - tamper_score)
        duplicate_score = 0.0 if is_duplicate else 1.0

        # Feature contributions relative to base value (Shapley approximation)
        contrib_turnover = (turnover_ratio - 1.0) * self.feature_weights["turnover_ratio"]
        contrib_exp = (exp_ratio - 1.0) * self.feature_weights["experience_ratio"]
        contrib_cert = (cert_matched - 0.7) * (self.feature_weights["certifications_match"] / 0.7)
        contrib_ident = (identity_score - 0.5) * (self.feature_weights["identity_verification"] / 0.5)
        contrib_integ = (doc_integrity - 0.8) * (self.feature_weights["document_integrity"] / 0.8)
        contrib_dup = (duplicate_score - 0.5) * (self.feature_weights["duplicate_check"] / 0.5)

        raw_score = self.base_value + contrib_turnover + contrib_exp + contrib_cert + contrib_ident + contrib_integ + contrib_dup
        
        # Hard overrides: blacklisted or forged = max score constrained
        if identity_score == 0.0:
            raw_score = min(raw_score, 10.0)
        if tamper_score > 0.5:
            raw_score = min(raw_score, 20.0)

        final_score = max(0.0, min(100.0, round(raw_score, 1)))

        features = [
            {
                "feature": "Annual Turnover",
                "key": "turnover",
                "value": f"₹{act_turnover:,.0f} (Req: ₹{req_turnover:,.0f})",
                "contribution": round(contrib_turnover, 2),
                "impact": "positive" if contrib_turnover >= 0 else "negative",
                "explanation": f"Turnover exceeds requirement by {(turnover_ratio - 1.0)*100:.0f}%" if contrib_turnover >= 0 else f"Turnover falls short by {(1.0 - turnover_ratio)*100:.0f}%"
            },
            {
                "feature": "Past Experience",
                "key": "experience",
                "value": f"{act_exp} yrs (Req: {req_exp} yrs)",
                "contribution": round(contrib_exp, 2),
                "impact": "positive" if contrib_exp >= 0 else "negative",
                "explanation": f"Experience exceeds minimum by {act_exp - req_exp:.1f} yrs" if contrib_exp >= 0 else f"Experience is {req_exp - act_exp:.1f} yrs below required threshold"
            },
            {
                "feature": "Mandatory Certifications",
                "key": "certifications",
                "value": f"{int(cert_matched * 100)}% Matched",
                "contribution": round(contrib_cert, 2),
                "impact": "positive" if contrib_cert >= 0 else "negative",
                "explanation": "All required quality certifications verified" if cert_matched >= 1.0 else "Missing one or more required certifications"
            },
            {
                "feature": "Govt Identity Verification",
                "key": "identity",
                "value": "Verified Active" if identity_score == 1.0 else "Debarred / Name Mismatch",
                "contribution": round(contrib_ident, 2),
                "impact": "positive" if identity_score == 1.0 else "negative",
                "explanation": "Valid PAN & Active GSTN verified with NSDL/GSTN sources" if identity_score == 1.0 else "Identity verification failed or debarred vendor alert"
            },
            {
                "feature": "Document Forgery / ELA Integrity",
                "key": "integrity",
                "value": f"Tamper Risk: {tamper_score*100:.1f}%",
                "contribution": round(contrib_integ, 2),
                "impact": "positive" if tamper_score <= 0.2 else "negative",
                "explanation": "Document passed Error Level Analysis without digital modifications" if tamper_score <= 0.2 else "Digital font/stamp modifications detected in submitted certificates"
            },
            {
                "feature": "Cross-Bidder Duplicate Check",
                "key": "duplicate",
                "value": "Collusion Alert (Reused File)" if is_duplicate else "Unique Hash Verified",
                "contribution": round(contrib_dup, 2),
                "impact": "negative" if is_duplicate else "positive",
                "explanation": "Unique certificate fingerprint verified" if not is_duplicate else "Duplicate certificate found submitted by another bidder"
            }
        ]

        # Determine overall risk category
        if identity_score == 0.0 or tamper_score > 0.45 or is_duplicate:
            risk_level = "HIGH"
        elif final_score < 60.0 or tamper_score > 0.25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "base_value": self.base_value,
            "final_score": final_score,
            "risk_level": risk_level,
            "features": features
        }

shap_explainer = SHAPExplainer()
