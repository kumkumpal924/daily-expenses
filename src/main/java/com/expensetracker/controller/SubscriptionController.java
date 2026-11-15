package com.expensetracker.controller;

import com.expensetracker.entity.Subscription;
import com.expensetracker.repository.SubscriptionRepository;
import com.expensetracker.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {
    private final SubscriptionRepository repo;
    public SubscriptionController(SubscriptionRepository repo) { this.repo = repo; }

    @GetMapping
    public List<Subscription> all(HttpServletRequest req) { return repo.findByUserId(CurrentUser.id(req)); }

    @PostMapping
    public Subscription add(@RequestBody Subscription body, HttpServletRequest req) {
        check(body);
        body.setId(null);
        body.setUserId(CurrentUser.id(req));
        return repo.save(body);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id, HttpServletRequest req) {
        Subscription s = repo.findByIdAndUserId(id, CurrentUser.id(req))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subscription not found"));
        repo.delete(s);
        return Map.of("message", "Deleted");
    }

    private void check(Subscription b) {
        if (b.getName() == null || b.getName().isBlank()) throw new IllegalArgumentException("Name is required");
        if (b.getName().length() > 100) throw new IllegalArgumentException("Name is too long (max 100 characters)");
        if (!(b.getAmount() > 0) || !Double.isFinite(b.getAmount())) throw new IllegalArgumentException("Amount must be greater than zero");
        if (b.getBillingDay() < 1 || b.getBillingDay() > 31) throw new IllegalArgumentException("Billing day must be 1-31");
    }
}
