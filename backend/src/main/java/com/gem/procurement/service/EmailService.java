package com.gem.procurement.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    /**
     * Sends an OTP email to the registered email address.
     * If SMTP credentials are configured and valid, dispatches real email via JavaMailSender.
     * Always logs the OTP clearly for development/simulation mode.
     */
    public boolean sendOtpEmail(String toEmail, String otp) {
        log.info("===============================================================================");
        log.info("🔐 [GeM SECURITY] PASSWORD RESET OTP GENERATED");
        log.info("📧 Recipient : {}", toEmail);
        log.info("🔢 OTP Code  : {}", otp);
        log.info("⏰ Validity  : 10 minutes");
        log.info("===============================================================================");

        if (mailSender != null && fromEmail != null && !fromEmail.trim().isEmpty()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(toEmail);
                message.setSubject("GeM Bid Compliance Platform - Password Reset OTP");
                message.setText("Dear User,\n\n"
                        + "You recently requested to reset your password for the Government e-Marketplace (GeM) Bid Compliance Platform.\n\n"
                        + "Your 6-Digit One-Time Password (OTP) is:\n\n"
                        + "       " + otp + "\n\n"
                        + "This verification code is valid for 10 minutes. For security reasons, never share this code with anyone.\n\n"
                        + "If you did not request a password reset, please contact the GeM Administrator immediately.\n\n"
                        + "Warm regards,\n"
                        + "GeM AI Compliance Verification Security Authority");

                mailSender.send(message);
                log.info("✅ Successfully sent real email with OTP to {}", toEmail);
                return true;
            } catch (Exception e) {
                log.warn("⚠️ SMTP dispatch to {} encountered an error: {}. (Simulation OTP active)", toEmail, e.getMessage());
                return false;
            }
        } else {
            log.info("ℹ️ SMTP credentials not configured; local simulation active for {}", toEmail);
            return false;
        }
    }
}
