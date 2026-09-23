package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "gem_taxpayer_registry")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxpayerRegistry {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_taxpayer_reg_seq")
    @SequenceGenerator(name = "gem_taxpayer_reg_seq", sequenceName = "gem_taxpayer_reg_seq", allocationSize = 1)
    private Long id;

    @Column(unique = true, nullable = false, length = 10)
    private String pan;

    @Column(length = 15)
    private String gstin;

    @Column(nullable = false, length = 200)
    private String legalName;

    @Column(length = 200)
    private String tradeName;

    @Column(length = 50)
    private String category; // COMPANY, FIRM, INDIVIDUAL, LLP, TRUST

    @Column(length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, SUSPENDED

    @Column(length = 100)
    private String jurisdiction;

    @Column(name = "is_debarred")
    @Builder.Default
    private Boolean isDebarred = false;

    @Column(name = "debarment_agency", length = 150)
    private String debarmentAgency;

    @Column(name = "debarment_reason", length = 500)
    private String debarmentReason;
}
