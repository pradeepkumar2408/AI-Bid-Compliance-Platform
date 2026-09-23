# AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement
**Problem Statement ID: 26100 | Smart India Hackathon**

An enterprise-grade, end-to-end procurement evaluation and compliance verification platform designed for the Government e-Marketplace (GeM). The platform enforces deterministic compliance verification via an embedded Drools Rule Engine, explainable AI scoring using SHAP (Shapley Additive exPlanations), image/document Error Level Analysis (ELA) for digital forgery/tamper detection, cross-bidder collusion duplicate hashing, government identity validation against NSDL/ITD and GSTN registries, and an immutable SHA-256 chained audit trail with mandatory written justifications for officer overrides.

---

## 🏛️ System Architecture

```
                                  +---------------------------------------+
                                  |         React Frontend (Vite)         |
                                  |  - Officer Cockpit & Decision Support |
                                  |  - Bidder Portal & Grievance Filing   |
                                  |  - Admin Console & Rule Matrix Config |
                                  +-------------------+-------------------+
                                                      | REST API (JWT + RBAC)
                                                      v
                                  +---------------------------------------+
                                  |      Spring Boot 3 Core Backend       |
                                  |  - Embedded Drools 8.x Rule Engine    |
                                  |  - Identity Verifier (PAN / GSTN/ CVC)|
                                  |  - SHA-256 Chained Audit Trail        |
                                  |  - Oracle DB / H2 Compatibility Mode  |
                                  |  - Workflow & Appeal Orchestrator     |
                                  +-------------------+-------------------+
                                                      | Async REST / JSON
                                                      v
                                  +---------------------------------------+
                                  |   Python FastAPI AI/ML Microservice   |
                                  |  - Tesseract OCR / PDF Text Parsing   |
                                  |  - NLP Entity Extractor (Turnover/Exp)|
                                  |  - ELA Forgery & Tamper Detection     |
                                  |  - Cross-Bidder dHash / SHA256 Engine |
                                  |  - SHAP Explainable Scoring Engine    |
                                  +---------------------------------------+
```

---

## ⚡ Key Principles Emphasized

1. **Decision Support, Not Auto-Selection**: The AI calculates compliance scores and feature attributions; only the human Evaluation Officer makes binding accept/reject decisions.
2. **Deterministic & Explainable**: Every score is traceable to a specific Drools rule execution and SHAP feature attribution waterfall.
3. **Identity Verified against Government Sources**: PAN and GSTIN are cross-verified against simulated NSDL/ITD and GSTN APIs.
4. **Forgery & Collusion Protection**: Error Level Analysis (ELA) detects digitally modified text/stamps, and perceptual hashing catches certificates reused across different bidders.
5. **Full Accountability**: Every action (bid upload, evaluation, officer decision, override, appeal) is cryptographically signed and chained in an immutable SHA-256 audit log.

---

## 🔄 End-to-End System Workflow (Steps 0 to 11)

- **STEP 0: Tender Creation & Rule Configuration (Admin / Officer)**: Define tender scope, minimum turnover, years of experience, and mandatory quality certifications. Parsed dynamically into Drools rules.
- **STEP 1: User Roles & Login (RBAC)**: Role-based access control with JWT authentication (`ROLE_OFFICER`, `ROLE_BIDDER`, `ROLE_ADMIN`).
- **STEP 2: Bid Submission (Bidder)**: Bidder inputs structured financial details and uploads certificate documents.
- **STEP 3: Identity Verification**: Automated check against NSDL PAN format, GSTN active status, legal name cross-verification, and GeM/CVC debarred vendor blacklist.
- **STEP 4: Document Processing (AI Microservice)**: OCR extracts raw text, NLP parses turnover/experience/certifications, ELA inspects compression variance, and perceptual hashing inspects duplicate collusion.
- **STEP 5: Compliance Matching (Drools Rule Engine)**: Deterministic evaluation of bidder credentials against tender criteria.
- **STEP 6 & 8: Evidence-Based Scoring & SHAP Explainability**: SHAP attribution calculates exact positive/negative contributions of each factor to the final score.
- **STEP 7: Risk Analysis**: Low / Medium / High risk levels assigned based on tamper detection, blacklist alerts, and document discrepancies.
- **STEP 9: Ranking & Decision Support**: Bids ranked descending by compliance score with visible risk badges and full dossier view.
- **STEP 10: Final Decision (Officer)**: Human officer records binding decision. If overriding AI recommendations, mandatory written justification is required and permanently logged.
- **STEP 11: Grievance / Appeal (Bidder)**: Bidders flagged as suspicious/rejected can submit clarifications and evidence before final award locking.

---

## 🚀 Quick Start & How to Run

### Option 1: 1-Click Startup on Windows (Recommended)
Simply double-click or run from PowerShell:
```cmd
start-all.bat
```
This automatically launches all 3 tiers in separate terminal windows:
- **Frontend**: http://localhost:5173
- **Spring Boot Backend**: http://localhost:8080
- **AI Microservice**: http://localhost:8000 (Swagger docs at http://localhost:8000/docs)

---

### Option 2: Run Microservices Individually

#### 1. AI Microservice (Python FastAPI)
```powershell
cd D:\SIH26100\ai-service
python run.py
```

#### 2. Core Backend (Spring Boot + Drools)
```powershell
cd D:\SIH26100\backend
.\run_backend.bat
```

#### 3. Frontend (React + Vite)
```powershell
cd D:\SIH26100\frontend
npm run dev
```

---

### Option 3: Docker Compose
```powershell
docker-compose up --build
```

---

## 🔑 Demo User Credentials

The platform comes pre-seeded with ready-to-test accounts and demo evaluation dossiers:

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Evaluation Officer** | `officer` | `officer123` | View rankings, inspect Drools traces, SHAP waterfall charts, ELA heatmaps, record binding decisions, resolve appeals. |
| **Bidder** | `bidder1` | `bidder123` | Browse tenders, submit bids, upload documents, track status, file grievance appeals. |
| **Admin** | `admin` | `admin123` | Publish new tenders, configure custom Drools eligibility rules, view audit trails. |

---

## 🧪 Sample Test Documents
Sample certificate images are located in `sample-data/documents/`:
1. `1_compliant_ca_turnover.jpg` — Compliant vendor with high turnover, 9 yrs experience, and ISO-9001/ISO-27001 certifications (Low Risk).
2. `2_tampered_turnover_ela.jpg` — Digitally edited turnover certificate flagged by Error Level Analysis (High Risk).
3. `3_debarred_vendor_doc.jpg` — Blacklisted vendor PAN `FRAUD1111A` flagged by central registry check.
