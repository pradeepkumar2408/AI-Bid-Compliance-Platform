package com.gem.procurement.repository;

import com.gem.procurement.model.entity.BidDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BidDocumentRepository extends JpaRepository<BidDocument, Long> {
    List<BidDocument> findByBidSubmissionId(Long bidId);
    Optional<BidDocument> findByFileHash(String fileHash);
}
