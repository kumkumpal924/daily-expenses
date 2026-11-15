package com.expensetracker.controller;

import com.expensetracker.entity.ExpenseTransaction;
import com.expensetracker.security.CurrentUser;
import com.expensetracker.service.TransactionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
public class TransactionController {
    private final TransactionService service;
    public TransactionController(TransactionService service) { this.service = service; }

    @GetMapping
    public List<ExpenseTransaction> getAllExpenses(HttpServletRequest req) { return service.getAllExpenses(CurrentUser.id(req)); }

    @GetMapping("/{id}")
    public ExpenseTransaction getExpenseById(@PathVariable Long id, HttpServletRequest req) { return service.getExpenseById(id, CurrentUser.id(req)); }

    @PostMapping
    public ExpenseTransaction addExpense(@RequestBody ExpenseTransaction expense, HttpServletRequest req) { return service.addExpense(CurrentUser.id(req), expense); }

    @PutMapping("/{id}")
    public ExpenseTransaction updateExpense(@PathVariable Long id, @RequestBody ExpenseTransaction expense, HttpServletRequest req) {
        return service.updateExpense(id, CurrentUser.id(req), expense);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteExpense(@PathVariable Long id, HttpServletRequest req) {
        service.deleteExpense(id, CurrentUser.id(req));
        return Map.of("message", "Expense deleted successfully");
    }

    @GetMapping("/summary")
    public Map<String, Double> summary(HttpServletRequest req) {
        Long uid = CurrentUser.id(req);
        return Map.of("total", service.getTotal(uid), "monthly", service.getMonthlyTotal(uid));
    }
}
