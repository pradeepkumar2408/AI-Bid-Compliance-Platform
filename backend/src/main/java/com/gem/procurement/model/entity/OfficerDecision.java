package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gem_officer_decisions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfficerDecision {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_officer_decisions_seq")
    @SequenceGenerator(name = "gem_officer_decisions_seq", sequenceName = "gem_officer_decisions_seq", allocationSize = 1)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long bidId;

    @Column(nullable = false)
    private Long tenderId;

    @Column(nullable = false, length = 50)
    private String officerId;

    @Column(nullable = false, length = 30)
    private String decision;

    @Column(name = "ai_score")
    private Double aiScore;

    @Column(name = "officer_override")
    @Builder.Default
    private Boolean officerOverride = false;

    @Lob
    @Column(name = "written_justification", columnDefinition = "LONGTEXT")
    private String writtenJustification;

    @Column(name = "decided_at")
    @Builder.Default
    private LocalDateTime decidedAt = LocalDateTime.now();
}
