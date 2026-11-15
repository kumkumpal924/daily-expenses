package com.expensetracker.repository;

import com.expensetracker.entity.ExpenseTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<ExpenseTransaction, Long> {
    List<ExpenseTransaction> findByUserId(Long userId);
    Optional<ExpenseTransaction> findByIdAndUserId(Long id, Long userId);
    long countByUserId(Long userId);

    @Query("select sum(e.amount) from ExpenseTransaction e where e.userId = :uid")
    Double sumByUserId(@Param("uid") Long uid);

    @Transactional
    void deleteByUserId(Long userId);

    @Modifying
    @Transactional
    @Query("update ExpenseTransaction e set e.userId = :uid where e.userId is null")
    int assignOrphans(@Param("uid") Long uid);
}
