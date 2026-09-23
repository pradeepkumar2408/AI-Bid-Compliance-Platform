package com.gem.procurement.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "gem_bid_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BidDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_bid_documents_seq")
    @SequenceGenerator(name = "gem_bid_documents_seq", sequenceName = "gem_bid_documents_seq", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bid_id", nullable = false)
    @JsonIgnore
    private BidSubmission bidSubmission;

    @Column(nullable = false, length = 50)
    private String documentType;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(nullable = false, length = 500)
    private String storagePath;

    @Column(nullable = false, length = 64)
    private String fileHash;

    @Lob
    @Column(name = "ocr_text", columnDefinition = "LONGTEXT")
    private String ocrText;

    @Column(precision = 18, scale = 2)
    private BigDecimal extractedTurnover;

    @Column(precision = 5, scale = 1)
    private BigDecimal extractedExperience;

    @Lob
    @Column(name = "extracted_certs_json", columnDefinition = "LONGTEXT")
    private String extractedCertsJson;

    @Column(nullable = false, name = "is_tampered")
    @Builder.Default
    private Boolean isTampered = false;

    @Column(name = "tamper_score")
    @Builder.Default
    private Double tamperScore = 0.0;

    @Column(length = 500)
    private String tamperReason;

    @Lob
    @Column(name = "ela_image_base64", columnDefinition = "LONGTEXT")
    private String elaImageBase64;

    @Column(nullable = false, name = "is_duplicate")
    @Builder.Default
    private Boolean isDuplicate = false;

    @Column(length = 50)
    private String duplicateMatchedBidder;

    @Column(length = 50)
    @Builder.Default
    private String validationStatus = "VALID"; // VALID | INVALID

    @Column(length = 100)
    private String detectedCategory;

    @Column(name = "confidence_score")
    @Builder.Default
    private Double confidenceScore = 0.0;

    @Column(length = 500)
    private String rejectionReason;
}
