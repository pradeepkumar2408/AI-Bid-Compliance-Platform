package com.gem.procurement.repository;

import com.gem.procurement.model.entity.ComplianceScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComplianceScoreRepository extends JpaRepository<ComplianceScore, Long> {
    Optional<ComplianceScore> findByBidId(Long bidId);
    List<ComplianceScore> findByTenderIdOrderByTotalScoreDesc(Long tenderId);
}
