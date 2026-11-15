package com.expensetracker.controller;

import com.expensetracker.entity.AppUser;
import com.expensetracker.security.AuthFilter;
import com.expensetracker.security.CurrentUser;
import com.expensetracker.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public record LoginRequest(String username, String password) {}
    public record SignupRequest(String fullName, String username, String password) {}
    public record PasswordRequest(String currentPassword, String newPassword) {}
    public record Profile(Long id, String fullName, String username, String role) {}

    private final UserService users;
    private final boolean signupEnabled;

    public AuthController(UserService users, @Value("${app.signup.enabled:true}") boolean signupEnabled) {
        this.users = users;
        this.signupEnabled = signupEnabled;
    }

    @GetMapping("/config")
    public Map<String, Boolean> config() { return Map.of("signupEnabled", signupEnabled); }

    @PostMapping("/signup")
    public Profile signup(@RequestBody SignupRequest body, HttpServletRequest req) {
        if (!signupEnabled) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sign up is turned off. Ask the admin to create your account.");
        }
        AppUser u = users.createUser(body.fullName(), body.username(), body.password(), "USER", true);
        users.recordLogin(u);
        startSession(req, u);
        return profile(u);
    }

    @PostMapping("/login")
    public Profile login(@RequestBody LoginRequest body, HttpServletRequest req) {
        AppUser u = users.authenticate(body.username(), body.password());
        users.recordLogin(u);
        startSession(req, u);
        return profile(u);
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest req) {
        HttpSession s = req.getSession(false);
        if (s != null) s.invalidate();
        return Map.of("message", "Logged out");
    }

    @GetMapping("/me")
    public Profile me(HttpServletRequest req) { return profile(CurrentUser.require(req)); }

    @PostMapping("/password")
    public Map<String, String> changePassword(@RequestBody PasswordRequest body, HttpServletRequest req) {
        users.changePassword(CurrentUser.require(req), body.currentPassword(), body.newPassword());
        return Map.of("message", "Password updated");
    }

    private static Profile profile(AppUser u) {
        return new Profile(u.getId(), u.getFullName(), u.getUsername(), u.getRole());
    }

    /** New session id on every login (prevents session fixation). */
    private static void startSession(HttpServletRequest req, AppUser u) {
        HttpSession old = req.getSession(false);
        if (old != null) old.invalidate();
        HttpSession s = req.getSession(true);
        s.setAttribute(AuthFilter.SESSION_USER, u.getId());
    }
}
