package com.expensetracker.controller;

import com.expensetracker.entity.AppUser;
import com.expensetracker.repository.TransactionRepository;
import com.expensetracker.security.CurrentUser;
import com.expensetracker.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Only reachable by admins (AuthFilter blocks /api/admin/** for everyone else). */
@RestController
@RequestMapping("/api/admin/users")
public class AdminController {
    public record CreateUserRequest(String fullName, String username, String password, String role) {}
    public record EnabledRequest(boolean enabled) {}
    public record RoleRequest(String role) {}
    public record PasswordRequest(String password) {}
    public record UserView(Long id, String fullName, String username, String role, boolean enabled,
                           LocalDateTime createdAt, LocalDateTime lastLoginAt, long expenseCount, double expenseTotal) {}

    private final UserService users;
    private final TransactionRepository expenses;

    public AdminController(UserService users, TransactionRepository expenses) {
        this.users = users;
        this.expenses = expenses;
    }

    @GetMapping
    public List<UserView> list() { return users.listAll().stream().map(this::view).toList(); }

    @PostMapping
    public UserView create(@RequestBody CreateUserRequest body) {
        return view(users.createUser(body.fullName(), body.username(), body.password(), body.role(), true));
    }

    @PutMapping("/{id}/enabled")
    public UserView setEnabled(@PathVariable Long id, @RequestBody EnabledRequest body, HttpServletRequest req) {
        return view(users.setEnabled(id, body.enabled(), CurrentUser.require(req)));
    }

    @PutMapping("/{id}/role")
    public UserView setRole(@PathVariable Long id, @RequestBody RoleRequest body, HttpServletRequest req) {
        return view(users.setRole(id, body.role(), CurrentUser.require(req)));
    }

    @PutMapping("/{id}/password")
    public UserView resetPassword(@PathVariable Long id, @RequestBody PasswordRequest body) {
        return view(users.resetPassword(id, body.password()));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id, HttpServletRequest req) {
        users.deleteUser(id, CurrentUser.require(req));
        return Map.of("message", "User deleted");
    }

    private UserView view(AppUser u) {
        Double total = expenses.sumByUserId(u.getId());
        return new UserView(u.getId(), u.getFullName(), u.getUsername(), u.getRole(), u.isEnabled(),
                u.getCreatedAt(), u.getLastLoginAt(), expenses.countByUserId(u.getId()), total == null ? 0.0 : total);
    }
}
