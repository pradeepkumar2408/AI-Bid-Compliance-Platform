package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gem_audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_audit_logs_seq")
    @SequenceGenerator(name = "gem_audit_logs_seq", sequenceName = "gem_audit_logs_seq", allocationSize = 1)
    private Long id;

    @Column(nullable = false, length = 50)
    private String eventType;

    @Column(nullable = false, length = 50)
    private String entityType;

    @Column(nullable = false, length = 50)
    private String entityId;

    @Column(nullable = false, length = 50)
    private String actorUsername;

    @Column(nullable = false, length = 30)
    private String actorRole;

    @Column(nullable = false, length = 500)
    private String actionDescription;

    @Lob
    @Column(name = "previous_state_json", columnDefinition = "LONGTEXT")
    private String previousStateJson;

    @Lob
    @Column(name = "new_state_json", columnDefinition = "LONGTEXT")
    private String newStateJson;

    @Column(nullable = false, length = 64)
    private String integrityHash; // SHA-256 (previousHash + payload)

    @Column(length = 64)
    private String previousHash;

    @Column(name = "timestamp_col")
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
