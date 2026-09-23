package com.gem.procurement.rules;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleEvaluationResult {
    private String ruleCode;
    private String ruleName;
    private String category;
    private Boolean passed;
    private String message;
    private Double scoreImpact;
    private Boolean isMandatory;
}
