package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "gem_tenders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tender {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_tenders_seq")
    @SequenceGenerator(name = "gem_tenders_seq", sequenceName = "gem_tenders_seq", allocationSize = 1)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String tenderNumber;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(nullable = false, length = 150)
    private String department;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal estimatedValue;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal minTurnover;

    @Column(nullable = false, precision = 5, scale = 1)
    private BigDecimal minExperienceYears;

    @Lob
    @Column(name = "required_certs_json", columnDefinition = "LONGTEXT")
    private String requiredCertsJson; // ["ISO-9001", "CMMI-Level-3/5"]

    @Lob
    @Column(name = "required_certificates_json", columnDefinition = "LONGTEXT")
    private String requiredCertificatesJson; // e.g. ["DSC_CERTIFICATE", "PAN_CARD", "GST_CERTIFICATE", ...]

    @Column(nullable = false)
    private LocalDateTime submissionDeadline;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, UNDER_EVALUATION, CLOSED

    @Column(length = 50)
    private String createdBy;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "tender", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<TenderRule> rules = new ArrayList<>();
}
