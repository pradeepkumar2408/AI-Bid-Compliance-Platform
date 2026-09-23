package com.gem.procurement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.BidSubmission;
import com.gem.procurement.model.entity.ComplianceScore;
import com.gem.procurement.model.entity.OfficerDecision;
import com.gem.procurement.repository.BidSubmissionRepository;
import com.gem.procurement.repository.ComplianceScoreRepository;
import com.gem.procurement.repository.OfficerDecisionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DecisionService {

    private final OfficerDecisionRepository officerDecisionRepository;
    private final BidSubmissionRepository bidSubmissionRepository;
    private final ComplianceScoreRepository complianceScoreRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public OfficerDecision recordDecision(Long bidId, DTOs.DecisionRequest request, String officerUsername) {
        try {
            BidSubmission bid = bidSubmissionRepository.findById(bidId)
                    .orElseThrow(() -> new IllegalArgumentException("Bid not found: " + bidId));

            Optional<ComplianceScore> scoreOpt = complianceScoreRepository.findByBidId(bidId);
            Double aiScore = scoreOpt.map(ComplianceScore::getTotalScore).orElse(0.0);
            String aiRisk = scoreOpt.map(ComplianceScore::getRiskLevel).orElse("UNKNOWN");

            boolean isOverride = Boolean.TRUE.equals(request.getOfficerOverride());

            // Enforce mandatory written justification if overriding or rejecting contrary to AI
            if (isOverride && (request.getWrittenJustification() == null || request.getWrittenJustification().trim().length() < 10)) {
                throw new IllegalArgumentException("Mandatory written justification (at least 10 characters) is legally required for officer overrides.");
            }

            Optional<OfficerDecision> existing = officerDecisionRepository.findByBidId(bidId);
            OfficerDecision decision = existing.orElseGet(() -> OfficerDecision.builder()
                    .bidId(bid.getId())
                    .tenderId(bid.getTenderId())
                    .build());

            decision.setOfficerId(officerUsername);
            decision.setDecision(request.getDecision());
            decision.setAiScore(aiScore);
            decision.setOfficerOverride(isOverride);
            decision.setWrittenJustification(request.getWrittenJustification());
            decision.setDecidedAt(LocalDateTime.now());

            OfficerDecision savedDecision = officerDecisionRepository.save(decision);

            // Update Bid status
            if ("ACCEPTED".equalsIgnoreCase(request.getDecision())) {
                bid.setStatus("ACCEPTED");
            } else if ("REJECTED".equalsIgnoreCase(request.getDecision())) {
                bid.setStatus("REJECTED");
            } else {
                bid.setStatus("UNDER_REVIEW");
            }
            bidSubmissionRepository.save(bid);

            // Log event in Immutable Audit Trail
            String eventType = isOverride ? "OFFICER_OVERRIDE" : "OFFICER_DECISION";
            String description = String.format("Officer %s recorded decision %s on Bid %s (AI Score: %.1f, Risk: %s, Override: %b). Justification: %s",
                    officerUsername, request.getDecision(), bid.getBidNumber(), aiScore, aiRisk, isOverride, request.getWrittenJustification());

            auditService.logEvent(
                    eventType,
                    "DECISION",
                    savedDecision.getId().toString(),
                    officerUsername,
                    "OFFICER",
                    description,
                    existing.isPresent() ? objectMapper.writeValueAsString(existing.get()) : null,
                    objectMapper.writeValueAsString(savedDecision)
            );

            return savedDecision;
        } catch (Exception e) {
            throw new RuntimeException("Error recording officer decision: " + e.getMessage(), e);
        }
    }
}
