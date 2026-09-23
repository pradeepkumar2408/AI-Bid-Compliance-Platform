package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gem_compliance_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplianceScore {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_compliance_scores_seq")
    @SequenceGenerator(name = "gem_compliance_scores_seq", sequenceName = "gem_compliance_scores_seq", allocationSize = 1)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long bidId;

    @Column(nullable = false)
    private Long tenderId;

    @Column(nullable = false)
    private Double totalScore;

    @Column(nullable = false, length = 20)
    private String riskLevel;

    @Lob
    @Column(name = "drools_trace_json", columnDefinition = "LONGTEXT")
    private String droolsTraceJson;

    @Lob
    @Column(name = "shap_attribution_json", columnDefinition = "LONGTEXT")
    private String shapAttributionJson;

    @Column(name = "evaluated_at")
    @Builder.Default
    private LocalDateTime evaluatedAt = LocalDateTime.now();
}
