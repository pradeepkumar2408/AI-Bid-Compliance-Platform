package com.gem.procurement.rules;

import org.kie.api.KieServices;
import org.kie.api.builder.KieBuilder;
import org.kie.api.builder.KieFileSystem;
import org.kie.api.builder.KieModule;
import org.kie.api.io.Resource;
import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieSession;
import org.kie.internal.io.ResourceFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.List;

@Service
public class DroolsEngineService {

    private KieContainer kieContainer;

    @PostConstruct
    public void init() {
        try {
            KieServices ks = KieServices.Factory.get();
            KieFileSystem kfs = ks.newKieFileSystem();
            Resource resource = ResourceFactory.newClassPathResource("rules/eligibility.drl");
            kfs.write(resource);
            KieBuilder kb = ks.newKieBuilder(kfs);
            kb.buildAll();
            KieModule kieModule = kb.getKieModule();
            this.kieContainer = ks.newKieContainer(kieModule.getReleaseId());
            System.out.println("[Drools] Rule Engine initialized successfully.");
        } catch (Exception e) {
            System.err.println("[Drools] Warning: Initializing programmatic fallback rule engine: " + e.getMessage());
            this.kieContainer = null;
        }
    }

    public ComplianceRuleFact evaluateRules(ComplianceRuleFact fact) {
        if (this.kieContainer != null) {
            KieSession kieSession = null;
            try {
                kieSession = this.kieContainer.newKieSession();
                kieSession.insert(fact);
                kieSession.fireAllRules();
                return fact;
            } catch (Exception e) {
                System.err.println("[Drools] Runtime error during rule execution, applying fallback: " + e.getMessage());
            } finally {
                if (kieSession != null) {
                    kieSession.dispose();
                }
            }
        }

        // Programmatic Deterministic Evaluation Fallback (Matches DRL 1:1)
        return evaluateProgrammatic(fact);
    }

    private ComplianceRuleFact evaluateProgrammatic(ComplianceRuleFact fact) {
        // 0. Document Relevance & Classification Gate
        if (Boolean.TRUE.equals(fact.getHasInvalidDocuments())) {
            String reasons = fact.getInvalidDocReasons() != null && !fact.getInvalidDocReasons().isEmpty()
                    ? String.join("; ", fact.getInvalidDocReasons())
                    : "Invalid or irrelevant document uploaded. Non-procurement files detected.";
            fact.addResult("RULE_DOC_RELEVANCE_FAIL", "Document Relevance & Classification Gate", "INTEGRITY", false,
                    "Irrelevant document detected: " + reasons, -35.0, true);
        } else {
            fact.addResult("RULE_DOC_RELEVANCE_PASS", "Document Relevance & Classification Gate", "INTEGRITY", true,
                    "All uploaded files classified as authentic procurement-related documents (GST/PAN/Financials/Certificates).", 10.0, true);
        }

        // 1. Debarment Check
        if (Boolean.TRUE.equals(fact.getIsDebarred())) {
            fact.addResult("RULE_BLACKLIST_FAIL", "Debarment / Blacklist Check", "IDENTITY", false,
                    "Bidder is listed on GeM/CVC Debarred Vendor Registry.", -50.0, true);
        } else {
            fact.addResult("RULE_BLACKLIST_PASS", "Debarment / Blacklist Check", "IDENTITY", true,
                    "Bidder clear from all central debarment and blacklist registries.", 10.0, true);
        }

        // 2. Identity & GST
        if (Boolean.TRUE.equals(fact.getPanValid()) && Boolean.TRUE.equals(fact.getGstActive()) && Boolean.TRUE.equals(fact.getNameMatched())) {
            fact.addResult("RULE_IDENTITY_PASS", "Government Identity Verification", "IDENTITY", true,
                    "PAN verified with NSDL/ITD and active GSTIN on GSTN portal without name mismatch.", 15.0, true);
        } else {
            fact.addResult("RULE_IDENTITY_FAIL", "Government Identity Verification", "IDENTITY", false,
                    "Government Identity Discrepancy: PAN/GST inactive or name mismatch across records.", -20.0, true);
        }

        // 3. Forgery / ELA
        if (Boolean.TRUE.equals(fact.getIsTampered())) {
            fact.addResult("RULE_FORGERY_FAIL", "Document Authenticity & Tamper Check", "INTEGRITY", false,
                    "Error Level Analysis (ELA) detected digital manipulation in submitted documents (Tamper Score: " + fact.getTamperScore() + ")", -40.0, true);
        } else {
            fact.addResult("RULE_FORGERY_PASS", "Document Authenticity & Tamper Check", "INTEGRITY", true,
                    "Error Level Analysis confirmed digital compression consistency across documents.", 10.0, true);
        }

        // 4. Duplicate Check
        if (Boolean.TRUE.equals(fact.getIsDuplicate())) {
            fact.addResult("RULE_DUPLICATE_FAIL", "Cross-Bidder Document Collusion Check", "INTEGRITY", false,
                    "Identical certificate hash detected across different bidder submissions.", -30.0, true);
        } else {
            fact.addResult("RULE_DUPLICATE_PASS", "Cross-Bidder Document Collusion Check", "INTEGRITY", true,
                    "Unique document hash verified across all historical and current bid submissions.", 5.0, true);
        }

        // 5. Turnover
        if (fact.getTurnover() != null && fact.getMinTurnover() != null) {
            if (fact.getTurnover().compareTo(fact.getMinTurnover()) >= 0) {
                fact.addResult("RULE_TURNOVER_PASS", "Annual Turnover Requirement", "FINANCIAL", true,
                        "Annual Turnover INR " + fact.getTurnover() + " meets or exceeds required INR " + fact.getMinTurnover(), 25.0, true);
            } else {
                fact.addResult("RULE_TURNOVER_FAIL", "Annual Turnover Requirement", "FINANCIAL", false,
                        "Annual Turnover INR " + fact.getTurnover() + " is below minimum required INR " + fact.getMinTurnover(), -25.0, true);
            }
        }

        // 6. Experience
        if (fact.getExperienceYears() != null && fact.getMinExperienceYears() != null) {
            if (fact.getExperienceYears().compareTo(fact.getMinExperienceYears()) >= 0) {
                fact.addResult("RULE_EXP_PASS", "Past Experience Requirement", "TECHNICAL", true,
                        "Experience of " + fact.getExperienceYears() + " years meets or exceeds required " + fact.getMinExperienceYears() + " years", 20.0, true);
            } else {
                fact.addResult("RULE_EXP_FAIL", "Past Experience Requirement", "TECHNICAL", false,
                        "Experience of " + fact.getExperienceYears() + " years is below minimum required " + fact.getMinExperienceYears() + " years", -20.0, true);
            }
        }

        // 7. Certifications
        if (fact.getRequiredCerts() != null && !fact.getRequiredCerts().isEmpty()) {
            boolean allMatched = true;
            for (String reqCert : fact.getRequiredCerts()) {
                if (!fact.getBidderCerts().contains(reqCert)) {
                    allMatched = false;
                    break;
                }
            }
            if (allMatched) {
                fact.addResult("RULE_CERT_PASS", "Mandatory Certifications", "TECHNICAL", true,
                        "All required certifications verified: " + fact.getRequiredCerts(), 15.0, true);
            } else {
                fact.addResult("RULE_CERT_FAIL", "Mandatory Certifications", "TECHNICAL", false,
                        "Missing required certifications. Found: " + fact.getBidderCerts() + ", Required: " + fact.getRequiredCerts(), -15.0, false);
            }
        }

        return fact;
    }
}
