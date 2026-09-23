package com.gem.procurement.controller;

import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.Tender;
import com.gem.procurement.service.TenderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TenderController {

    private final TenderService tenderService;

    @GetMapping("/public/tenders")
    public ResponseEntity<List<Tender>> getAllTenders() {
        return ResponseEntity.ok(tenderService.getAllTenders());
    }

    @GetMapping("/public/tenders/{id}")
    public ResponseEntity<?> getTenderById(@PathVariable Long id) {
        return tenderService.getTenderById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping({"/admin/tenders", "/officer/tenders"})
    public ResponseEntity<?> createTender(@RequestBody DTOs.TenderCreateRequest request, Authentication auth) {
        try {
            String createdBy = auth != null ? auth.getName() : "officer";
            Tender tender = tenderService.createTender(request, createdBy);
            return ResponseEntity.ok(tender);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
