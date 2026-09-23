package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gem_identity_verifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IdentityVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_identity_verifications_seq")
    @SequenceGenerator(name = "gem_identity_verifications_seq", sequenceName = "gem_identity_verifications_seq", allocationSize = 1)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long bidId;

    @Column(nullable = false, length = 10)
    private String pan;

    @Column(nullable = false, length = 30)
    private String panStatus;

    @Column(length = 150)
    private String panHolderName;

    @Column(name = "pan_verification_date")
    @Builder.Default
    private LocalDateTime panVerificationDate = LocalDateTime.now();

    @Column(nullable = false, length = 15)
    private String gstin;

    @Column(nullable = false, length = 30, name = "gst_status")
    private String gstStatus;

    @Column(length = 150)
    private String gstLegalName;

    @Column(name = "name_mismatch_flag")
    @Builder.Default
    private Boolean nameMismatchFlag = false;

    @Column(name = "is_debarred")
    @Builder.Default
    private Boolean isDebarred = false;

    @Column(length = 100)
    private String debarmentAgency;

    @Column(length = 255)
    private String debarmentReason;

    @Column(nullable = false, length = 30)
    private String overallIdentityStatus;
}
