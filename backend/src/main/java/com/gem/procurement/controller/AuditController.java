package com.gem.procurement.controller;

import com.gem.procurement.model.entity.AuditLog;
import com.gem.procurement.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuditController {

    private final AuditService auditService;

    @GetMapping("/officer/audit-trail")
    public ResponseEntity<List<AuditLog>> getOfficerAuditTrail() {
        return ResponseEntity.ok(auditService.getAllLogs());
    }

    @GetMapping("/admin/audit-trail")
    public ResponseEntity<List<AuditLog>> getAdminAuditTrail() {
        return ResponseEntity.ok(auditService.getAllLogs());
    }

    @GetMapping("/officer/audit-trail/entity/{entityId}")
    public ResponseEntity<List<AuditLog>> getEntityAuditTrail(@PathVariable String entityId) {
        return ResponseEntity.ok(auditService.getLogsForEntity(entityId));
    }
}
