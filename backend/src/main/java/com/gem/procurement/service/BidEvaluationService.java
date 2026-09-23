package com.gem.procurement.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.*;
import com.gem.procurement.repository.*;
import com.gem.procurement.rules.ComplianceRuleFact;
import com.gem.procurement.rules.DroolsEngineService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BidEvaluationService {

    private final BidSubmissionRepository bidSubmissionRepository;
    private final BidDocumentRepository bidDocumentRepository;
    private final TenderRepository tenderRepository;
    private final IdentityVerificationService identityVerificationService;
    private final AIServiceClient aiServiceClient;
    private final DroolsEngineService droolsEngineService;
    private final ComplianceScoreRepository complianceScoreRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public BidSubmission submitBid(DTOs.BidSubmitRequest request, List<MultipartFile> files, String bidderUsername) {
        return submitBid(request, files, null, bidderUsername);
    }

    @Transactional
    public BidSubmission submitBid(DTOs.BidSubmitRequest request, List<MultipartFile> files, List<String> docTypes, String bidderUsername) {
        try {
            Tender tender = tenderRepository.findById(request.getTenderId())
                    .orElseThrow(() -> new IllegalArgumentException("Tender not found: " + request.getTenderId()));

            String cleanPan = request.getPan() != null ? request.getPan().trim().toUpperCase() : "";

            // Enforce Single Bid Per Tender Policy (Prevent duplicate submissions by same bidder/PAN)
            boolean alreadySubmitted = bidSubmissionRepository.existsByTenderIdAndBidderIdOrPan(tender.getId(), bidderUsername, cleanPan);
            if (alreadySubmitted) {
                throw new IllegalArgumentException("You have already applied for Tender " + tender.getTenderNumber() + ". Multiple bid submissions for the same tender are prohibited under GeM procurement guidelines.");
            }

            String bidNumber = "BID-" + System.currentTimeMillis();
            BidSubmission submission = BidSubmission.builder()
                    .bidNumber(bidNumber)
                    .tenderId(tender.getId())
                    .bidderId(bidderUsername)
                    .bidderName(request.getBidderName())
                    .pan(cleanPan)
                    .gstin(request.getGstin() != null ? request.getGstin().trim().toUpperCase() : "")
                    .declaredTurnover(request.getDeclaredTurnover())
                    .declaredExperience(request.getDeclaredExperience())
                    .submissionDate(LocalDateTime.now())
                    .status("RECEIVED")
                    .appealStatus("NONE")
                    .build();

            BidSubmission savedSubmission = bidSubmissionRepository.save(submission);

            // Handle file storage & initial BidDocument entities
            File uploadDir = new File("./uploads/" + bidNumber);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            List<BidDocument> documents = new ArrayList<>();
            if (files != null) {
                for (int i = 0; i < files.size(); i++) {
                    MultipartFile file = files.get(i);
                    if (file.isEmpty()) continue;

                    String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "doc_" + i;
                    File dest = new File(uploadDir, filename);
                    try (FileOutputStream fos = new FileOutputStream(dest)) {
                        fos.write(file.getBytes());
                    }

                    String explicitDocType = (docTypes != null && i < docTypes.size()) ? docTypes.get(i) : null;
                    String docType = (explicitDocType != null && !explicitDocType.trim().isEmpty())
                            ? explicitDocType.trim()
                            : determineDocType(filename, i);
                    String fileHash = DigestUtils.sha256Hex(file.getBytes());

                    BidDocument doc = BidDocument.builder()
                            .bidSubmission(savedSubmission)
                            .documentType(docType)
                            .filename(filename)
                            .storagePath(dest.getAbsolutePath())
                            .fileHash(fileHash)
                            .isTampered(false)
                            .tamperScore(0.0)
                            .isDuplicate(false)
                            .build();

                    documents.add(doc);
                }
            }

            bidDocumentRepository.saveAll(documents);
            savedSubmission.setDocuments(documents);

            // Audit Log Step 2
            auditService.logEvent(
                    "BID_SUBMITTED",
                    "BID",
                    savedSubmission.getId().toString(),
                    bidderUsername,
                    "BIDDER",
                    "Bid submitted for tender " + tender.getTenderNumber() + " with " + documents.size() + " documents.",
                    null,
                    objectMapper.writeValueAsString(savedSubmission)
            );

            // Trigger Async/Direct Evaluation Pipeline
            evaluateBidAsync(savedSubmission.getId());

            return savedSubmission;
        } catch (Exception e) {
            throw new RuntimeException("Error submitting bid: " + e.getMessage(), e);
        }
    }

    @Async
    public void evaluateBidAsync(Long bidId) {
        evaluateBid(bidId);
    }

    @Transactional
    public ComplianceScore evaluateBid(Long bidId) {
        try {
            BidSubmission bid = bidSubmissionRepository.findById(bidId)
                    .orElseThrow(() -> new IllegalArgumentException("Bid not found: " + bidId));

            Tender tender = tenderRepository.findById(bid.getTenderId())
                    .orElseThrow(() -> new IllegalArgumentException("Tender not found: " + bid.getTenderId()));

            bid.setStatus("PROCESSING");
            bidSubmissionRepository.save(bid);

            // STEP 3: Identity Verification (PAN, GST, Debarment)
            IdentityVerification identity = identityVerificationService.verifyIdentity(
                    bid.getId(), bid.getBidderName(), bid.getPan(), bid.getGstin());

            // STEP 4: AI Microservice Document Processing (OCR, NLP, Forgery ELA, Duplicates)
            List<BidDocument> docs = bidDocumentRepository.findByBidSubmissionId(bid.getId());
            BigDecimal extractedTurnover = bid.getDeclaredTurnover();
            BigDecimal extractedExperience = bid.getDeclaredExperience();
            List<String> combinedExtractedCerts = new ArrayList<>();
            boolean hasTamperedDocs = false;
            double maxTamperScore = 0.0;
            boolean hasDuplicateDocs = false;
            boolean hasInvalidDocs = false;
            List<String> invalidDocReasons = new ArrayList<>();

            for (BidDocument doc : docs) {
                try {
                    File file = new File(doc.getStoragePath());
                    byte[] fileBytes = file.exists() ? org.apache.commons.io.FileUtils.readFileToByteArray(file) : new byte[0];

                    JsonNode aiResult = aiServiceClient.processDocument(
                            fileBytes, doc.getFilename(), bid.getBidderId(), tender.getTenderNumber(), doc.getDocumentType());

                    if (aiResult != null) {
                        // 1. Classification & Validation Gate
                        String valStatus = aiResult.path("validation_status").asText("VALID");
                        String cat = aiResult.path("detected_category").asText(doc.getDocumentType());
                        double conf = aiResult.path("confidence_score").asDouble(0.0);
                        String rejReason = aiResult.hasNonNull("rejection_reason") ? aiResult.path("rejection_reason").asText() : null;

                        doc.setValidationStatus(valStatus);
                        doc.setDetectedCategory(cat);
                        doc.setConfidenceScore(conf);
                        doc.setRejectionReason(rejReason);

                        if ("INVALID".equalsIgnoreCase(valStatus) || Boolean.FALSE.equals(aiResult.path("success").asBoolean(true))) {
                            hasInvalidDocs = true;
                            String msg = doc.getFilename() + " (" + cat + "): " + (rejReason != null ? rejReason : "Irrelevant document rejected.");
                            invalidDocReasons.add(msg);
                            System.err.println("[BidEvaluation] Irrelevant Document Rejected: " + msg);
                        }

                        // 2. NLP Entities (if valid)
                        if (aiResult.has("entities") && !"INVALID".equalsIgnoreCase(valStatus)) {
                            JsonNode entities = aiResult.get("entities");
                            if (entities.hasNonNull("turnover_inr")) {
                                extractedTurnover = BigDecimal.valueOf(entities.get("turnover_inr").asDouble());
                                doc.setExtractedTurnover(extractedTurnover);
                            }
                            if (entities.hasNonNull("experience_years")) {
                                extractedExperience = BigDecimal.valueOf(entities.get("experience_years").asDouble());
                                doc.setExtractedExperience(extractedExperience);
                            }
                            if (entities.has("certifications") && entities.get("certifications").isArray()) {
                                List<String> certs = objectMapper.convertValue(entities.get("certifications"), new TypeReference<List<String>>() {});
                                combinedExtractedCerts.addAll(certs);
                                doc.setExtractedCertsJson(objectMapper.writeValueAsString(certs));
                            }
                        }

                        // 3. ELA Tamper Analysis
                        if (aiResult.has("tamper_analysis")) {
                            JsonNode tamper = aiResult.get("tamper_analysis");
                            boolean isTampered = tamper.path("tamper_detected").asBoolean(false);
                            double score = tamper.path("tamper_score").asDouble(0.0);
                            doc.setIsTampered(isTampered);
                            doc.setTamperScore(score);
                            doc.setTamperReason(tamper.path("reason").asText(""));
                            doc.setElaImageBase64(tamper.path("ela_image_base64").asText(null));
                            if (isTampered) {
                                hasTamperedDocs = true;
                            }
                            if (score > maxTamperScore) {
                                maxTamperScore = score;
                            }
                        }

                        // 4. Duplicate Check
                        if (aiResult.has("duplicate_analysis")) {
                            JsonNode dup = aiResult.get("duplicate_analysis");
                            boolean isDup = dup.path("is_duplicate").asBoolean(false);
                            doc.setIsDuplicate(isDup);
                            if (isDup) {
                                hasDuplicateDocs = true;
                                doc.setDuplicateMatchedBidder(dup.path("duplicate_match").path("bidder_id").asText(""));
                            }
                        }

                        // 5. OCR Text
                        if (aiResult.has("ocr_text")) {
                            doc.setOcrText(aiResult.get("ocr_text").asText(""));
                        }
                    }

                    bidDocumentRepository.save(doc);
                } catch (Exception e) {
                    System.err.println("[BidEvaluation] Error processing doc " + doc.getFilename() + ": " + e.getMessage());
                }
            }

            // STEP 5: Drools Rule Engine Compliance Matching
            List<String> requiredCerts = new ArrayList<>();
            if (tender.getRequiredCertsJson() != null && !tender.getRequiredCertsJson().isBlank()) {
                requiredCerts = objectMapper.readValue(tender.getRequiredCertsJson(), new TypeReference<List<String>>() {});
            }

            boolean isPanValid = "VALID".equalsIgnoreCase(identity.getPanStatus()) || "REAL_AND_ACTIVE".equalsIgnoreCase(identity.getPanStatus());
            boolean isGstActive = "ACTIVE".equalsIgnoreCase(identity.getGstStatus()) || "REAL_AND_ACTIVE".equalsIgnoreCase(identity.getGstStatus());
            boolean isNameMatched = !Boolean.TRUE.equals(identity.getNameMismatchFlag());
            boolean isDebarred = Boolean.TRUE.equals(identity.getIsDebarred());

            ComplianceRuleFact fact = ComplianceRuleFact.builder()
                    .bidNumber(bid.getBidNumber())
                    .tenderNumber(tender.getTenderNumber())
                    .turnover(extractedTurnover != null ? extractedTurnover : bid.getDeclaredTurnover())
                    .minTurnover(tender.getMinTurnover())
                    .experienceYears(extractedExperience != null ? extractedExperience : bid.getDeclaredExperience())
                    .minExperienceYears(tender.getMinExperienceYears())
                    .bidderCerts(combinedExtractedCerts)
                    .requiredCerts(requiredCerts)
                    .panValid(isPanValid)
                    .gstActive(isGstActive)
                    .nameMatched(isNameMatched)
                    .isDebarred(isDebarred)
                    .isTampered(hasTamperedDocs)
                    .tamperScore(maxTamperScore)
                    .isDuplicate(hasDuplicateDocs)
                    .hasInvalidDocuments(hasInvalidDocs)
                    .invalidDocReasons(invalidDocReasons)
                    .build();

            ComplianceRuleFact evaluatedFact = droolsEngineService.evaluateRules(fact);

            // STEP 6, 7, 8: Explainable Scoring & Risk Analysis with SHAP
            Map<String, Object> bidderMetrics = new HashMap<>();
            bidderMetrics.put("turnover_inr", fact.getTurnover() != null ? fact.getTurnover().doubleValue() : 0.0);
            bidderMetrics.put("experience_years", fact.getExperienceYears() != null ? fact.getExperienceYears().doubleValue() : 0.0);
            
            double certMatchRatio = 1.0;
            if (!requiredCerts.isEmpty()) {
                long matchedCount = requiredCerts.stream().filter(combinedExtractedCerts::contains).count();
                certMatchRatio = (double) matchedCount / requiredCerts.size();
            }
            bidderMetrics.put("certifications_match_ratio", certMatchRatio);

            boolean isIdentityVerified = !isDebarred && (
                    "REAL_AND_VERIFIED".equalsIgnoreCase(identity.getOverallIdentityStatus()) ||
                    "VERIFIED".equalsIgnoreCase(identity.getOverallIdentityStatus()) ||
                    (isPanValid && isGstActive)
            );
            bidderMetrics.put("identity_score", isIdentityVerified ? 1.0 : 0.0);
            bidderMetrics.put("tamper_score", maxTamperScore);
            bidderMetrics.put("is_duplicate", hasDuplicateDocs);

            Map<String, Object> tenderReqs = new HashMap<>();
            tenderReqs.put("min_turnover_inr", tender.getMinTurnover() != null ? tender.getMinTurnover().doubleValue() : 10000000.0);
            tenderReqs.put("min_experience_years", tender.getMinExperienceYears() != null ? tender.getMinExperienceYears().doubleValue() : 3.0);

            JsonNode shapResult = aiServiceClient.explainScore(bidderMetrics, tenderReqs);

            double finalScore = 75.0;
            String riskLevel = "LOW";
            String shapJsonStr = "{}";

            if (shapResult != null && shapResult.has("explanation")) {
                JsonNode expl = shapResult.get("explanation");
                finalScore = expl.path("final_score").asDouble(75.0);
                riskLevel = expl.path("risk_level").asText("LOW");
                shapJsonStr = objectMapper.writeValueAsString(expl);
            }

            // Save ComplianceScore
            String droolsTraceJson = objectMapper.writeValueAsString(evaluatedFact.getEvaluationResults());
            
            Optional<ComplianceScore> existingScore = complianceScoreRepository.findByBidId(bid.getId());
            ComplianceScore scoreEntity = existingScore.orElseGet(() -> ComplianceScore.builder()
                    .bidId(bid.getId())
                    .tenderId(tender.getId())
                    .build());

            scoreEntity.setTotalScore(finalScore);
            scoreEntity.setRiskLevel(riskLevel);
            scoreEntity.setDroolsTraceJson(droolsTraceJson);
            scoreEntity.setShapAttributionJson(shapJsonStr);
            scoreEntity.setEvaluatedAt(LocalDateTime.now());

            ComplianceScore savedScore = complianceScoreRepository.save(scoreEntity);

            // Update Bid Status
            if ("HIGH".equals(riskLevel) || !evaluatedFact.isEligible()) {
                bid.setStatus("SUSPICIOUS");
            } else {
                bid.setStatus("EVALUATED");
            }
            bidSubmissionRepository.save(bid);

            // Audit Trail Log Step 6 & 8
            auditService.logEvent(
                    "AI_EVALUATION_COMPLETED",
                    "BID",
                    bid.getId().toString(),
                    "SYSTEM_AI_ENGINE",
                    "AI_SERVICE",
                    "Automated compliance evaluation completed. Score: " + finalScore + "/100, Risk: " + riskLevel + ", Drools rules executed: " + evaluatedFact.getEvaluationResults().size(),
                    null,
                    objectMapper.writeValueAsString(savedScore)
            );

            return savedScore;
        } catch (Exception e) {
            throw new RuntimeException("Error evaluating bid: " + e.getMessage(), e);
        }
    }

    private String determineDocType(String filename, int index) {
        String lower = filename.toLowerCase();
        if (lower.contains("dsc") || lower.contains("signature") || lower.contains("token")) return "DSC_CERTIFICATE";
        if (lower.contains("pan")) return "PAN_DOCUMENT";
        if (lower.contains("gst")) return "GST_CERTIFICATE";
        if (lower.contains("incorporation") || lower.contains("coi") || lower.contains("mca") || lower.contains("constitution") || lower.contains("deed")) return "COMPANY_REGISTRATION";
        if (lower.contains("udyam") || lower.contains("msme")) return "UDYAM_MSME";
        if (lower.contains("turnover") || lower.contains("balance") || lower.contains("financial") || lower.contains("audit") || lower.contains("udin")) return "FINANCIAL_STATEMENTS";
        if (lower.contains("exp") || lower.contains("experience") || lower.contains("work") || lower.contains("completion") || lower.contains("order")) return "EXPERIENCE_PROOF";
        if (lower.contains("emd") || lower.contains("guarantee") || lower.contains("bg") || lower.contains("security")) return "BID_SECURITY_EMD";
        if (lower.contains("affidavit") || lower.contains("declaration") || lower.contains("collusion") || lower.contains("integrity") || lower.contains("oem") || lower.contains("maf")) return "COMPLIANCE_DECLARATIONS";
        if (lower.contains("cheque") || lower.contains("bank") || lower.contains("mandate") || lower.contains("eft") || lower.contains("signatory") || lower.contains("aadhaar")) return "BANK_PAYMENT_DOCS";
        if (lower.contains("iso") || lower.contains("cmmi") || lower.contains("cert")) return "COMPLIANCE_CERTIFICATES";
        return "GENERAL_DOC_" + index;
    }
}
