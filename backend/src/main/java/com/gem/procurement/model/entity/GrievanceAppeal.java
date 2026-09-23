package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gem_grievance_appeals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GrievanceAppeal {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_grievance_appeals_seq")
    @SequenceGenerator(name = "gem_grievance_appeals_seq", sequenceName = "gem_grievance_appeals_seq", allocationSize = 1)
    private Long id;

    @Column(nullable = false)
    private Long bidId;

    @Column(nullable = false, length = 50)
    private String bidderId;

    @Lob
    @Column(name = "appeal_reason", nullable = false, columnDefinition = "LONGTEXT")
    private String appealReason;

    @Column(length = 500)
    private String additionalEvidencePath;

    @Lob
    @Column(name = "officer_response", columnDefinition = "LONGTEXT")
    private String officerResponse;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
