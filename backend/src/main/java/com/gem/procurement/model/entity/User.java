package com.gem.procurement.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "gem_users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "gem_users_seq")
    @SequenceGenerator(name = "gem_users_seq", sequenceName = "gem_users_seq", allocationSize = 1)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 255)
    private String passwordHash;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 30)
    private String role; // ROLE_OFFICER, ROLE_BIDDER, ROLE_ADMIN

    @Column(length = 150)
    private String organizationName;

    @Column(length = 10)
    private String pan;

    @Column(length = 15)
    private String gstin;

    @Column(name = "is_identity_verified")
    @Builder.Default
    private Boolean isIdentityVerified = false;

    @Column(length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, BLOCKED, PENDING

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
