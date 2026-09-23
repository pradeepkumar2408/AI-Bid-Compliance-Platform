package com.gem.procurement.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gem.procurement.model.dto.DTOs;
import com.gem.procurement.model.entity.Tender;
import com.gem.procurement.model.entity.TenderRule;
import com.gem.procurement.repository.TenderRepository;
import com.gem.procurement.repository.TenderRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TenderService {

    private final TenderRepository tenderRepository;
    private final TenderRuleRepository tenderRuleRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public List<Tender> getAllTenders() {
        return tenderRepository.findAll();
    }

    public Optional<Tender> getTenderById(Long id) {
        return tenderRepository.findById(id);
    }

    @Transactional
    public Tender createTender(DTOs.TenderCreateRequest request, String createdBy) {
        try {
            String certsJson = objectMapper.writeValueAsString(
                    request.getRequiredCertifications() != null ? request.getRequiredCertifications() : new ArrayList<>()
            );
            String reqCertificatesJson = objectMapper.writeValueAsString(
                    request.getRequiredCertificates() != null ? request.getRequiredCertificates() : new ArrayList<>()
            );

            Tender tender = Tender.builder()
                    .tenderNumber(request.getTenderNumber() != null ? request.getTenderNumber() : "GEM-" + System.currentTimeMillis())
                    .title(request.getTitle())
                    .department(request.getDepartment())
                    .category(request.getCategory())
                    .estimatedValue(request.getEstimatedValue())
                    .minTurnover(request.getMinTurnover())
                    .minExperienceYears(request.getMinExperienceYears())
                    .requiredCertsJson(certsJson)
                    .requiredCertificatesJson(reqCertificatesJson)
                    .submissionDeadline(request.getSubmissionDeadline() != null ? request.getSubmissionDeadline() : LocalDateTime.now().plusDays(30))
                    .status("ACTIVE")
                    .createdBy(createdBy)
                    .createdAt(LocalDateTime.now())
                    .build();

            Tender savedTender = tenderRepository.save(tender);

            // Create baseline rules
            List<TenderRule> rules = new ArrayList<>();
            rules.add(TenderRule.builder()
                    .tender(savedTender)
                    .ruleName("Annual Turnover Requirement")
                    .ruleCategory("TURNOVER")
                    .conditionExpression("turnover >= " + request.getMinTurnover())
                    .weight(1.0)
                    .isMandatory(true)
                    .passCriterion("Turnover >= ₹" + request.getMinTurnover())
                    .build());

            rules.add(TenderRule.builder()
                    .tender(savedTender)
                    .ruleName("Technical Experience Standing")
                    .ruleCategory("EXPERIENCE")
                    .conditionExpression("experienceYears >= " + request.getMinExperienceYears())
                    .weight(1.0)
                    .isMandatory(true)
                    .passCriterion("Experience >= " + request.getMinExperienceYears() + " Years")
                    .build());

            if (request.getCustomRules() != null) {
                for (DTOs.RuleCreateDto cr : request.getCustomRules()) {
                    rules.add(TenderRule.builder()
                            .tender(savedTender)
                            .ruleName(cr.getRuleName())
                            .ruleCategory(cr.getRuleCategory())
                            .conditionExpression(cr.getConditionExpression())
                            .weight(cr.getWeight() != null ? cr.getWeight() : 1.0)
                            .isMandatory(cr.getIsMandatory() != null ? cr.getIsMandatory() : true)
                            .passCriterion(cr.getPassCriterion())
                            .build());
                }
            }

            tenderRuleRepository.saveAll(rules);
            savedTender.setRules(rules);

            // Audit log
            auditService.logEvent(
                    "TENDER_CREATED",
                    "TENDER",
                    savedTender.getId().toString(),
                    createdBy,
                    "ADMIN",
                    "New Tender published with baseline Drools eligibility rules: " + savedTender.getTenderNumber(),
                    null,
                    objectMapper.writeValueAsString(savedTender)
            );

            return savedTender;
        } catch (Exception e) {
            throw new RuntimeException("Error creating tender: " + e.getMessage(), e);
        }
    }
}
