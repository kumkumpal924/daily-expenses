package com.expensetracker.service;

import com.expensetracker.entity.ExpenseTransaction;
import com.expensetracker.repository.TransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public class TransactionService {
    private final TransactionRepository repository;
    public TransactionService(TransactionRepository repository) { this.repository = repository; }

    public List<ExpenseTransaction> getAllExpenses(Long userId) { return repository.findByUserId(userId); }

    public ExpenseTransaction getExpenseById(Long id, Long userId) {
        return repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
    }

    public ExpenseTransaction addExpense(Long userId, ExpenseTransaction expense) {
        validate(expense);
        expense.setId(null);
        expense.setUserId(userId);
        return repository.save(expense);
    }

    public ExpenseTransaction updateExpense(Long id, Long userId, ExpenseTransaction expense) {
        validate(expense);
        ExpenseTransaction existing = getExpenseById(id, userId);
        existing.setTitle(expense.getTitle());
        existing.setCategory(expense.getCategory());
        existing.setAmount(expense.getAmount());
        existing.setDate(expense.getDate());
        existing.setDescription(expense.getDescription());
        existing.setPaymentMethod(expense.getPaymentMethod());
        return repository.save(existing);
    }

    public void deleteExpense(Long id, Long userId) { repository.delete(getExpenseById(id, userId)); }

    public double getTotal(Long userId) {
        return repository.findByUserId(userId).stream().mapToDouble(ExpenseTransaction::getAmount).sum();
    }

    public double getMonthlyTotal(Long userId) {
        YearMonth month = YearMonth.now();
        return repository.findByUserId(userId).stream()
                .filter(e -> e.getDate() != null && YearMonth.from(e.getDate()).equals(month))
                .mapToDouble(ExpenseTransaction::getAmount).sum();
    }

    private void validate(ExpenseTransaction e) {
        if (e.getTitle() == null || e.getTitle().isBlank()) throw new IllegalArgumentException("Title is required");
        if (e.getTitle().length() > 120) throw new IllegalArgumentException("Title is too long (max 120 characters)");
        if (e.getCategory() == null || e.getCategory().isBlank()) throw new IllegalArgumentException("Category is required");
        if (e.getCategory().length() > 60) throw new IllegalArgumentException("Category is too long");
        if (e.getAmount() <= 0 || !Double.isFinite(e.getAmount())) throw new IllegalArgumentException("Amount must be greater than zero");
        if (e.getDescription() != null && e.getDescription().length() > 500) throw new IllegalArgumentException("Description is too long (max 500 characters)");
        if (e.getPaymentMethod() != null && e.getPaymentMethod().length() > 30) throw new IllegalArgumentException("Payment method is too long");
        if (e.getDate() == null) e.setDate(LocalDate.now());
    }
}
