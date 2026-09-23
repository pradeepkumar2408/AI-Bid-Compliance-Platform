package com.gem.procurement.repository;

import com.gem.procurement.model.entity.TenderRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TenderRuleRepository extends JpaRepository<TenderRule, Long> {
    List<TenderRule> findByTenderId(Long tenderId);
}
