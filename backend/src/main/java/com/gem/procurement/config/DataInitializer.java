package com.gem.procurement.config;

import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.*;
import com.gem.procurement.repository.*;
import com.gem.procurement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final UserService userService;
    private final TaxpayerRegistryRepository taxpayerRegistryRepository;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("[DataInitializer] Checking baseline configuration and master registry...");

        // 1. Seed Master Taxpayer & Debarred Registry in Database (for PAN/GSTIN verification)
        List<TaxpayerRegistry> defaultRegistry = Arrays.asList(
                TaxpayerRegistry.builder().pan("AAICA3918J").gstin("33AAICA3918J1C0").legalName("Amazon Seller Services Private Limited").tradeName("Amazon").category("COMPANY").status("ACTIVE").jurisdiction("Tamil Nadu").isDebarred(false).build(),
                TaxpayerRegistry.builder().pan("AAACB1234F").gstin("07AAACB1234F1Z5").legalName("Bharat Tech Solutions Pvt Ltd").tradeName("Bharat Tech Solutions").category("COMPANY").status("ACTIVE").jurisdiction("Delhi").isDebarred(false).build(),
                TaxpayerRegistry.builder().pan("BBBCB5678G").gstin("27BBBCB5678G1Z8").legalName("Apex Global Infrastructure").tradeName("Apex Global").category("COMPANY").status("ACTIVE").jurisdiction("Maharashtra").isDebarred(false).build(),
                TaxpayerRegistry.builder().pan("CCCDE9012H").gstin("29CCCDE9012H1Z1").legalName("Quantum Infotech Systems").tradeName("Quantum Infotech").category("COMPANY").status("ACTIVE").jurisdiction("Karnataka").isDebarred(false).build(),
                TaxpayerRegistry.builder().pan("ETGCD8451J").gstin("07ETGCD8451J1Z3").legalName("Eastern Trans-Grid Corporation Ltd").tradeName("Eastern Trans-Grid").category("COMPANY").status("ACTIVE").jurisdiction("Delhi").isDebarred(false).build(),
                TaxpayerRegistry.builder().pan("AAGFA1056Q").gstin("33AAGFA1056Q1ZE").legalName("Pradeep Tech").tradeName("Pradeep Tech").category("FIRM").status("ACTIVE").jurisdiction("Tamil Nadu").isDebarred(false).build(),
                TaxpayerRegistry.builder().pan("AAACT2727Q").gstin("27AAACT2727Q1ZW").legalName("Tata Consultancy Services Limited").tradeName("TCS").category("COMPANY").status("ACTIVE").jurisdiction("Maharashtra").isDebarred(false).build(),
                TaxpayerRegistry.builder().pan("AAACI4747K").gstin("29AAACI4747K1Z4").legalName("Infosys Limited").tradeName("Infosys").category("COMPANY").status("ACTIVE").jurisdiction("Karnataka").isDebarred(false).build(),
                // Debarred Records for compliance checks
                TaxpayerRegistry.builder().pan("FRAUD1111A").gstin("07ABCDE1234F1Z5").legalName("Debarred Associates LLP").tradeName("Debarred Associates").category("LLP").status("SUSPENDED").jurisdiction("Delhi").isDebarred(true).debarmentAgency("GeM / CVC Central Debarred Registry").debarmentReason("Debarred under GFR Rule 151 for past procurement violations.").build(),
                TaxpayerRegistry.builder().pan("ABCDE1234F").gstin("07ABCDE1234F1Z5").legalName("Debarred Entity A").tradeName("Debarred Entity A").category("COMPANY").status("SUSPENDED").jurisdiction("Delhi").isDebarred(true).debarmentAgency("GeM / CVC Central Debarred Registry").debarmentReason("Debarred for non-compliance with technical tender specifications.").build(),
                TaxpayerRegistry.builder().pan("XYZDE9999K").gstin("27XYZDE9999K1Z2").legalName("Blacklisted Vendor Corp").tradeName("Blacklisted Vendor").category("COMPANY").status("SUSPENDED").jurisdiction("Maharashtra").isDebarred(true).debarmentAgency("GeM / CVC Central Debarred Registry").debarmentReason("Debarred under CVC circular for tender rigging.").build()
        );

        for (TaxpayerRegistry rec : defaultRegistry) {
            if (!taxpayerRegistryRepository.existsByPan(rec.getPan())) {
                taxpayerRegistryRepository.save(rec);
            }
        }

        // 2. Ensure Clean Base Accounts exist if empty
        if (!userRepository.existsByEmail("admin@gem.gov.in")) {
            userService.register(DTOs.RegisterRequest.builder()
                    .username("admin").password("admin123").email("admin@gem.gov.in").role("ROLE_ADMIN").organizationName("GeM Procurement Authority").build());
        }
        if (!userRepository.existsByEmail("officer@gem.gov.in")) {
            userService.register(DTOs.RegisterRequest.builder()
                    .username("officer").password("officer123").email("officer@gem.gov.in").role("ROLE_OFFICER").organizationName("Ministry of Electronics & IT (MeitY)").build());
        }
        if (!userRepository.existsByEmail("bidder@gem.gov.in")) {
            userService.register(DTOs.RegisterRequest.builder()
                    .username("bidder1").password("bidder123").email("bidder@gem.gov.in").role("ROLE_BIDDER").organizationName("Bharat Tech Solutions Pvt Ltd").pan("AAACB1234F").gstin("07AAACB1234F1Z5").build());
        }

        System.out.println("[DataInitializer] Procurement environment initialized successfully.");
    }
}
