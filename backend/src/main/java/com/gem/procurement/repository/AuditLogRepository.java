package com.gem.procurement.repository;

import com.gem.procurement.model.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop100ByOrderByTimestampDesc();
    List<AuditLog> findByEntityIdOrderByTimestampAsc(String entityId);
    
    @Query(value = "SELECT a FROM AuditLog a ORDER BY a.id DESC")
    List<AuditLog> findLatestLogs();

    default Optional<AuditLog> findLatestLog() {
        List<AuditLog> logs = findLatestLogs();
        return logs.isEmpty() ? Optional.empty() : Optional.of(logs.get(0));
    }
}
