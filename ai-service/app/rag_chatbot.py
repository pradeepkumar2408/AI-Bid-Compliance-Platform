import re
import json
import logging
import requests
from typing import Dict, Any, List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger("ai_service.rag_chatbot")

import time

def call_groq_llm(messages: List[Dict[str, str]]) -> Optional[str]:
    """Invokes the Groq LPU Cloud API with retrieved RAG context, retry, and fallback models."""
    if not GROQ_API_KEY:
        return None
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    candidate_models = [GROQ_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    models_to_try = list(dict.fromkeys(m for m in candidate_models if m))

    for model in models_to_try:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.6,
            "max_tokens": 1024
        }
        for attempt in range(2):
            try:
                res = requests.post(url, headers=headers, json=payload, timeout=12)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                elif res.status_code in (400, 404):
                    # Model unsupported or bad parameter, move to next model
                    break
                else:
                    logger.warning(f"[Groq LLM] HTTP {res.status_code} for model {model}: {res.text}")
            except Exception as e:
                logger.warning(f"[Groq LLM] Attempt {attempt+1} on model {model} failed: {e}")
                time.sleep(0.3)
    return None

# 1. Comprehensive GeM & Procurement Knowledge Base Chunks
KNOWLEDGE_CORPUS = [
    {
        "id": "GREETING",
        "category": "GREETING",
        "keywords": "hi hello hey greetings namaste good morning good evening howdy sup",
        "title": "Conversational Greeting",
        "content": "Friendly greetings and interaction with bidders, welcoming them by legal entity name or username and offering immediate procurement help."
    },
    {
        "id": "TENDER_STEPS",
        "category": "APPLICATION_GUIDELINES",
        "keywords": "steps apply tender procedure how to bid application process requirements instructions submission",
        "title": "7-Step Official GeM Tender Application Guide",
        "content": """Official 7-Step GeM Tender Application Procedure:
Step 1: Statutory Identity & Tax Verification (PAN and GSTIN active on NSDL & GSTN registries).
Step 2: Review Tender Eligibility Matrix (check minimum turnover, experience years, and mandatory ISO/CMMI certifications).
Step 3: Authentic Financial Document Preparation (original unedited CA Audited Turnover Certificate with active 18-digit UDIN).
Step 4: Client Experience Proof & Quality Certifications (work orders and ISO certificates; never reuse third-party certificates).
Step 5: Structured Bid Submission (input declared turnover and experience matching attached documents).
Step 6: Automated AI Compliance Verification (Tesseract OCR, NLP entity repair, Drools rule compliance, and SHAP explainability scoring).
Step 7: Monitoring & Grievance Appeals (track bid status on cockpit; submit clarification appeals before final officer locking)."""
    },
    {
        "id": "TEN_STATUTORY_CERTIFICATES",
        "category": "REQUIRED_CERTIFICATES",
        "keywords": "certificates documents upload separate required dsc pan gst constitution udyam msme financial ca experience emd declarations bank cheque",
        "title": "10 Statutory Procurement Certificates for GeM Bidding",
        "content": """The 10 Mandatory & Statutory Certificates Required for GeM / CPPP Bidding (Uploaded Separately):
1. Digital Signature Certificate (DSC) – Class 3 (Signing + Encryption): Required for secure bid encryption and digital submission on CPPP / GeM.
2. Business PAN Card: Entity PAN (NSDL/UTIITSL) matching registration name for tax identity and financial evaluation.
3. GST Registration Certificate (GSTIN): Form GST REG-06 showing principal place of business and active status.
4. Business Constitution Certificate: MCA Certificate of Incorporation, MOA/AOA, LLP Agreement, or Shop & Establishment License proving legal status.
5. Udyam MSME Certificate: Ministry of MSME certificate. Mandatory if claiming EMD exemption or 25% MSE price preference.
6. CA-Certified Financial Statements: 3-year audited Balance Sheet, P&L, and Turnover Certificate with mandatory 18-digit UDIN.
7. Experience & Performance Certificates: Work orders, supply contracts, and client satisfactory completion/performance certificates.
8. Bid Security / EMD Documents: Bank Guarantee (BG), EMD payment receipt, or Bid Security Declaration for MSMEs under GFR Rule 170.
9. Declarations & Compliance Undertakings: Notarized affidavit on correctness, Non-Collusion & No-Blacklisting certificate, Integrity Pact, Make-in-India local content, and OEM Authorization Form (MAF).
10. Bank & Payment Documents: Cancelled cheque with printed company name, bank-certified EFT mandate, and authorized signatory identity proof (Aadhaar/signatory authorization)."""
    },
    {
        "id": "CA_CERTIFICATE_RULES",
        "category": "DOCUMENT_RULES",
        "keywords": "ca chartered accountant turnover certificate udin format resolution dpi uncompressed",
        "title": "CA Turnover Certificate & UDIN Standards",
        "content": """CA Audited Turnover Certificate Standards:
1. Every CA turnover certificate must contain a verifiable 18-digit Unique Document Identification Number (UDIN) issued by ICAI.
2. High-contrast original scan or clean digital PDF (minimum 300 DPI) must be uploaded.
3. Zero digital editing: Never alter digits, dates, or stamps using editing software. Error Level Analysis (ELA) detects compression anomalies.
4. Consistency: Declared turnover in the bid application must strictly match the financial figures in the certified CA statement."""
    },
    {
        "id": "ELA_FRAUD_DETECTION",
        "category": "FRAUD_DETECTION",
        "keywords": "ela error level analysis fraud tamper forgery altered fake text compression artifacts",
        "title": "Error Level Analysis (ELA) Forgery Detection",
        "content": """Error Level Analysis (ELA) Forgery Detection:
ELA re-saves uploaded certificate images at a known 95% JPEG compression rate and calculates the absolute difference between original and resaved pixels.
Digitally modified, spliced, or pasted text displays significantly higher error variance and appears bright in the ELA heatmap overlay, automatically flagging the bid with a High Risk score."""
    },
    {
        "id": "COLLUSION_DUPLICATE_HASH",
        "category": "COLLUSION_DETECTION",
        "keywords": "collusion duplicate hash dhash sha256 perceptual hash multiple bidders same document",
        "title": "Cross-Bidder Collusion & Duplicate Document Hashing",
        "content": """Cross-Bidder Duplicate Detection:
The platform computes a 64-bit difference hash (dHash) and SHA-256 cryptographic digest for every uploaded document.
If two distinct bidders upload identical certificates or certificates with Hamming distance <= 5, the system flags Cross-Bidder Collusion under GFR Rule 151."""
    },
    {
        "id": "GFR_RULE_151_DEBARMENT",
        "category": "STATUTORY_RULES",
        "keywords": "debarment blacklisted gfr rule 151 cvc gem banned vendor central registry",
        "title": "Statutory Debarment under GFR Rule 151",
        "content": """Debarment under GFR Rule 151:
Bidders convicted of tender rigging, submitting forged certificates, or violating public procurement ethics are listed in the CVC / GeM Central Debarred Registry.
The platform cross-checks bidder PAN and GSTIN against this blacklist during identity verification, immediately disqualifying debarred entities."""
    },
    {
        "id": "GRIEVANCE_APPEALS",
        "category": "APPEAL_PROCESS",
        "keywords": "appeal grievance rejection clarification grounds officer review dispute",
        "title": "Bidder Grievance & Clarification Procedure",
        "content": """Bidder Grievance & Clarification Workflow:
1. Pre-Award Window: If an AI compliance flag or preliminary rejection is recorded, bidders have a defined grievance window to submit clarifications.
2. Written Grounds: Bidders can click 'Submit Grievance / Appeal' on the Bidder Dashboard, providing detailed justifications and reference to documents.
3. Officer Adjudication: The Evaluation Officer must review the appeal and record a written justification before final tender award locking."""
    }
]

# 2. Reference Tenders Archive for RAG Retrieval & Document Conversion
ARCHIVED_TENDERS = [
    {
        "id": 1,
        "tenderNumber": "GEM/2026/B/99201",
        "title": "Supply & Integration of National Cloud Computing Infrastructure",
        "department": "Ministry of Electronics & IT (MeitY)",
        "category": "Cloud Infrastructure & IT Services",
        "estimatedValue": 50000000.00,
        "minTurnover": 20000000.00,
        "minExperienceYears": 5.0,
        "requiredCerts": ["ISO-9001", "ISO-27001"],
        "submissionDeadline": "2026-10-15 17:00",
        "status": "ACTIVE",
        "scope": "Establishment of multi-region high-availability private cloud nodes, sovereign data containment, and automated failover orchestration.",
        "emdAmount": "₹ 10,00,000 (Exempted for MSE/Startups)"
    },
    {
        "id": 2,
        "tenderNumber": "GEM/2025/B/88104",
        "title": "Design, Supply and Deployment of AI-Powered CCTV Video Analytics",
        "department": "Ministry of Railways (RailTel)",
        "category": "Surveillance & Security Systems",
        "estimatedValue": 35000000.00,
        "minTurnover": 15000000.00,
        "minExperienceYears": 3.0,
        "requiredCerts": ["ISO-9001", "CMMI-Level-3/5"],
        "submissionDeadline": "2025-11-30 15:00",
        "status": "CLOSED",
        "scope": "Deployment of 1,200 edge AI IP cameras with automated intrusion detection, crowd density heatmap analysis, and centralized VMS integration.",
        "emdAmount": "₹ 7,00,000"
    },
    {
        "id": 3,
        "tenderNumber": "GEM/2024/B/77022",
        "title": "Procurement of High-Performance Enterprise Rack Servers and SAN Storage",
        "department": "Ministry of Defence (DRDO)",
        "category": "Computer Hardware & Storage",
        "estimatedValue": 80000000.00,
        "minTurnover": 40000000.00,
        "minExperienceYears": 7.0,
        "requiredCerts": ["ISO-9001", "ISO-27001", "ISO-14001"],
        "submissionDeadline": "2024-08-20 18:00",
        "status": "CLOSED",
        "scope": "Turnkey delivery of 48-node clustered enterprise servers, NVMe-oF all-flash SAN array, redundant 100GbE switching fabric, and 5-year 24x7 mission-critical OEM warranty.",
        "emdAmount": "₹ 16,00,000"
    },
    {
        "id": 4,
        "tenderNumber": "GEM/2024/B/66190",
        "title": "Solar Photovoltaic Rooftop Power Grid Installation (500 kWp)",
        "department": "Ministry of New & Renewable Energy (MNRE)",
        "category": "Renewable Energy Equipment",
        "estimatedValue": 24000000.00,
        "minTurnover": 10000000.00,
        "minExperienceYears": 4.0,
        "requiredCerts": ["ISO-9001", "ISO-14001", "IEC-61215"],
        "submissionDeadline": "2024-04-10 16:00",
        "status": "CLOSED",
        "scope": "Design, supply, installation, testing, and commissioning of grid-interactive rooftop solar PV plants across government administrative buildings.",
        "emdAmount": "₹ 4,80,000"
    }
]


class RAGChatbotEngine:
    def __init__(self):
        self.corpus = KNOWLEDGE_CORPUS
        self.tenders_archive = ARCHIVED_TENDERS
        self._build_vector_index()

    def _build_vector_index(self):
        """Constructs TF-IDF vector matrix over knowledge corpus and tender documents."""
        self.doc_texts = []
        self.doc_meta = []

        # 1. Index Knowledge base chunks
        for item in self.corpus:
            combined = f"{item['title']} {item['keywords']} {item['content']}"
            self.doc_texts.append(combined)
            self.doc_meta.append({"type": "KNOWLEDGE", "data": item})

        # 2. Index Tender Documents
        for t in self.tenders_archive:
            certs_str = " ".join(t.get("requiredCerts", []))
            tender_text = (
                f"Tender {t['tenderNumber']} {t['title']} {t['department']} "
                f"{t['category']} Budget {t['estimatedValue']} Turnover {t['minTurnover']} "
                f"Experience {t['minExperienceYears']} Certifications {certs_str} "
                f"Status {t['status']} Scope {t.get('scope', '')}"
            )
            self.doc_texts.append(tender_text)
            self.doc_meta.append({"type": "TENDER", "data": t})

        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english", sublinear_tf=True)
        self.tfidf_matrix = self.vectorizer.fit_transform(self.doc_texts)

    def retrieve(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Retrieves the top-k most semantically relevant documents using cosine similarity."""
        query_vec = self.vectorizer.transform([query])
        sims = cosine_similarity(query_vec, self.tfidf_matrix)[0]
        top_indices = np.argsort(sims)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(sims[idx])
            if score > 0.05:
                results.append({
                    "score": score,
                    "type": self.doc_meta[idx]["type"],
                    "item": self.doc_meta[idx]["data"]
                })
        return results

    def query(self, query_text: str, user_info: Optional[Dict[str, Any]] = None, active_tenders: Optional[List[Dict[str, Any]]] = None, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Processes user query via RAG retrieval and generates structured, conversational response.
        """
        raw_query = query_text.strip()
        q_lower = raw_query.lower()

        # Extract user display name
        display_name = "Valued Bidder"
        if user_info:
            display_name = user_info.get("organizationName") or user_info.get("username") or "Valued Bidder"

        # 1. GREETING INTENT CHECK
        greeting_patterns = [
            r"^(hi|hello|hey|namaste|greetings|hola|good\s+morning|good\s+afternoon|good\s+evening)\b",
            r"\b(who\s+are\s+you|what\s+can\s+you\s+do)\b"
        ]
        is_greeting = any(re.search(pat, q_lower) for pat in greeting_patterns)

        # Retrieve top documents
        retrieved = self.retrieve(q_lower, top_k=5)

        # 2. TENDER SEARCH INTENT
        # Check if user mentioned tender codes, keywords, or search phrases
        is_search = (
            "tender" in q_lower or "search" in q_lower or "previous" in q_lower or 
            "past" in q_lower or "closed" in q_lower or "gem" in q_lower or 
            "cloud" in q_lower or "cctv" in q_lower or "server" in q_lower or 
            "solar" in q_lower or "railway" in q_lower or "defence" in q_lower or
            re.search(r"gem/\d{4}/b/\d+", q_lower) is not None
        )

        # Collect matching tenders from live + archive
        all_avail_tenders = list(self.tenders_archive)
        if active_tenders:
            for at in active_tenders:
                if not any(t["tenderNumber"] == at.get("tenderNumber") for t in all_avail_tenders):
                    all_avail_tenders.insert(0, at)

        matched_tenders = []
        for t in all_avail_tenders:
            t_num = t.get("tenderNumber", "").lower()
            t_title = t.get("title", "").lower()
            t_dept = t.get("department", "").lower()

            if (
                t_num in q_lower or 
                any(w in t_title for w in q_lower.split() if len(w) > 3) or
                any(w in t_dept for w in q_lower.split() if len(w) > 3) or
                ("2024" in q_lower and "2024" in t_num) or
                ("2025" in q_lower and "2025" in t_num) or
                ("2026" in q_lower and "2026" in t_num) or
                (("previous" in q_lower or "past" in q_lower or "closed" in q_lower or "all" in q_lower) and t.get("status") == "CLOSED")
            ):
                matched_tenders.append(t)

        # 2b. Execute Groq Cloud LLM with Retrieved RAG Context & Full Conversational Persona
        if GROQ_API_KEY:
            context_blocks = []
            for r in retrieved:
                it = r["item"]
                if r["type"] == "KNOWLEDGE":
                    context_blocks.append(f"[{it.get('title')}]: {it.get('content')}")
                elif r["type"] == "TENDER":
                    context_blocks.append(
                        f"[Tender {it.get('tenderNumber')} - {it.get('title')}]: "
                        f"Department: {it.get('department')}, Category: {it.get('category')}, "
                        f"Budget: INR {it.get('estimatedValue')}, Min Turnover: INR {it.get('minTurnover')}, "
                        f"Min Experience: {it.get('minExperienceYears')} yrs, Certifications: {it.get('requiredCerts')}, Status: {it.get('status')}"
                    )
            for mt in matched_tenders:
                context_blocks.append(
                    f"[Matched Tender {mt.get('tenderNumber')} - {mt.get('title')}]: "
                    f"Department: {mt.get('department')}, Budget: INR {mt.get('estimatedValue')}, "
                    f"Min Turnover: INR {mt.get('minTurnover')}, Experience: {mt.get('minExperienceYears')} yrs, "
                    f"Certs: {mt.get('requiredCerts')}, Status: {mt.get('status')}"
                )

            rag_context_str = "\n\n".join(context_blocks[:6])
            user_role = user_info.get("role", "ROLE_BIDDER") if user_info else "ROLE_BIDDER"

            system_prompt = (
                f"You are 'GeM Sahayak', the official AI Procurement and Compliance Assistant for the Government e-Marketplace (GeM) platform.\n"
                f"You are having an interactive live conversation with the bidder: '{display_name}' (Role: {user_role}).\n\n"
                f"Tone & Personality Guidelines:\n"
                f"- Warm, engaging, witty, polite, and natural. Speak like a smart, helpful human assistant.\n"
                f"- Casual Small Talk: If the user asks casual or personal questions (e.g. 'did you ate?', 'have you eaten?', 'how are you?', 'tell me a joke', 'who made you?'):\n"
                f"  * Respond playfully and warmly. For questions like 'did you ate?', explain that as an AI on cloud servers you feast on data, bytes, and electricity ⚡, ask if they had their meal, and smoothly ask how you can help them bid or succeed today.\n"
                f"- Address the bidder naturally as '{display_name}'.\n"
                f"- For procurement questions, synthesize accurate answers using this verified RAG knowledge context:\n\n"
                f"--- RETRIEVED RAG CONTEXT ---\n"
                f"{rag_context_str}\n"
                f"--- END CONTEXT ---\n\n"
                f"Core Procurement Directives:\n"
                f"1. Tender Steps: 7 steps (statutory PAN/GSTIN KYC, eligibility thresholds, CA audited turnover certificate with 18-digit UDIN, work orders, automated AI evaluation, appeal windows).\n"
                f"2. Previous / Matched Tenders: Summarize matching tenders and mention clicking the 'Download Official Tender PDF' button on the card below.\n"
                f"3. CA Turnover Certificates: Emphasize the mandatory 18-digit UDIN issued by ICAI and uncompressed scan rules.\n"
                f"4. Fraud & Tamper Detection: Explain Error Level Analysis (ELA) for compression anomalies and 64-bit dHash duplicate hashing under GFR Rule 151.\n"
                f"5. Formatting: Always separate distinct steps, points, and sentences onto their own new lines. Use double newlines (\\n\\n) between paragraphs so every idea and step appears on its own clearly separated line.\n"
                f"6. Tables & Lists: If presenting tables or numbered lists, put every single row and item on its own new line with standard markdown."
            )

            groq_messages = [{"role": "system", "content": system_prompt}]
            if history and isinstance(history, list):
                for h in history[-6:]:
                    r = "assistant" if h.get("sender") in ("bot", "assistant") else "user"
                    t = h.get("text") or h.get("content") or ""
                    if t:
                        groq_messages.append({"role": r, "content": t})
            groq_messages.append({"role": "user", "content": raw_query})

            groq_reply = call_groq_llm(groq_messages)
            if groq_reply:
                intent = "TENDER_SEARCH" if (is_search and matched_tenders) else ("GREETING" if is_greeting else "RAG_QA")
                sugs = [
                    "📌 Steps to apply for a tender",
                    "🔍 Search previous tenders",
                    "📄 CA Turnover certificate rules",
                    "🛡️ How does ELA fraud detection work?"
                ]
                if is_greeting:
                    sugs.append("⚖️ How to submit an appeal / clarification")

                return {
                    "intent": intent,
                    "response_text": groq_reply,
                    "details": "",
                    "tender_list": matched_tenders if (is_search or len(matched_tenders) > 0) else None,
                    "suggestions": sugs,
                    "retrieved_context": [r["item"].get("title") for r in retrieved],
                    "llm_model": "Groq (openai/gpt-oss-120b)",
                    "is_groq": True
                }

        # Fallback greeting if Groq is offline
        if is_greeting and len(q_lower.split()) <= 4:
            return {
                "intent": "GREETING",
                "response_text": f"Hello **{display_name}**! 👋 Welcome to **GeM Sahayak**, your AI-Powered Procurement Assistant.",
                "details": "I am here to guide you step-by-step through applying for tenders, clarify CA turnover & UDIN requirements, explain automated fraud detection (ELA & collusion hashing), or retrieve any active/previous tender and **convert it into an official downloadable PDF specification dossier**.",
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "🔍 Search previous tenders",
                    "📄 CA Turnover certificate rules",
                    "🛡️ How does ELA fraud detection work?",
                    "⚖️ How to submit an appeal / clarification"
                ],
                "retrieved_context": []
            }

        if is_search and matched_tenders:
            return {
                "intent": "TENDER_SEARCH",
                "response_text": f"🔍 **Found {len(matched_tenders)} Matching Tender(s) via RAG Retrieval**:",
                "details": f"Hello **{display_name}**, here are the tenders matching your query. Click **'📥 Download Official Tender PDF'** on any card to immediately convert and export the complete specification dossier.",
                "tender_list": matched_tenders,
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "📄 CA Turnover certificate rules",
                    "🛡️ How does ELA fraud detection work?"
                ],
                "retrieved_context": [r["item"].get("title") for r in retrieved if r["type"] == "TENDER"]
            }

        # 3. APPLICATION STEPS INTENT
        if any(w in q_lower for w in ["step", "apply", "procedure", "how to bid", "process", "guide"]):
            step_doc = next((r["item"] for r in retrieved if r["item"].get("id") == "TENDER_STEPS"), None)
            return {
                "intent": "APPLICATION_STEPS",
                "response_text": f"📋 **Official 7-Step Guide to Applying for a GeM Tender (for {display_name})**",
                "steps": [
                    {
                        "step": "1. Statutory Identity & Tax Verification",
                        "desc": "Ensure your PAN and GSTIN are active and match your legal registered entity. The platform runs automated verification against simulated NSDL/ITD and GSTN registries."
                    },
                    {
                        "step": "2. Review Tender Eligibility Matrix",
                        "desc": "Inspect minimum annual turnover, years of commercial experience, and mandatory quality/security certifications (e.g. ISO-9001, ISO-27001, CMMI)."
                    },
                    {
                        "step": "3. Prepare Authentic Financial Documents",
                        "desc": "Upload original CA Audited Turnover Certificates containing an active 18-digit UDIN. Do not digitally edit text or stamps, as Error Level Analysis (ELA) flags image modifications."
                    },
                    {
                        "step": "4. Attach Experience Proof & Certifications",
                        "desc": "Upload client completion certificates and ISO standards. The system runs perceptual hashing (dHash) to prevent cross-bidder certificate reuse."
                    },
                    {
                        "step": "5. Submit Official Bid Application",
                        "desc": "Fill in your declared financial and experience metrics on the Bidder Dashboard, attach document proofs, and click 'Submit Official Bid'."
                    },
                    {
                        "step": "6. Automated AI OCR & Drools Evaluation",
                        "desc": "The AI pipeline executes Tesseract OCR, NLP entity repair, Drools deterministic rule evaluation, and SHAP explainability scoring."
                    },
                    {
                        "step": "7. Track Status & File Grievance Appeals",
                        "desc": "Monitor your bid score on the Bidder Cockpit. If flagged or rejected, submit a clarification appeal before final officer decision locking."
                    }
                ],
                "suggestions": [
                    "🔍 Search previous tenders",
                    "📄 CA Turnover certificate rules",
                    "🛡️ How does ELA fraud detection work?"
                ],
                "retrieved_context": [step_doc.get("title")] if step_doc else []
            }

        # 4. DOCUMENT / CA RULES INTENT
        if any(w in q_lower for w in ["ca", "turnover", "udin", "document", "certificate", "format"]):
            return {
                "intent": "DOCUMENT_RULES",
                "response_text": f"📄 **CA Turnover Certificate & UDIN Standards (RAG Knowledge Base)**",
                "details": f"Requirements to ensure **{display_name}** passes AI verification with a 100% Low-Risk score:",
                "points": [
                    "• **ICAI 18-Digit UDIN**: Every Chartered Accountant turnover certificate must feature an active, verifiable UDIN.",
                    "• **Uncompressed Original Scans**: Use clean, high-contrast PDF or 300+ DPI JPEG scans with zero digital compression shifts.",
                    "• **No Image Tampering**: Spliced signatures or edited turnover numbers are immediately detected by Error Level Analysis (ELA).",
                    "• **Declaration Alignment**: Financial numbers entered in the submission form must strictly match the figures in the attached CA statement."
                ],
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "🛡️ How does ELA fraud detection work?"
                ],
                "retrieved_context": ["CA Turnover Certificate & UDIN Standards"]
            }

        # 5. FRAUD / ELA / COLLUSION INTENT
        if any(w in q_lower for w in ["ela", "fraud", "tamper", "forgery", "collusion", "hash"]):
            return {
                "intent": "FRAUD_DETECTION",
                "response_text": f"🛡️ **Automated Document Forgery & Collusion Detection Explained**",
                "details": "How the platform's multi-tier verification engine protects public procurement integrity:",
                "points": [
                    "• **Error Level Analysis (ELA)**: Resaves document images at 95% JPEG quality and analyzes pixel compression differentials. Digitally altered text or pasted seals exhibit abnormal error variance and trigger High Risk alerts.",
                    "• **Perceptual Duplicate Hashing (dHash)**: Computes a 64-bit structural fingerprint for every certificate. Reusing certificates across different vendors triggers a Cross-Bidder Collusion flag under GFR Rule 151.",
                    "• **Central Debarred Registry**: Bidder PAN is checked against CVC and GeM blacklists for past procurement violations.",
                    "• **Chained Cryptographic Audit Trail**: All detections are signed with SHA-256 hashes in an immutable audit ledger."
                ],
                "suggestions": [
                    "⚖️ How to submit an appeal / clarification",
                    "🔍 Search previous tenders"
                ],
                "retrieved_context": ["Error Level Analysis (ELA) Forgery Detection", "Cross-Bidder Collusion & Duplicate Document Hashing"]
            }

        # 6. APPEALS INTENT
        if any(w in q_lower for w in ["appeal", "grievance", "clarification", "disqualif", "reject"]):
            return {
                "intent": "APPEAL_PROCESS",
                "response_text": f"⚖️ **Bidder Grievance & Appeal Procedure**",
                "details": f"If an evaluation flag is raised on a bid submitted by **{display_name}**:",
                "points": [
                    "• **Pre-Award Window**: Clarification appeals can be submitted before the Evaluation Officer locks the final award decision.",
                    "• **Dashboard Submission**: Find the bid in your Submitted Bids table and click the red 'Submit Appeal' button.",
                    "• **Detailed Grounds**: Upload supplemental evidence, reference verified CA certificates, or clarify company legal name changes.",
                    "• **Officer Review**: The officer reviews the clarification in the Decision Cockpit; overriding any AI flag requires a permanent written justification."
                ],
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "🔍 Search previous tenders"
                ],
                "retrieved_context": ["Bidder Grievance & Clarification Procedure"]
            }

        # 7. INTERACTIVE CASUAL & SMALL TALK INTENTS
        if any(w in q_lower for w in ["ate", "eat", "eating", "food", "lunch", "dinner", "breakfast", "meal", "hungry"]):
            return {
                "intent": "CASUAL_CHAT",
                "response_text": f"Haha, thank you for checking on me, **{display_name}**! 😄",
                "details": "As an AI assistant running on cloud servers, I don't eat real food—I fuel up on procurement guidelines, Drools rules, and clean electricity! ⚡ Did you have your meal? More importantly, how can I assist your bidding or tender compliance today?",
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "🔍 Search previous tenders",
                    "📄 CA Turnover certificate rules",
                    "🛡️ How does ELA fraud detection work?"
                ],
                "retrieved_context": ["GeM Sahayak Interactive Persona"]
            }

        if any(w in q_lower for w in ["how are you", "how r u", "how is it going", "how's it going", "what's up", "wassup", "how do you do"]):
            return {
                "intent": "CASUAL_CHAT",
                "response_text": f"I'm feeling fully charged and ready to assist, **{display_name}**! 🚀",
                "details": "Everything is running smoothly on the GeM Compliance AI Engine. How are things on your side? Are you preparing a new bid or looking for upcoming tender opportunities?",
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "🔍 Search previous tenders",
                    "📄 CA Turnover certificate rules"
                ],
                "retrieved_context": ["GeM Sahayak Interactive Persona"]
            }

        if any(w in q_lower for w in ["thank", "thanks", "thx", "appreciate", "awesome", "great job", "good job"]):
            return {
                "intent": "CASUAL_CHAT",
                "response_text": f"You are very welcome, **{display_name}**! 🌟",
                "details": "I'm always here to help you navigate GeM procurement, review compliance guidelines, and win competitive tenders. Let me know whenever you need anything else!",
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "🔍 Search previous tenders"
                ],
                "retrieved_context": ["GeM Sahayak Interactive Persona"]
            }

        if any(w in q_lower for w in ["joke", "funny", "laugh", "humor"]):
            return {
                "intent": "CASUAL_CHAT",
                "response_text": f"Here's one for you, **{display_name}**! 😄",
                "details": "Why did the vendor bring a ladder to the GeM portal? Because they heard the compliance standards were top-tier! 🪜 But don't worry—with my guidance, reaching those standards is smooth sailing. Need help checking any bid documents today?",
                "suggestions": [
                    "📌 Steps to apply for a tender",
                    "🔍 Search previous tenders",
                    "🛡️ How does ELA fraud detection work?"
                ],
                "retrieved_context": ["GeM Sahayak Interactive Persona"]
            }

        # 8. CONVERSATIONAL RAG RETRIEVAL FALLBACK
        top_chunk = retrieved[0]["item"] if retrieved else None
        context_content = top_chunk.get("content", "") if top_chunk else ""

        return {
            "intent": "CONVERSATIONAL_QA",
            "response_text": f"Hello **{display_name}**! 😊 I'm listening.",
            "details": context_content if context_content else "I'm your interactive GeM AI companion. I can guide you through the 7-step tender application procedure, verify CA turnover & UDIN rules, explain ELA fraud checks, or retrieve previous tenders and convert them into downloadable official specification PDFs!",
            "suggestions": [
                "📌 Steps to apply for a tender",
                "🔍 Search previous tenders",
                "📄 CA Turnover certificate rules",
                "🛡️ How does ELA fraud detection work?"
            ],
            "retrieved_context": [r["item"].get("title") for r in retrieved] if retrieved else ["GeM Procurement Assistant"]
        }


# Singleton instance
rag_chatbot_engine = RAGChatbotEngine()
