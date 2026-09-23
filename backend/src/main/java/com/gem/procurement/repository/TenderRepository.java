package com.gem.procurement.repository;

import com.gem.procurement.model.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenderRepository extends JpaRepository<Tender, Long> {
    Optional<Tender> findByTenderNumber(String tenderNumber);
    List<Tender> findByStatus(String status);
}
