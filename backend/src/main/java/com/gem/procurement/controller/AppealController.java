package com.gem.procurement.controller;

import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.GrievanceAppeal;
import com.gem.procurement.service.GrievanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AppealController {

    private final GrievanceService grievanceService;

    @PostMapping("/bidder/bids/{bidId}/appeal")
    public ResponseEntity<?> submitAppeal(
            @PathVariable Long bidId,
            @RequestBody DTOs.AppealRequest request,
            Authentication auth
    ) {
        try {
            String bidderUsername = auth != null ? auth.getName() : "bidder";
            GrievanceAppeal appeal = grievanceService.submitAppeal(bidId, request, bidderUsername);
            return ResponseEntity.ok(appeal);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/bidder/bids/{bidId}/appeals")
    public ResponseEntity<List<GrievanceAppeal>> getAppealsForBid(@PathVariable Long bidId) {
        return ResponseEntity.ok(grievanceService.getAppealsForBid(bidId));
    }

    @GetMapping("/officer/appeals/pending")
    public ResponseEntity<List<GrievanceAppeal>> getPendingAppeals() {
        return ResponseEntity.ok(grievanceService.getAllPendingAppeals());
    }

    @PostMapping("/officer/appeals/{appealId}/resolve")
    public ResponseEntity<?> resolveAppeal(
            @PathVariable Long appealId,
            @RequestBody DTOs.AppealResolveRequest request,
            Authentication auth
    ) {
        try {
            String officerUsername = auth != null ? auth.getName() : "officer";
            GrievanceAppeal resolved = grievanceService.resolveAppeal(appealId, request, officerUsername);
            return ResponseEntity.ok(resolved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
