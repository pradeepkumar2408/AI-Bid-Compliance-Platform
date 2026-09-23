package com.gem.procurement.repository;

import com.gem.procurement.model.entity.BidSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BidSubmissionRepository extends JpaRepository<BidSubmission, Long> {
    List<BidSubmission> findByTenderId(Long tenderId);
    List<BidSubmission> findByBidderId(String bidderId);
    Optional<BidSubmission> findByBidNumber(String bidNumber);

    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN TRUE ELSE FALSE END FROM BidSubmission b WHERE b.tenderId = :tenderId AND (b.bidderId = :bidderId OR (:pan <> '' AND b.pan = :pan))")
    boolean existsByTenderIdAndBidderIdOrPan(@Param("tenderId") Long tenderId, @Param("bidderId") String bidderId, @Param("pan") String pan);
}
