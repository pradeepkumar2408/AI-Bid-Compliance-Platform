package com.gem.procurement.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.BidSubmission;
import com.gem.procurement.model.entity.GrievanceAppeal;
import com.gem.procurement.repository.BidSubmissionRepository;
import com.gem.procurement.repository.GrievanceAppealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GrievanceService {

    private final GrievanceAppealRepository grievanceAppealRepository;
    private final BidSubmissionRepository bidSubmissionRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public GrievanceAppeal submitAppeal(Long bidId, DTOs.AppealRequest request, String bidderUsername) {
        try {
            BidSubmission bid = bidSubmissionRepository.findById(bidId)
                    .orElseThrow(() -> new IllegalArgumentException("Bid not found: " + bidId));

            GrievanceAppeal appeal = GrievanceAppeal.builder()
                    .bidId(bidId)
                    .bidderId(bidderUsername)
                    .appealReason(request.getAppealReason())
                    .additionalEvidencePath(request.getAdditionalEvidence())
                    .status("PENDING")
                    .createdAt(LocalDateTime.now())
                    .build();

            GrievanceAppeal savedAppeal = grievanceAppealRepository.save(appeal);

            bid.setAppealStatus("SUBMITTED");
            bidSubmissionRepository.save(bid);

            // Audit Trail
            auditService.logEvent(
                    "APPEAL_SUBMITTED",
                    "APPEAL",
                    savedAppeal.getId().toString(),
                    bidderUsername,
                    "BIDDER",
                    "Grievance/Appeal submitted by bidder for Bid " + bid.getBidNumber() + ". Reason: " + request.getAppealReason(),
                    null,
                    objectMapper.writeValueAsString(savedAppeal)
            );

            return savedAppeal;
        } catch (Exception e) {
            throw new RuntimeException("Error submitting grievance appeal: " + e.getMessage(), e);
        }
    }

    @Transactional
    public GrievanceAppeal resolveAppeal(Long appealId, DTOs.AppealResolveRequest request, String officerUsername) {
        try {
            GrievanceAppeal appeal = grievanceAppealRepository.findById(appealId)
                    .orElseThrow(() -> new IllegalArgumentException("Appeal not found: " + appealId));

            appeal.setStatus(request.getStatus());
            appeal.setOfficerResponse(request.getOfficerResponse());
            appeal.setResolvedAt(LocalDateTime.now());

            GrievanceAppeal updated = grievanceAppealRepository.save(appeal);

            BidSubmission bid = bidSubmissionRepository.findById(appeal.getBidId()).orElse(null);
            if (bid != null) {
                bid.setAppealStatus("RESOLVED");
                if ("APPROVED".equalsIgnoreCase(request.getStatus())) {
                    bid.setStatus("UNDER_REVIEW");
                }
                bidSubmissionRepository.save(bid);
            }

            auditService.logEvent(
                    "APPEAL_RESOLVED",
                    "APPEAL",
                    appeal.getId().toString(),
                    officerUsername,
                    "OFFICER",
                    "Grievance appeal " + appeal.getId() + " resolved with status: " + request.getStatus() + ". Notes: " + request.getOfficerResponse(),
                    null,
                    objectMapper.writeValueAsString(updated)
            );

            return updated;
        } catch (Exception e) {
            throw new RuntimeException("Error resolving grievance appeal: " + e.getMessage(), e);
        }
    }

    public List<GrievanceAppeal> getAppealsForBid(Long bidId) {
        return grievanceAppealRepository.findByBidId(bidId);
    }

    public List<GrievanceAppeal> getAllPendingAppeals() {
        return grievanceAppealRepository.findByStatus("PENDING");
    }
}
