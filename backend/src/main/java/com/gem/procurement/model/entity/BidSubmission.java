package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "gem_bid_submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BidSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_bid_submissions_seq")
    @SequenceGenerator(name = "gem_bid_submissions_seq", sequenceName = "gem_bid_submissions_seq", allocationSize = 1)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String bidNumber;

    @Column(nullable = false)
    private Long tenderId;

    @Column(nullable = false, length = 50)
    private String bidderId;

    @Column(nullable = false, length = 150)
    private String bidderName;

    @Column(nullable = false, length = 10)
    private String pan;

    @Column(nullable = false, length = 15)
    private String gstin;

    @Column(precision = 18, scale = 2)
    private BigDecimal declaredTurnover;

    @Column(precision = 5, scale = 1)
    private BigDecimal declaredExperience;

    @Column(name = "submission_date")
    @Builder.Default
    private LocalDateTime submissionDate = LocalDateTime.now();

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "RECEIVED";

    @Column(length = 30, name = "appeal_status")
    @Builder.Default
    private String appealStatus = "NONE";

    @OneToMany(mappedBy = "bidSubmission", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<BidDocument> documents = new ArrayList<>();
}
