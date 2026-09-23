package com.gem.procurement.repository;

import com.gem.procurement.model.entity.TaxpayerRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TaxpayerRegistryRepository extends JpaRepository<TaxpayerRegistry, Long> {

    Optional<TaxpayerRegistry> findByPan(String pan);

    boolean existsByPan(String pan);

    Optional<TaxpayerRegistry> findByGstin(String gstin);

    @Query("SELECT CASE WHEN COUNT(t) > 0 THEN TRUE ELSE FALSE END FROM TaxpayerRegistry t WHERE (t.pan = :pan OR t.gstin = :gstin) AND t.isDebarred = true")
    Boolean isDebarred(@Param("pan") String pan, @Param("gstin") String gstin);

    @Query("SELECT t FROM TaxpayerRegistry t WHERE (t.pan = :pan OR t.gstin = :gstin) AND t.isDebarred = true")
    Optional<TaxpayerRegistry> findDebarredRecord(@Param("pan") String pan, @Param("gstin") String gstin);
}
