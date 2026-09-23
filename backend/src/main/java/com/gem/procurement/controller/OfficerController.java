package com.gem.procurement.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.*;
import com.gem.procurement.repository.*;
import com.gem.procurement.service.BidEvaluationService;
import com.gem.procurement.service.DecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/officer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OfficerController {

    private final BidSubmissionRepository bidSubmissionRepository;
    private final BidDocumentRepository bidDocumentRepository;
    private final IdentityVerificationRepository identityVerificationRepository;
    private final ComplianceScoreRepository complianceScoreRepository;
    private final OfficerDecisionRepository officerDecisionRepository;
    private final DecisionService decisionService;
    private final BidEvaluationService bidEvaluationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/tenders/{tenderId}/ranking")
    public ResponseEntity<?> getTenderRanking(@PathVariable Long tenderId) {
        List<BidSubmission> bids = bidSubmissionRepository.findByTenderId(tenderId);
        List<Map<String, Object>> rankedList = new ArrayList<>();

        for (BidSubmission bid : bids) {
            Map<String, Object> map = new HashMap<>();
            map.put("bidId", bid.getId());
            map.put("bidNumber", bid.getBidNumber());
            map.put("bidderName", bid.getBidderName());
            map.put("bidderId", bid.getBidderId());
            map.put("submissionDate", bid.getSubmissionDate());
            map.put("status", bid.getStatus());
            map.put("appealStatus", bid.getAppealStatus());

            Optional<ComplianceScore> scoreOpt = complianceScoreRepository.findByBidId(bid.getId());
            map.put("complianceScore", scoreOpt.map(ComplianceScore::getTotalScore).orElse(0.0));
            map.put("riskLevel", scoreOpt.map(ComplianceScore::getRiskLevel).orElse("UNKNOWN"));

            Optional<IdentityVerification> identOpt = identityVerificationRepository.findByBidId(bid.getId());
            map.put("identityStatus", identOpt.map(IdentityVerification::getOverallIdentityStatus).orElse("PENDING"));

            Optional<OfficerDecision> decOpt = officerDecisionRepository.findByBidId(bid.getId());
            map.put("officerDecision", decOpt.map(OfficerDecision::getDecision).orElse("PENDING"));
            map.put("officerOverride", decOpt.map(OfficerDecision::getOfficerOverride).orElse(false));

            rankedList.add(map);
        }

        // Sort by compliance score descending
        rankedList.sort((a, b) -> Double.compare((Double) b.get("complianceScore"), (Double) a.get("complianceScore")));

        return ResponseEntity.ok(rankedList);
    }

    @GetMapping("/bids/{bidId}/evaluation")
    public ResponseEntity<?> getBidEvaluationDossier(@PathVariable Long bidId) {
        Optional<BidSubmission> bidOpt = bidSubmissionRepository.findById(bidId);
        if (bidOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        BidSubmission bid = bidOpt.get();
        List<BidDocument> docs = bidDocumentRepository.findByBidSubmissionId(bidId);
        Optional<IdentityVerification> identity = identityVerificationRepository.findByBidId(bidId);
        Optional<ComplianceScore> score = complianceScoreRepository.findByBidId(bidId);
        Optional<OfficerDecision> decision = officerDecisionRepository.findByBidId(bidId);

        Map<String, Object> dossier = new HashMap<>();
        dossier.put("bid", bid);
        dossier.put("documents", docs);
        dossier.put("identityVerification", identity.orElse(null));
        dossier.put("complianceScore", score.orElse(null));
        dossier.put("officerDecision", decision.orElse(null));

        return ResponseEntity.ok(dossier);
    }

    @PostMapping("/bids/{bidId}/decision")
    public ResponseEntity<?> recordDecision(
            @PathVariable Long bidId,
            @RequestBody DTOs.DecisionRequest request,
            Authentication auth
    ) {
        try {
            String officerUsername = auth != null ? auth.getName() : "officer";
            OfficerDecision decision = decisionService.recordDecision(bidId, request, officerUsername);
            return ResponseEntity.ok(decision);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/bids/{bidId}/re-evaluate")
    public ResponseEntity<?> reEvaluateBid(@PathVariable Long bidId) {
        try {
            ComplianceScore score = bidEvaluationService.evaluateBid(bidId);
            return ResponseEntity.ok(score);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
