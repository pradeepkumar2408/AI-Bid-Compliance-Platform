package com.gem.procurement.service;

import com.gem.procurement.model.entity.AuditLog;
import com.gem.procurement.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public AuditLog logEvent(String eventType, String entityType, String entityId, 
                             String actorUsername, String actorRole, String description, 
                             String previousStateJson, String newStateJson) {
        
        Optional<AuditLog> latestLog = auditLogRepository.findLatestLog();
        String previousHash = latestLog.map(AuditLog::getIntegrityHash).orElse("0000000000000000000000000000000000000000000000000000000000000000");

        LocalDateTime now = LocalDateTime.now();
        String payloadToHash = previousHash + "|" + eventType + "|" + entityType + "|" + entityId + "|" + 
                               actorUsername + "|" + actorRole + "|" + description + "|" + 
                               (previousStateJson != null ? previousStateJson : "") + "|" + 
                               (newStateJson != null ? newStateJson : "") + "|" + now.toString();

        String integrityHash = DigestUtils.sha256Hex(payloadToHash);

        AuditLog auditLog = AuditLog.builder()
                .eventType(eventType)
                .entityType(entityType)
                .entityId(entityId)
                .actorUsername(actorUsername)
                .actorRole(actorRole)
                .actionDescription(description)
                .previousStateJson(previousStateJson)
                .newStateJson(newStateJson)
                .previousHash(previousHash)
                .integrityHash(integrityHash)
                .timestamp(now)
                .build();

        return auditLogRepository.save(auditLog);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findTop100ByOrderByTimestampDesc();
    }

    public List<AuditLog> getLogsForEntity(String entityId) {
        return auditLogRepository.findByEntityIdOrderByTimestampAsc(entityId);
    }
}
