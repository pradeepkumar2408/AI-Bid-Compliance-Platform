package com.gem.procurement.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class DTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthRequest {
        private String email;
        private String username;
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AuthResponse {
        private String token;
        private String email;
        private String username;
        private String role;
        private String organizationName;
        private String pan;
        private String gstin;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RegisterRequest {
        private String username;
        private String password;
        private String email;
        private String role; // ROLE_OFFICER, ROLE_BIDDER, ROLE_ADMIN
        private String organizationName;
        private String pan;
        private String gstin;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TaxVerifyRequest {
        private String entityName;
        private String pan;
        private String gstin;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TaxVerifyResponse {
        private String pan;
        private Boolean isPanValid;
        private Boolean isPanReal;
        private String panStatus; // REAL_AND_ACTIVE, FAKE_UNREGISTERED, DEBARRED, SUSPICIOUS
        private String panTaxpayerName;
        private String panCategory;
        private String itdVerificationRef;

        private String gstin;
        private Boolean isGstinValid;
        private Boolean isGstinReal;
        private String gstinStatus; // REAL_AND_ACTIVE, FAKE_UNREGISTERED, DEBARRED, SUSPICIOUS
        private String gstLegalName;
        private String gstTradeName;
        private String gstnVerificationRef;

        private Boolean panGstMatched;
        private Boolean isNameMatched;
        private String nameMatchStatus; // MATCHED, MISMATCH, NOT_VERIFIABLE
        private Double nameMatchScore; // Percentage 0-100
        private String nameMismatchDetails;

        private Boolean isDebarred;
        private String debarmentAgency;
        private String debarmentReason;
        private String overallStatus; // REAL_AND_VERIFIED, FAKE_OR_UNREGISTERED, BLACKLISTED, SUSPICIOUS, NAME_MISMATCH
        private String message;
        private String apiSource;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TenderCreateRequest {
        private String tenderNumber;
        private String title;
        private String department;
        private String category;
        private BigDecimal estimatedValue;
        private BigDecimal minTurnover;
        private BigDecimal minExperienceYears;
        private List<String> requiredCertifications;
        private List<Object> requiredCertificates;
        private LocalDateTime submissionDeadline;
        private List<RuleCreateDto> customRules;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RuleCreateDto {
        private String ruleName;
        private String ruleCategory;
        private String conditionExpression;
        private Double weight;
        private Boolean isMandatory;
        private String passCriterion;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BidSubmitRequest {
        private Long tenderId;
        private String bidderName;
        private String pan;
        private String gstin;
        private BigDecimal declaredTurnover;
        private BigDecimal declaredExperience;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DecisionRequest {
        private String decision; // ACCEPTED, REJECTED, REQUEST_CLARIFICATION
        private Boolean officerOverride;
        private String writtenJustification;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AppealRequest {
        private String appealReason;
        private String additionalEvidence;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AppealResolveRequest {
        private String status; // APPROVED, REJECTED
        private String officerResponse;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ForgotPasswordOtpRequest {
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ForgotPasswordResetRequest {
        private String email;
        private String otp;
        private String newPassword;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ForgotPasswordOtpResponse {
        private boolean success;
        private String message;
        private String email;
        private String otp;
        private boolean emailSent;
    }
}
