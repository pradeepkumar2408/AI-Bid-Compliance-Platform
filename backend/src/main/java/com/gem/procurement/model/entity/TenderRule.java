package com.gem.procurement.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "gem_tender_rules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenderRule {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_tender_rules_seq")
    @SequenceGenerator(name = "gem_tender_rules_seq", sequenceName = "gem_tender_rules_seq", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tender_id", nullable = false)
    @JsonIgnore
    private Tender tender;

    @Column(nullable = false, length = 100)
    private String ruleName;

    @Column(nullable = false, length = 50)
    private String ruleCategory;

    @Column(nullable = false, length = 255)
    private String conditionExpression;

    @Column(name = "rule_weight")
    @Builder.Default
    private Double weight = 1.0;

    @Column(nullable = false, name = "is_mandatory")
    @Builder.Default
    private Boolean isMandatory = true;

    @Column(length = 255)
    private String passCriterion;
}
