package com.gem.procurement.rules;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceRuleFact {
    private String bidNumber;
    private String tenderNumber;

    // Financial
    private BigDecimal turnover;
    private BigDecimal minTurnover;

    // Technical Experience
    private BigDecimal experienceYears;
    private BigDecimal minExperienceYears;

    // Certifications
    @Builder.Default
    private List<String> bidderCerts = new ArrayList<>();
    @Builder.Default
    private List<String> requiredCerts = new ArrayList<>();

    // Identity & Integrity
    private Boolean panValid;
    private Boolean gstActive;
    private Boolean nameMatched;
    private Boolean isDebarred;
    private Boolean isTampered;
    private Double tamperScore;
    private Boolean isDuplicate;
    private Boolean hasInvalidDocuments;
    @Builder.Default
    private List<String> invalidDocReasons = new ArrayList<>();

    // Output tracking
    @Builder.Default
    private List<RuleEvaluationResult> evaluationResults = new ArrayList<>();
    
    @Builder.Default
    private boolean eligible = true;

    public void addResult(String ruleCode, String ruleName, String category, boolean passed, String message, double scoreImpact, boolean isMandatory) {
        evaluationResults.add(RuleEvaluationResult.builder()
                .ruleCode(ruleCode)
                .ruleName(ruleName)
                .category(category)
                .passed(passed)
                .message(message)
                .scoreImpact(scoreImpact)
                .isMandatory(isMandatory)
                .build());
        if (!passed && isMandatory) {
            this.eligible = false;
        }
    }
}
