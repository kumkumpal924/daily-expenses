package com.expensetracker.controller;

import com.expensetracker.entity.Goal;
import com.expensetracker.repository.GoalRepository;
import com.expensetracker.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/goals")
public class GoalController {
    private final GoalRepository repo;
    public GoalController(GoalRepository repo) { this.repo = repo; }

    @GetMapping
    public List<Goal> all(HttpServletRequest req) { return repo.findByUserId(CurrentUser.id(req)); }

    @PostMapping
    public Goal add(@RequestBody Goal body, HttpServletRequest req) {
        check(body);
        body.setId(null);
        body.setUserId(CurrentUser.id(req));
        return repo.save(body);
    }

    @PutMapping("/{id}")
    public Goal update(@PathVariable Long id, @RequestBody Goal body, HttpServletRequest req) {
        check(body);
        Goal existing = owned(id, req);
        existing.setName(body.getName());
        existing.setTargetAmount(body.getTargetAmount());
        existing.setSavedAmount(body.getSavedAmount());
        return repo.save(existing);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id, HttpServletRequest req) {
        repo.delete(owned(id, req));
        return Map.of("message", "Deleted");
    }

    private Goal owned(Long id, HttpServletRequest req) {
        return repo.findByIdAndUserId(id, CurrentUser.id(req))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
    }

    private void check(Goal b) {
        if (b.getName() == null || b.getName().isBlank()) throw new IllegalArgumentException("Name is required");
        if (b.getName().length() > 100) throw new IllegalArgumentException("Name is too long (max 100 characters)");
        if (!(b.getTargetAmount() > 0) || !Double.isFinite(b.getTargetAmount())) throw new IllegalArgumentException("Target must be greater than zero");
        if (b.getSavedAmount() < 0 || !Double.isFinite(b.getSavedAmount())) throw new IllegalArgumentException("Saved amount cannot be negative");
    }
}
