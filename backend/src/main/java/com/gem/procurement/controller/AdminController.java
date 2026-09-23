package com.gem.procurement.controller;

import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.AuditLog;
import com.gem.procurement.model.entity.TenderRule;
import com.gem.procurement.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminService adminService;

    // 1. Overview Stats
    @GetMapping("/overview-stats")
    public ResponseEntity<Map<String, Object>> getOverviewStats() {
        return ResponseEntity.ok(adminService.getOverviewStats());
    }

    // 2. User Management
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        try {
            String adminUser = auth != null ? auth.getName() : "admin";
            String status = body.getOrDefault("status", "ACTIVE");
            return ResponseEntity.ok(adminService.updateUserStatus(id, status, adminUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/users/{id}/verify-identity")
    public ResponseEntity<?> verifyUserIdentity(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> body,
            Authentication auth
    ) {
        try {
            String adminUser = auth != null ? auth.getName() : "admin";
            Boolean isVerified = body.getOrDefault("isIdentityVerified", true);
            return ResponseEntity.ok(adminService.verifyUserIdentity(id, isVerified, adminUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetUserPassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        try {
            String adminUser = auth != null ? auth.getName() : "admin";
            String newPassword = body.get("newPassword");
            if (newPassword == null || newPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "New password cannot be empty."));
            }
            return ResponseEntity.ok(adminService.resetUserPassword(id, newPassword, adminUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            Authentication auth
    ) {
        try {
            String adminUser = auth != null ? auth.getName() : "admin";
            return ResponseEntity.ok(adminService.deleteUser(id, adminUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/users/{username}/activity")
    public ResponseEntity<List<AuditLog>> getUserActivity(@PathVariable String username) {
        return ResponseEntity.ok(adminService.getUserActivity(username));
    }

    // 3. Tender & Bid Monitoring
    @GetMapping("/tenders-summary")
    public ResponseEntity<List<Map<String, Object>>> getTendersSummary() {
        return ResponseEntity.ok(adminService.getTendersSummary());
    }

    @GetMapping("/tenders/{tenderId}/bids")
    public ResponseEntity<List<Map<String, Object>>> getTenderBids(@PathVariable Long tenderId) {
        return ResponseEntity.ok(adminService.getTenderBids(tenderId));
    }

    // 4. Verification Logs
    @GetMapping("/verification-logs")
    public ResponseEntity<List<Map<String, Object>>> getVerificationLogs(
            @RequestParam(required = false, defaultValue = "ALL") String filter
    ) {
        return ResponseEntity.ok(adminService.getVerificationLogs(filter));
    }

    // 5. Risk & Fraud Detection
    @GetMapping("/fraud-alerts")
    public ResponseEntity<Map<String, Object>> getFraudAlerts() {
        return ResponseEntity.ok(adminService.getFraudAlerts());
    }

    // 6. Analytics & Reports
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(adminService.getAnalytics());
    }

    // 7. Rule Engine Management
    @GetMapping("/rules")
    public ResponseEntity<List<TenderRule>> getAllRules() {
        return ResponseEntity.ok(adminService.getAllRules());
    }

    @PostMapping("/rules")
    public ResponseEntity<?> createRule(
            @RequestParam Long tenderId,
            @RequestBody DTOs.RuleCreateDto ruleDto
    ) {
        try {
            return ResponseEntity.ok(adminService.createRule(ruleDto, tenderId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/rules/{id}")
    public ResponseEntity<?> updateRule(
            @PathVariable Long id,
            @RequestBody DTOs.RuleCreateDto ruleDto
    ) {
        try {
            return ResponseEntity.ok(adminService.updateRule(id, ruleDto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/rules/{id}")
    public ResponseEntity<?> deleteRule(@PathVariable Long id) {
        try {
            adminService.deleteRule(id);
            return ResponseEntity.ok(Map.of("message", "Rule deleted successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/rules/weights")
    public ResponseEntity<Map<String, Double>> getRuleWeights() {
        return ResponseEntity.ok(adminService.getRuleWeights());
    }

    @PostMapping("/rules/weights")
    public ResponseEntity<Map<String, Double>> updateRuleWeights(@RequestBody Map<String, Double> weights) {
        return ResponseEntity.ok(adminService.updateRuleWeights(weights));
    }

    // 8. Document Monitoring
    @GetMapping("/documents")
    public ResponseEntity<List<Map<String, Object>>> getAllDocuments() {
        return ResponseEntity.ok(adminService.getAllDocuments());
    }

    // 9. Audit Logs & Chain Verification
    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(adminService.getAuditLogs());
    }

    @GetMapping("/audit-logs/verify-chain")
    public ResponseEntity<Map<String, Object>> verifyAuditChain() {
        return ResponseEntity.ok(adminService.verifyAuditChain());
    }

    // 10. Notifications
    @GetMapping("/notifications")
    public ResponseEntity<List<Map<String, Object>>> getNotifications() {
        return ResponseEntity.ok(adminService.getNotifications());
    }

    // 11. System Settings
    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSystemSettings() {
        return ResponseEntity.ok(adminService.getSystemSettings());
    }

    @PostMapping("/settings")
    public ResponseEntity<Map<String, Object>> updateSystemSettings(
            @RequestBody Map<String, Object> settings,
            Authentication auth
    ) {
        String adminUser = auth != null ? auth.getName() : "admin";
        return ResponseEntity.ok(adminService.updateSystemSettings(settings, adminUser));
    }
}
