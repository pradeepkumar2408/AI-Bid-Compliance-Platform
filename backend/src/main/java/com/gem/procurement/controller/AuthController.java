package com.gem.procurement.controller;

import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.User;
import com.gem.procurement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;
    private final com.gem.procurement.service.IdentityVerificationService identityVerificationService;

    @PostMapping("/verify-identity")
    public ResponseEntity<?> verifyIdentity(@RequestBody DTOs.TaxVerifyRequest request) {
        try {
            DTOs.TaxVerifyResponse response = identityVerificationService.verifyTaxIdentity(
                    request.getEntityName(), request.getPan(), request.getGstin());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error verifying identity: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody DTOs.AuthRequest request) {
        try {
            DTOs.AuthResponse response = userService.authenticate(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody DTOs.RegisterRequest request) {
        try {
            User user = userService.register(request);
            return ResponseEntity.ok(user);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<?> sendForgotPasswordOtp(@RequestBody DTOs.ForgotPasswordOtpRequest request) {
        try {
            DTOs.ForgotPasswordOtpResponse response = userService.sendForgotPasswordOtp(request.getEmail());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error sending OTP: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password/verify-reset")
    public ResponseEntity<?> verifyOtpAndResetPassword(@RequestBody DTOs.ForgotPasswordResetRequest request) {
        try {
            userService.verifyOtpAndResetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
            return ResponseEntity.ok("Password has been successfully changed! You may now sign in with your new password.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error resetting password: " + e.getMessage());
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody DTOs.AuthRequest request) {
        try {
            String identifier = request.getEmail() != null && !request.getEmail().trim().isEmpty()
                    ? request.getEmail().trim()
                    : request.getUsername();
            userService.resetPassword(identifier, request.getPassword());
            return ResponseEntity.ok("Password reset successfully. You may now log in with your new password.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
