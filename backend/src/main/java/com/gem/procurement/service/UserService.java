package com.gem.procurement.service;

import com.gem.procurement.config.JwtTokenProvider;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.User;
import com.gem.procurement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public DTOs.AuthResponse authenticate(DTOs.AuthRequest request) {
        String identifier = request.getEmail() != null && !request.getEmail().trim().isEmpty()
                ? request.getEmail().trim()
                : (request.getUsername() != null ? request.getUsername().trim() : "");

        if (identifier.isEmpty() || request.getPassword() == null || request.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Email and password are required");
        }

        String prefix = identifier.contains("@") ? identifier.split("@")[0] : identifier;
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .or(() -> userRepository.findByUsername(prefix))
                .or(() -> userRepository.findByEmail(prefix + "@gem.gov.in"))
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if ("BLOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalArgumentException("Account is suspended / blocked by the GeM Administrator. Please contact support.");
        }

        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole());

        return DTOs.AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole())
                .organizationName(user.getOrganizationName())
                .pan(user.getPan())
                .gstin(user.getGstin())
                .build();
    }

    private final IdentityVerificationService identityVerificationService;

    public User register(DTOs.RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Official email address is required");
        }
        String email = request.getEmail().trim();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with email '" + email + "' already exists.");
        }

        String assignedRole = request.getRole() != null ? request.getRole() : "ROLE_BIDDER";
        if ("ROLE_ADMIN".equalsIgnoreCase(assignedRole) && !"admin@gem.gov.in".equalsIgnoreCase(email)) {
            assignedRole = "ROLE_BIDDER";
        }

        String username;
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            username = request.getUsername().trim();
        } else if ("ROLE_BIDDER".equalsIgnoreCase(assignedRole) && request.getOrganizationName() != null && !request.getOrganizationName().trim().isEmpty()) {
            // Use Organization Name as the username for Bidders
            username = request.getOrganizationName().trim();
        } else {
            username = email.split("@")[0];
        }

        // Ensure username uniqueness
        String baseUsername = username;
        int count = 1;
        while (userRepository.existsByUsername(username)) {
            username = baseUsername + "_" + (++count);
        }

        String pan = request.getPan() != null ? request.getPan().trim().toUpperCase() : null;
        String gstin = request.getGstin() != null ? request.getGstin().trim().toUpperCase() : null;
        boolean isVerified = false;

        if ("ROLE_BIDDER".equalsIgnoreCase(assignedRole)) {
            if (pan == null || pan.isEmpty() || gstin == null || gstin.isEmpty()) {
                throw new IllegalArgumentException("Company PAN and GSTIN are mandatory for Vendor/Bidder registration.");
            }

            DTOs.TaxVerifyResponse taxCheck = identityVerificationService.verifyTaxIdentity(
                    request.getOrganizationName(), pan, gstin);

            isVerified = "REAL_AND_VERIFIED".equalsIgnoreCase(taxCheck.getOverallStatus()) || "VERIFIED".equalsIgnoreCase(taxCheck.getOverallStatus());

            if (!isVerified) {
                throw new IllegalArgumentException("Registration Rejected: Tax Identity could not be verified as REAL & ACTIVE. " + taxCheck.getMessage());
            }
        }

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(email)
                .role(assignedRole)
                .organizationName(request.getOrganizationName())
                .pan(pan)
                .gstin(gstin)
                .isIdentityVerified(isVerified)
                .build();

        return userRepository.save(user);
    }

    public void resetPassword(String identifier, String newPassword) {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new IllegalArgumentException("Email address is required");
        }
        String cleanId = identifier.trim();

        User user = userRepository.findByEmail(cleanId)
                .or(() -> userRepository.findByUsername(cleanId))
                .orElseThrow(() -> new IllegalArgumentException("No registered account found with email '" + cleanId + "'"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
