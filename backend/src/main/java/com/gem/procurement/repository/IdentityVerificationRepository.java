package com.gem.procurement.repository;

import com.gem.procurement.model.entity.IdentityVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface IdentityVerificationRepository extends JpaRepository<IdentityVerification, Long> {
    Optional<IdentityVerification> findByBidId(Long bidId);
}
