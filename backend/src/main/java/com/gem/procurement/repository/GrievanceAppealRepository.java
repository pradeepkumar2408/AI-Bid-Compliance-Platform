package com.gem.procurement.repository;

import com.gem.procurement.model.entity.GrievanceAppeal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GrievanceAppealRepository extends JpaRepository<GrievanceAppeal, Long> {
    List<GrievanceAppeal> findByBidId(Long bidId);
    List<GrievanceAppeal> findByBidderId(String bidderId);
    List<GrievanceAppeal> findByStatus(String status);
}
