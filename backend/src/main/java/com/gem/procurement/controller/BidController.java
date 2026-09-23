package com.gem.procurement.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.BidDocument;
import com.gem.procurement.model.entity.BidSubmission;
import com.gem.procurement.repository.BidDocumentRepository;
import com.gem.procurement.repository.BidSubmissionRepository;
import com.gem.procurement.service.BidEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/bidder")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BidController {

    private final BidEvaluationService bidEvaluationService;
    private final BidSubmissionRepository bidSubmissionRepository;
    private final BidDocumentRepository bidDocumentRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping(value = "/bids/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitBid(
            @RequestParam("tenderId") Long tenderId,
            @RequestParam("bidderName") String bidderName,
            @RequestParam("pan") String pan,
            @RequestParam("gstin") String gstin,
            @RequestParam("declaredTurnover") BigDecimal declaredTurnover,
            @RequestParam("declaredExperience") BigDecimal declaredExperience,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @RequestParam(value = "docTypes", required = false) List<String> docTypes,
            Authentication auth
    ) {
        try {
            String bidderUsername = auth != null ? auth.getName() : "bidder";
            DTOs.BidSubmitRequest request = DTOs.BidSubmitRequest.builder()
                    .tenderId(tenderId)
                    .bidderName(bidderName)
                    .pan(pan)
                    .gstin(gstin)
                    .declaredTurnover(declaredTurnover)
                    .declaredExperience(declaredExperience)
                    .build();

            BidSubmission submission = bidEvaluationService.submitBid(request, files, docTypes, bidderUsername);
            return ResponseEntity.ok(submission);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/bids/my-bids")
    public ResponseEntity<List<BidSubmission>> getMyBids(Authentication auth) {
        String bidderUsername = auth != null ? auth.getName() : "bidder1";
        return ResponseEntity.ok(bidSubmissionRepository.findByBidderId(bidderUsername));
    }

    @GetMapping("/bids/{id}")
    public ResponseEntity<?> getBidDetails(@PathVariable Long id) {
        return bidSubmissionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/bids/{id}/documents")
    public ResponseEntity<List<BidDocument>> getBidDocuments(@PathVariable Long id) {
        return ResponseEntity.ok(bidDocumentRepository.findByBidSubmissionId(id));
    }
}
