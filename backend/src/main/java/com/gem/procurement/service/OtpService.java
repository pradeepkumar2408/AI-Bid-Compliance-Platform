package com.gem.procurement.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final EmailService emailService;
    private final Map<String, OtpEntry> otpCache = new ConcurrentHashMap<>();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int EXPIRATION_MINUTES = 10;

    @Data
    @AllArgsConstructor
    public static class OtpEntry {
        private String otp;
        private LocalDateTime expiresAt;
        private int attempts;
    }

    public static class OtpGenerationResult {
        private final String otp;
        private final boolean emailSent;

        public OtpGenerationResult(String otp, boolean emailSent) {
            this.otp = otp;
            this.emailSent = emailSent;
        }

        public String getOtp() {
            return otp;
        }

        public boolean isEmailSent() {
            return emailSent;
        }
    }

    /**
     * Generates a 6-digit numeric OTP, saves it in memory with 10-minute expiry, and dispatches an email.
     */
    public OtpGenerationResult generateAndSendOtp(String email) {
        String cleanEmail = email.trim().toLowerCase();
        // Generate a 6-digit random number (100000 - 999999)
        int randomNum = 100000 + RANDOM.nextInt(900000);
        String otp = String.valueOf(randomNum);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(EXPIRATION_MINUTES);

        otpCache.put(cleanEmail, new OtpEntry(otp, expiresAt, 0));
        log.info("OTP generated for [{}]: Code = {}, Expires = {}", cleanEmail, otp, expiresAt);

        boolean sent = emailService.sendOtpEmail(email.trim(), otp);
        return new OtpGenerationResult(otp, sent);
    }

    /**
     * Validates the OTP for the given email address.
     */
    public boolean verifyOtp(String email, String inputOtp) {
        if (email == null || inputOtp == null || inputOtp.trim().isEmpty()) {
            return false;
        }

        String cleanEmail = email.trim().toLowerCase();
        OtpEntry entry = otpCache.get(cleanEmail);

        if (entry == null) {
            log.warn("Verification failed: No OTP found for email [{}]", cleanEmail);
            return false;
        }

        if (LocalDateTime.now().isAfter(entry.getExpiresAt())) {
            otpCache.remove(cleanEmail);
            log.warn("Verification failed: OTP expired for email [{}]", cleanEmail);
            return false;
        }

        if (!entry.getOtp().equals(inputOtp.trim())) {
            entry.setAttempts(entry.getAttempts() + 1);
            if (entry.getAttempts() >= 5) {
                otpCache.remove(cleanEmail);
                log.warn("Maximum OTP attempts exceeded for email [{}]", cleanEmail);
            }
            return false;
        }

        // Successfully verified; remove OTP from cache
        otpCache.remove(cleanEmail);
        return true;
    }
}
