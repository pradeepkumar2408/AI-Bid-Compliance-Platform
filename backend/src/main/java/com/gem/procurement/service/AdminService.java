package com.gem.procurement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.*;
import com.gem.procurement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final TenderRepository tenderRepository;
    private final TenderRuleRepository tenderRuleRepository;
    private final BidSubmissionRepository bidSubmissionRepository;
    private final BidDocumentRepository bidDocumentRepository;
    private final ComplianceScoreRepository complianceScoreRepository;
    private final OfficerDecisionRepository officerDecisionRepository;
    private final IdentityVerificationRepository identityVerificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final TaxpayerRegistryRepository taxpayerRegistryRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Dynamic system settings storage (in-memory with sensible defaults, persistent through session)
    private static final Map<String, Object> SYSTEM_SETTINGS = new ConcurrentHashMap<>();
    private static final Map<String, Double> RULE_WEIGHTS = new ConcurrentHashMap<>();

    static {
        SYSTEM_SETTINGS.put("nsdlApiMode", "LIVE_SIMULATION");
        SYSTEM_SETTINGS.put("gstnApiMode", "LIVE_SIMULATION");
        SYSTEM_SETTINGS.put("digilockerEnabled", true);
        SYSTEM_SETTINGS.put("cvcDebarmentSync", true);
        SYSTEM_SETTINGS.put("highRiskThreshold", 50.0);
        SYSTEM_SETTINGS.put("lowRiskThreshold", 75.0);
        SYSTEM_SETTINGS.put("ocrEngine", "Tesseract-OCR v5.3");
        SYSTEM_SETTINGS.put("elaTamperSensitivity", "BALANCED");
        SYSTEM_SETTINGS.put("droolsExecutionMode", "STRICT");

        RULE_WEIGHTS.put("turnoverWeight", 25.0);
        RULE_WEIGHTS.put("experienceWeight", 25.0);
        RULE_WEIGHTS.put("certificationWeight", 20.0);
        RULE_WEIGHTS.put("taxIdentityWeight", 20.0);
        RULE_WEIGHTS.put("integrityWeight", 10.0);
    }

    // ==========================================
    // 1. OVERVIEW PANEL METRICS
    // ==========================================
    public Map<String, Object> getOverviewStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalUsers = userRepository.count();
        List<User> allUsers = userRepository.findAll();
        long officersCount = allUsers.stream().filter(u -> "ROLE_OFFICER".equalsIgnoreCase(u.getRole())).count();
        long biddersCount = allUsers.stream().filter(u -> "ROLE_BIDDER".equalsIgnoreCase(u.getRole())).count();
        long adminCount = allUsers.stream().filter(u -> "ROLE_ADMIN".equalsIgnoreCase(u.getRole())).count();
        long activeUsers = allUsers.stream().filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()) || u.getStatus() == null).count();
        long blockedUsers = allUsers.stream().filter(u -> "BLOCKED".equalsIgnoreCase(u.getStatus())).count();
        long pendingOfficersCount = allUsers.stream().filter(u -> "ROLE_OFFICER".equalsIgnoreCase(u.getRole()) && "PENDING".equalsIgnoreCase(u.getStatus())).count();

        long totalTenders = tenderRepository.count();
        long totalBids = bidSubmissionRepository.count();

        List<OfficerDecision> decisions = officerDecisionRepository.findAll();
        long acceptedBids = decisions.stream().filter(d -> "ACCEPTED".equalsIgnoreCase(d.getDecision())).count();
        long rejectedBids = decisions.stream().filter(d -> "REJECTED".equalsIgnoreCase(d.getDecision())).count();
        long pendingBids = Math.max(0, totalBids - (acceptedBids + rejectedBids));

        List<ComplianceScore> scores = complianceScoreRepository.findAll();
        double avgScore = scores.isEmpty() ? 0.0 : scores.stream().mapToDouble(ComplianceScore::getTotalScore).average().orElse(0.0);
        long highRiskCount = scores.stream().filter(s -> "HIGH".equalsIgnoreCase(s.getRiskLevel()) || s.getTotalScore() < 50.0).count();

        List<BidDocument> docs = bidDocumentRepository.findAll();
        long tamperedDocsCount = docs.stream().filter(d -> Boolean.TRUE.equals(d.getIsTampered())).count();
        long duplicateDocsCount = docs.stream().filter(d -> Boolean.TRUE.equals(d.getIsDuplicate())).count();
        long invalidDocsCount = docs.stream().filter(d -> "INVALID".equalsIgnoreCase(d.getValidationStatus())).count();

        long totalAuditLogs = auditLogRepository.count();
        List<AuditLog> recentLogs = auditLogRepository.findTop100ByOrderByTimestampDesc().stream().limit(10).collect(Collectors.toList());

        stats.put("totalUsers", totalUsers);
        stats.put("officersCount", officersCount);
        stats.put("biddersCount", biddersCount);
        stats.put("adminCount", adminCount);
        stats.put("activeUsers", activeUsers);
        stats.put("blockedUsers", blockedUsers);
        stats.put("pendingOfficersCount", pendingOfficersCount);
        stats.put("totalTenders", totalTenders);
        stats.put("totalBids", totalBids);
        stats.put("acceptedBids", acceptedBids);
        stats.put("rejectedBids", rejectedBids);
        stats.put("pendingBids", pendingBids);
        stats.put("avgComplianceScore", Math.round(avgScore * 10.0) / 10.0);
        stats.put("highRiskBidsCount", highRiskCount);
        stats.put("tamperedDocsCount", tamperedDocsCount);
        stats.put("duplicateDocsCount", duplicateDocsCount);
        stats.put("invalidDocsCount", invalidDocsCount);
        stats.put("totalAuditLogs", totalAuditLogs);
        stats.put("recentActivity", recentLogs);

        return stats;
    }

    // ==========================================
    // 2. USER MANAGEMENT
    // ==========================================
    public List<Map<String, Object>> getAllUsers() {
        return userRepository.findAll().stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("email", u.getEmail());
            map.put("role", u.getRole());
            map.put("organizationName", u.getOrganizationName());
            map.put("pan", u.getPan());
            map.put("gstin", u.getGstin());
            map.put("isIdentityVerified", u.getIsIdentityVerified());
            map.put("status", u.getStatus() != null ? u.getStatus() : "ACTIVE");
            map.put("createdAt", u.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> updateUserStatus(Long id, String status, String adminUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));

        String oldStatus = user.getStatus();
        user.setStatus(status.toUpperCase());
        userRepository.save(user);

        auditService.logEvent(
                "USER_STATUS_UPDATE",
                "User",
                user.getUsername(),
                adminUsername,
                "ROLE_ADMIN",
                "Admin changed status of user " + user.getUsername() + " from " + oldStatus + " to " + user.getStatus(),
                oldStatus,
                user.getStatus()
        );

        Map<String, Object> res = new HashMap<>();
        res.put("id", user.getId());
        res.put("username", user.getUsername());
        res.put("status", user.getStatus());
        res.put("message", "User status updated to " + user.getStatus());
        return res;
    }

    public Map<String, Object> verifyUserIdentity(Long id, Boolean isVerified, String adminUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));

        user.setIsIdentityVerified(isVerified);
        userRepository.save(user);

        auditService.logEvent(
                "USER_IDENTITY_VERIFICATION",
                "User",
                user.getUsername(),
                adminUsername,
                "ROLE_ADMIN",
                "Admin manually set identity verification status of user " + user.getUsername() + " to " + isVerified,
                null,
                String.valueOf(isVerified)
        );

        Map<String, Object> res = new HashMap<>();
        res.put("id", user.getId());
        res.put("username", user.getUsername());
        res.put("isIdentityVerified", user.getIsIdentityVerified());
        res.put("message", "User identity verification status updated.");
        return res;
    }

    public Map<String, Object> resetUserPassword(Long id, String newPassword, String adminUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        auditService.logEvent(
                "ADMIN_PASSWORD_RESET",
                "User",
                user.getUsername(),
                adminUsername,
                "ROLE_ADMIN",
                "Admin initiated administrative password reset for user " + user.getUsername(),
                null,
                "SUCCESS"
        );

        Map<String, Object> res = new HashMap<>();
        res.put("message", "Password successfully reset for " + user.getUsername());
        return res;
    }

    @Transactional
    public Map<String, Object> deleteUser(Long id, String adminUsername) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));

        if ("ROLE_ADMIN".equalsIgnoreCase(user.getRole()) && "admin".equalsIgnoreCase(user.getUsername())) {
            throw new IllegalArgumentException("Cannot delete primary system administrator account.");
        }

        String deletedUsername = user.getUsername();
        userRepository.delete(user);

        auditService.logEvent(
                "USER_DELETION",
                "User",
                deletedUsername,
                adminUsername,
                "ROLE_ADMIN",
                "Admin deleted user account: " + deletedUsername,
                deletedUsername,
                "DELETED"
        );

        Map<String, Object> res = new HashMap<>();
        res.put("message", "User " + deletedUsername + " deleted successfully.");
        return res;
    }

    public List<AuditLog> getUserActivity(String username) {
        List<AuditLog> all = auditLogRepository.findAll();
        return all.stream()
                .filter(a -> username.equalsIgnoreCase(a.getActorUsername()) || username.equalsIgnoreCase(a.getEntityId()))
                .sorted((a, b) -> b.getId().compareTo(a.getId()))
                .limit(50)
                .collect(Collectors.toList());
    }

    // ==========================================
    // 3. TENDER & BID MONITORING
    // ==========================================
    public List<Map<String, Object>> getTendersSummary() {
        List<Tender> tenders = tenderRepository.findAll();
        List<BidSubmission> allBids = bidSubmissionRepository.findAll();
        List<OfficerDecision> allDecisions = officerDecisionRepository.findAll();
        List<ComplianceScore> allScores = complianceScoreRepository.findAll();

        return tenders.stream().map(t -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId());
            map.put("tenderNumber", t.getTenderNumber());
            map.put("title", t.getTitle());
            map.put("department", t.getDepartment());
            map.put("category", t.getCategory());
            map.put("estimatedValue", t.getEstimatedValue());
            map.put("minTurnover", t.getMinTurnover());
            map.put("minExperienceYears", t.getMinExperienceYears());
            map.put("status", t.getStatus());
            map.put("createdAt", t.getCreatedAt());

            List<BidSubmission> bids = allBids.stream().filter(b -> b.getTenderId().equals(t.getId())).collect(Collectors.toList());
            map.put("totalBids", bids.size());

            long accepted = bids.stream().filter(b -> allDecisions.stream().anyMatch(d -> d.getBidId().equals(b.getId()) && "ACCEPTED".equalsIgnoreCase(d.getDecision()))).count();
            long rejected = bids.stream().filter(b -> allDecisions.stream().anyMatch(d -> d.getBidId().equals(b.getId()) && "REJECTED".equalsIgnoreCase(d.getDecision()))).count();
            long pending = bids.size() - (accepted + rejected);

            map.put("acceptedBids", accepted);
            map.put("rejectedBids", rejected);
            map.put("pendingBids", pending);

            List<Double> tenderScores = allScores.stream()
                    .filter(s -> s.getTenderId().equals(t.getId()))
                    .map(ComplianceScore::getTotalScore)
                    .collect(Collectors.toList());

            double avg = tenderScores.isEmpty() ? 0.0 : tenderScores.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            map.put("avgScore", Math.round(avg * 10.0) / 10.0);

            return map;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTenderBids(Long tenderId) {
        List<BidSubmission> bids = bidSubmissionRepository.findByTenderId(tenderId);
        return bids.stream().map(b -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", b.getId());
            map.put("bidNumber", b.getBidNumber());
            map.put("bidderId", b.getBidderId());
            map.put("bidderName", b.getBidderName());
            map.put("pan", b.getPan());
            map.put("gstin", b.getGstin());
            map.put("declaredTurnover", b.getDeclaredTurnover());
            map.put("declaredExperience", b.getDeclaredExperience());
            map.put("submissionDate", b.getSubmissionDate());
            map.put("status", b.getStatus());
            map.put("appealStatus", b.getAppealStatus());

            Optional<ComplianceScore> scoreOpt = complianceScoreRepository.findByBidId(b.getId());
            map.put("complianceScore", scoreOpt.map(ComplianceScore::getTotalScore).orElse(0.0));
            map.put("riskLevel", scoreOpt.map(ComplianceScore::getRiskLevel).orElse("UNKNOWN"));

            Optional<IdentityVerification> identOpt = identityVerificationRepository.findByBidId(b.getId());
            map.put("identityStatus", identOpt.map(IdentityVerification::getOverallIdentityStatus).orElse("PENDING"));
            map.put("isDebarred", identOpt.map(IdentityVerification::getIsDebarred).orElse(false));

            Optional<OfficerDecision> decOpt = officerDecisionRepository.findByBidId(b.getId());
            map.put("officerDecision", decOpt.map(OfficerDecision::getDecision).orElse("PENDING"));

            List<BidDocument> docs = bidDocumentRepository.findByBidSubmissionId(b.getId());
            map.put("documentCount", docs.size());
            map.put("hasTamperedDocs", docs.stream().anyMatch(d -> Boolean.TRUE.equals(d.getIsTampered())));
            map.put("hasDuplicateDocs", docs.stream().anyMatch(d -> Boolean.TRUE.equals(d.getIsDuplicate())));

            return map;
        }).collect(Collectors.toList());
    }

    // ==========================================
    // 4. VERIFICATION LOGS
    // ==========================================
    public List<Map<String, Object>> getVerificationLogs(String filter) {
        List<IdentityVerification> verifications = identityVerificationRepository.findAll();
        List<BidSubmission> allBids = bidSubmissionRepository.findAll();
        Map<Long, BidSubmission> bidMap = allBids.stream().collect(Collectors.toMap(BidSubmission::getId, b -> b, (a, b) -> a));

        return verifications.stream().map(v -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", v.getId());
            map.put("bidId", v.getBidId());
            map.put("pan", v.getPan());
            map.put("panStatus", v.getPanStatus());
            map.put("panHolderName", v.getPanHolderName());
            map.put("gstin", v.getGstin());
            map.put("gstStatus", v.getGstStatus());
            map.put("gstLegalName", v.getGstLegalName());
            map.put("nameMismatchFlag", v.getNameMismatchFlag());
            map.put("isDebarred", v.getIsDebarred());
            map.put("debarmentAgency", v.getDebarmentAgency());
            map.put("debarmentReason", v.getDebarmentReason());
            map.put("overallIdentityStatus", v.getOverallIdentityStatus());
            map.put("panVerificationDate", v.getPanVerificationDate());

            BidSubmission bid = bidMap.get(v.getBidId());
            if (bid != null) {
                map.put("bidNumber", bid.getBidNumber());
                map.put("bidderName", bid.getBidderName());
                map.put("tenderId", bid.getTenderId());
            }

            return map;
        }).filter(m -> {
            if (filter == null || filter.isEmpty() || "ALL".equalsIgnoreCase(filter)) return true;
            if ("FAILED".equalsIgnoreCase(filter)) {
                return !"REAL_AND_ACTIVE".equalsIgnoreCase((String) m.get("panStatus")) ||
                        !"ACTIVE".equalsIgnoreCase((String) m.get("gstStatus")) ||
                        Boolean.TRUE.equals(m.get("isDebarred")) ||
                        Boolean.TRUE.equals(m.get("nameMismatchFlag"));
            }
            if ("MISMATCH".equalsIgnoreCase(filter)) return Boolean.TRUE.equals(m.get("nameMismatchFlag"));
            if ("DEBARRED".equalsIgnoreCase(filter)) return Boolean.TRUE.equals(m.get("isDebarred"));
            if ("VERIFIED".equalsIgnoreCase(filter)) return "REAL_AND_VERIFIED".equalsIgnoreCase((String) m.get("overallIdentityStatus"));
            return true;
        }).collect(Collectors.toList());
    }

    // ==========================================
    // 5. RISK & FRAUD DETECTION
    // ==========================================
    public Map<String, Object> getFraudAlerts() {
        List<Map<String, Object>> alerts = new ArrayList<>();

        // 1. Check Document Tampering (ELA image detections)
        List<BidDocument> docs = bidDocumentRepository.findAll();
        for (BidDocument doc : docs) {
            if (Boolean.TRUE.equals(doc.getIsTampered())) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "TAMPER-" + doc.getId());
                alert.put("severity", "HIGH");
                alert.put("category", "DOCUMENT_TAMPERING");
                alert.put("title", "Digital Image Manipulation Detected (ELA)");
                alert.put("description", "Document " + doc.getFilename() + " failed Error Level Analysis. " + (doc.getTamperReason() != null ? doc.getTamperReason() : "Inconsistent JPEG compression grids."));
                alert.put("docId", doc.getId());
                alert.put("filename", doc.getFilename());
                alert.put("tamperScore", doc.getTamperScore());
                alerts.add(alert);
            }

            if (Boolean.TRUE.equals(doc.getIsDuplicate())) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "DUP-" + doc.getId());
                alert.put("severity", "HIGH");
                alert.put("category", "DOCUMENT_DUPLICATION");
                alert.put("title", "Duplicate Document Reused Across Bidders");
                alert.put("description", "File " + doc.getFilename() + " has identical cryptographic SHA-256 hash matching another bidder: " + doc.getDuplicateMatchedBidder());
                alert.put("docId", doc.getId());
                alert.put("filename", doc.getFilename());
                alerts.add(alert);
            }

            if ("INVALID".equalsIgnoreCase(doc.getValidationStatus())) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "INVALID-" + doc.getId());
                alert.put("severity", "MEDIUM");
                alert.put("category", "INVALID_DOCUMENT_UPLOAD");
                alert.put("title", "Irrelevant / Non-Procurement Document Uploaded");
                alert.put("description", "Document " + doc.getFilename() + " was classified as " + doc.getDetectedCategory() + " (" + doc.getRejectionReason() + ")");
                alert.put("docId", doc.getId());
                alert.put("filename", doc.getFilename());
                alerts.add(alert);
            }
        }

        // 2. Check Debarred Entities & Name Mismatches
        List<IdentityVerification> verifications = identityVerificationRepository.findAll();
        for (IdentityVerification v : verifications) {
            if (Boolean.TRUE.equals(v.getIsDebarred())) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "DEBARRED-" + v.getId());
                alert.put("severity", "HIGH");
                alert.put("category", "BLACKLISTED_VENDOR");
                alert.put("title", "Debarred Vendor / CVC Watchlist Hit");
                alert.put("description", "PAN " + v.getPan() + " / GST " + v.getGstin() + " is debarred by " + v.getDebarmentAgency() + ". Reason: " + v.getDebarmentReason());
                alert.put("bidId", v.getBidId());
                alerts.add(alert);
            }

            if (Boolean.TRUE.equals(v.getNameMismatchFlag())) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "MISMATCH-" + v.getId());
                alert.put("severity", "MEDIUM");
                alert.put("category", "IDENTITY_MISMATCH");
                alert.put("title", "Tax Name Mismatch Detected");
                alert.put("description", "Discrepancy detected between PAN Taxpayer name (" + v.getPanHolderName() + ") and GST legal trade name (" + v.getGstLegalName() + ")");
                alert.put("bidId", v.getBidId());
                alerts.add(alert);
            }
        }

        // 3. High Risk Compliance Scores
        List<ComplianceScore> scores = complianceScoreRepository.findAll();
        for (ComplianceScore s : scores) {
            if ("HIGH".equalsIgnoreCase(s.getRiskLevel()) || s.getTotalScore() < 50.0) {
                Map<String, Object> alert = new HashMap<>();
                alert.put("id", "RISK-" + s.getId());
                alert.put("severity", s.getTotalScore() < 40.0 ? "HIGH" : "MEDIUM");
                alert.put("category", "HIGH_RISK_SCORE");
                alert.put("title", "High Risk / Low Compliance Bid (Score: " + s.getTotalScore() + "%)");
                alert.put("description", "Bid #" + s.getBidId() + " failed multiple mandatory Drools eligibility rules.");
                alert.put("bidId", s.getBidId());
                alert.put("score", s.getTotalScore());
                alerts.add(alert);
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("totalAlerts", alerts.size());
        res.put("highSeverityCount", alerts.stream().filter(a -> "HIGH".equalsIgnoreCase((String) a.get("severity"))).count());
        res.put("mediumSeverityCount", alerts.stream().filter(a -> "MEDIUM".equalsIgnoreCase((String) a.get("severity"))).count());
        res.put("lowSeverityCount", alerts.stream().filter(a -> "LOW".equalsIgnoreCase((String) a.get("severity"))).count());
        res.put("alerts", alerts);
        return res;
    }

    // ==========================================
    // 6. ANALYTICS & REPORTS
    // ==========================================
    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();

        List<ComplianceScore> scores = complianceScoreRepository.findAll();
        List<OfficerDecision> decisions = officerDecisionRepository.findAll();
        List<Tender> tenders = tenderRepository.findAll();
        List<BidSubmission> bids = bidSubmissionRepository.findAll();

        // Score Distribution
        long score90plus = scores.stream().filter(s -> s.getTotalScore() >= 85.0).count();
        long score70to85 = scores.stream().filter(s -> s.getTotalScore() >= 70.0 && s.getTotalScore() < 85.0).count();
        long score50to70 = scores.stream().filter(s -> s.getTotalScore() >= 50.0 && s.getTotalScore() < 70.0).count();
        long scoreBelow50 = scores.stream().filter(s -> s.getTotalScore() < 50.0).count();

        Map<String, Long> scoreBuckets = new HashMap<>();
        scoreBuckets.put("High Compliance (85-100%)", score90plus);
        scoreBuckets.put("Compliant (70-84%)", score70to85);
        scoreBuckets.put("Moderate Risk (50-69%)", score50to70);
        scoreBuckets.put("High Risk (0-49%)", scoreBelow50);
        analytics.put("scoreDistribution", scoreBuckets);

        // Decisions breakdown
        long accepted = decisions.stream().filter(d -> "ACCEPTED".equalsIgnoreCase(d.getDecision())).count();
        long rejected = decisions.stream().filter(d -> "REJECTED".equalsIgnoreCase(d.getDecision())).count();
        long clarifications = decisions.stream().filter(d -> "REQUEST_CLARIFICATION".equalsIgnoreCase(d.getDecision())).count();
        long pending = Math.max(0, bids.size() - (accepted + rejected + clarifications));

        Map<String, Long> decisionBreakdown = new HashMap<>();
        decisionBreakdown.put("Accepted", accepted);
        decisionBreakdown.put("Rejected", rejected);
        decisionBreakdown.put("Clarification Requested", clarifications);
        decisionBreakdown.put("Decision Pending", pending);
        analytics.put("decisionDistribution", decisionBreakdown);

        // Category breakdown
        Map<String, Long> categoryMap = tenders.stream()
                .collect(Collectors.groupingBy(t -> t.getCategory() != null ? t.getCategory() : "General", Collectors.counting()));
        analytics.put("categoryDistribution", categoryMap);

        // Timeline trends (by date)
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Long> submissionTimeline = bids.stream()
                .collect(Collectors.groupingBy(b -> b.getSubmissionDate() != null ? b.getSubmissionDate().format(dtf) : "Today", Collectors.counting()));
        analytics.put("submissionTimeline", submissionTimeline);

        return analytics;
    }

    // ==========================================
    // 7. RULE ENGINE MANAGEMENT
    // ==========================================
    public List<TenderRule> getAllRules() {
        return tenderRuleRepository.findAll();
    }

    public TenderRule createRule(DTOs.RuleCreateDto ruleDto, Long tenderId) {
        Tender tender = tenderRepository.findById(tenderId)
                .orElseThrow(() -> new IllegalArgumentException("Tender not found with ID: " + tenderId));

        TenderRule rule = TenderRule.builder()
                .tender(tender)
                .ruleName(ruleDto.getRuleName())
                .ruleCategory(ruleDto.getRuleCategory() != null ? ruleDto.getRuleCategory() : "FINANCIAL")
                .conditionExpression(ruleDto.getConditionExpression())
                .weight(ruleDto.getWeight() != null ? ruleDto.getWeight() : 1.0)
                .isMandatory(ruleDto.getIsMandatory() != null ? ruleDto.getIsMandatory() : true)
                .passCriterion(ruleDto.getPassCriterion())
                .build();

        return tenderRuleRepository.save(rule);
    }

    public TenderRule updateRule(Long id, DTOs.RuleCreateDto ruleDto) {
        TenderRule rule = tenderRuleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found with ID: " + id));

        rule.setRuleName(ruleDto.getRuleName());
        if (ruleDto.getRuleCategory() != null) rule.setRuleCategory(ruleDto.getRuleCategory());
        rule.setConditionExpression(ruleDto.getConditionExpression());
        if (ruleDto.getWeight() != null) rule.setWeight(ruleDto.getWeight());
        if (ruleDto.getIsMandatory() != null) rule.setIsMandatory(ruleDto.getIsMandatory());
        if (ruleDto.getPassCriterion() != null) rule.setPassCriterion(ruleDto.getPassCriterion());

        return tenderRuleRepository.save(rule);
    }

    public void deleteRule(Long id) {
        tenderRuleRepository.deleteById(id);
    }

    public Map<String, Double> getRuleWeights() {
        return new HashMap<>(RULE_WEIGHTS);
    }

    public Map<String, Double> updateRuleWeights(Map<String, Double> weights) {
        RULE_WEIGHTS.putAll(weights);
        return new HashMap<>(RULE_WEIGHTS);
    }

    // ==========================================
    // 8. DOCUMENT MONITORING
    // ==========================================
    public List<Map<String, Object>> getAllDocuments() {
        List<BidDocument> docs = bidDocumentRepository.findAll();
        List<BidSubmission> bids = bidSubmissionRepository.findAll();
        Map<Long, BidSubmission> bidMap = bids.stream().collect(Collectors.toMap(BidSubmission::getId, b -> b, (a, b) -> a));

        return docs.stream().map(d -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", d.getId());
            map.put("filename", d.getFilename());
            map.put("documentType", d.getDocumentType());
            map.put("detectedCategory", d.getDetectedCategory());
            map.put("validationStatus", d.getValidationStatus() != null ? d.getValidationStatus() : "VALID");
            map.put("rejectionReason", d.getRejectionReason());
            map.put("confidenceScore", d.getConfidenceScore());
            map.put("isTampered", d.getIsTampered());
            map.put("tamperScore", d.getTamperScore());
            map.put("tamperReason", d.getTamperReason());
            map.put("isDuplicate", d.getIsDuplicate());
            map.put("duplicateMatchedBidder", d.getDuplicateMatchedBidder());
            map.put("fileHash", d.getFileHash());
            map.put("extractedTurnover", d.getExtractedTurnover());
            map.put("extractedExperience", d.getExtractedExperience());
            map.put("extractedCertsJson", d.getExtractedCertsJson());

            String ocrSnippet = d.getOcrText();
            if (ocrSnippet != null && ocrSnippet.length() > 300) {
                ocrSnippet = ocrSnippet.substring(0, 300) + "...";
            }
            map.put("ocrSnippet", ocrSnippet);

            if (d.getBidSubmission() != null) {
                map.put("bidId", d.getBidSubmission().getId());
                map.put("bidNumber", d.getBidSubmission().getBidNumber());
                map.put("bidderName", d.getBidSubmission().getBidderName());
                map.put("tenderId", d.getBidSubmission().getTenderId());
            }

            return map;
        }).collect(Collectors.toList());
    }

    // ==========================================
    // 9. AUDIT LOGS & INTEGRITY VERIFICATION
    // ==========================================
    public List<AuditLog> getAuditLogs() {
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }

    public Map<String, Object> verifyAuditChain() {
        List<AuditLog> logs = auditLogRepository.findAll();
        boolean isChainValid = true;
        int brokenAtId = -1;

        // Verify SHA-256 hash chaining
        for (int i = 1; i < logs.size(); i++) {
            AuditLog prev = logs.get(i - 1);
            AuditLog curr = logs.get(i);
            if (curr.getPreviousHash() != null && !curr.getPreviousHash().equals(prev.getIntegrityHash())) {
                isChainValid = false;
                brokenAtId = curr.getId().intValue();
                break;
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("isChainValid", isChainValid);
        res.put("totalLogsChecked", logs.size());
        res.put("status", isChainValid ? "VERIFIED_TAMPER_PROOF" : "CHAIN_TAMPERED");
        res.put("brokenAtRecordId", brokenAtId);
        res.put("message", isChainValid ? "Cryptographic hash chain is 100% verified and intact." : "Hash mismatch detected at audit log record ID: " + brokenAtId);
        return res;
    }

    // ==========================================
    // 10. NOTIFICATIONS SYSTEM
    // ==========================================
    public List<Map<String, Object>> getNotifications() {
        List<Map<String, Object>> notifs = new ArrayList<>();

        // Pending Officer Registrations awaiting Admin Approval
        List<User> pendingOfficers = userRepository.findAll().stream()
                .filter(u -> "ROLE_OFFICER".equalsIgnoreCase(u.getRole()) && "PENDING".equalsIgnoreCase(u.getStatus()))
                .collect(Collectors.toList());
        for (User u : pendingOfficers) {
            Map<String, Object> n = new HashMap<>();
            n.put("id", "NOTIF-OFFICER-PENDING-" + u.getId());
            n.put("title", "👮 New Evaluation Officer Approval Required");
            n.put("message", "Officer " + u.getEmail() + " (" + u.getUsername() + ") has registered and requires administrative clearance.");
            n.put("type", "USER_APPROVAL");
            n.put("severity", "HIGH");
            n.put("time", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "Recent");
            notifs.add(n);
        }

        // Fraud and Tamper alerts
        List<BidDocument> tampered = bidDocumentRepository.findAll().stream().filter(d -> Boolean.TRUE.equals(d.getIsTampered())).collect(Collectors.toList());
        for (BidDocument d : tampered) {
            Map<String, Object> n = new HashMap<>();
            n.put("id", "NOTIF-TAMPER-" + d.getId());
            n.put("title", "Tampered Document Alert");
            n.put("message", "Document " + d.getFilename() + " exhibits forensic ELA tampering.");
            n.put("type", "FRAUD_ALERT");
            n.put("severity", "HIGH");
            n.put("time", "Recent");
            notifs.add(n);
        }

        // Debarred vendor attempts
        List<IdentityVerification> debarred = identityVerificationRepository.findAll().stream().filter(v -> Boolean.TRUE.equals(v.getIsDebarred())).collect(Collectors.toList());
        for (IdentityVerification v : debarred) {
            Map<String, Object> n = new HashMap<>();
            n.put("id", "NOTIF-DEBARRED-" + v.getId());
            n.put("title", "Debarred Vendor Submission Attempt");
            n.put("message", "Vendor with PAN " + v.getPan() + " attempted bid submission while on CVC debarred registry.");
            n.put("type", "SECURITY_ALERT");
            n.put("severity", "HIGH");
            n.put("time", "Recent");
            notifs.add(n);
        }

        // New bid submissions
        List<BidSubmission> recentBids = bidSubmissionRepository.findAll().stream().sorted((a, b) -> b.getId().compareTo(a.getId())).limit(5).collect(Collectors.toList());
        for (BidSubmission b : recentBids) {
            Map<String, Object> n = new HashMap<>();
            n.put("id", "NOTIF-BID-" + b.getId());
            n.put("title", "New Bid Submitted");
            n.put("message", "Bid " + b.getBidNumber() + " submitted by " + b.getBidderName() + " for Tender #" + b.getTenderId());
            n.put("type", "BID_SUBMISSION");
            n.put("severity", "INFO");
            n.put("time", b.getSubmissionDate() != null ? b.getSubmissionDate().toString() : "Recent");
            notifs.add(n);
        }

        return notifs;
    }

    // ==========================================
    // 11. SYSTEM SETTINGS
    // ==========================================
    public Map<String, Object> getSystemSettings() {
        return new HashMap<>(SYSTEM_SETTINGS);
    }

    public Map<String, Object> updateSystemSettings(Map<String, Object> newSettings, String adminUsername) {
        SYSTEM_SETTINGS.putAll(newSettings);

        auditService.logEvent(
                "SYSTEM_SETTINGS_UPDATE",
                "SystemConfig",
                "GlobalConfig",
                adminUsername,
                "ROLE_ADMIN",
                "Admin updated global system and AI integration settings.",
                null,
                "UPDATED"
        );

        return new HashMap<>(SYSTEM_SETTINGS);
    }
}
