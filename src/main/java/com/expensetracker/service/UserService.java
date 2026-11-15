package com.expensetracker.service;

import com.expensetracker.entity.AppUser;
import com.expensetracker.repository.GoalRepository;
import com.expensetracker.repository.SubscriptionRepository;
import com.expensetracker.repository.TransactionRepository;
import com.expensetracker.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class UserService {
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9_.]{3,30}$");
    private static final int MAX_FAILS = 5;
    private static final long LOCK_SECONDS = 5 * 60;

    private final UserRepository users;
    private final TransactionRepository expenses;
    private final GoalRepository goals;
    private final SubscriptionRepository subscriptions;
    private final PasswordEncoder encoder;

    /** username -> {failed attempts, locked-until epoch seconds}. In memory, resets on restart. */
    private final Map<String, long[]> attempts = new HashMap<>();

    public UserService(UserRepository users, TransactionRepository expenses, GoalRepository goals,
                       SubscriptionRepository subscriptions, PasswordEncoder encoder) {
        this.users = users;
        this.expenses = expenses;
        this.goals = goals;
        this.subscriptions = subscriptions;
        this.encoder = encoder;
    }

    // ---------- create / validate ----------
    public AppUser createUser(String fullName, String username, String password, String role, boolean enabled) {
        String name = fullName == null ? "" : fullName.trim();
        if (name.length() < 2 || name.length() > 100) throw new IllegalArgumentException("Full name must be 2 to 100 characters");
        String uname = normalize(username);
        if (!USERNAME.matcher(uname).matches()) {
            throw new IllegalArgumentException("Username must be 3 to 30 characters: letters, numbers, dot or underscore");
        }
        checkPassword(password);
        if (users.existsByUsername(uname)) throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already taken");

        AppUser u = new AppUser();
        u.setFullName(name);
        u.setUsername(uname);
        u.setPasswordHash(encoder.encode(password));
        u.setRole(normalizeRole(role));
        u.setEnabled(enabled);
        u.setCreatedAt(LocalDateTime.now());
        try {
            return users.save(u);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already taken");
        }
    }

    private static String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase();
    }

    private static String normalizeRole(String role) {
        return "ADMIN".equalsIgnoreCase(role == null ? "" : role.trim()) ? "ADMIN" : "USER";
    }

    private static void checkPassword(String password) {
        if (password == null || password.length() < 6) throw new IllegalArgumentException("Password must be at least 6 characters");
        if (password.length() > 64) throw new IllegalArgumentException("Password is too long (max 64 characters)");
    }

    // ---------- login ----------
    public AppUser authenticate(String username, String password) {
        String uname = normalize(username);
        long now = Instant.now().getEpochSecond();
        synchronized (attempts) {
            long[] a = attempts.get(uname);
            if (a != null && a[1] > now) {
                long mins = Math.max(1, (a[1] - now + 59) / 60);
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Too many failed attempts. Try again in " + mins + " minute(s).");
            }
        }
        AppUser user = users.findByUsername(uname).orElse(null);
        boolean ok = user != null && password != null && encoder.matches(password, user.getPasswordHash());
        if (!ok) {
            registerFailure(uname, now);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect username or password");
        }
        synchronized (attempts) { attempts.remove(uname); }
        if (!user.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is turned off. Please contact the admin.");
        }
        return user;
    }

    private void registerFailure(String uname, long now) {
        synchronized (attempts) {
            if (attempts.size() > 10000) attempts.clear();
            long[] a = attempts.computeIfAbsent(uname, k -> new long[]{0, 0});
            if (a[1] != 0 && a[1] <= now) { a[0] = 0; a[1] = 0; }
            a[0]++;
            if (a[0] >= MAX_FAILS) { a[1] = now + LOCK_SECONDS; a[0] = 0; }
        }
    }

    public void recordLogin(AppUser user) {
        user.setLastLoginAt(LocalDateTime.now());
        users.save(user);
    }

    // ---------- own account ----------
    public void changePassword(AppUser user, String current, String next) {
        if (current == null || !encoder.matches(current, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        checkPassword(next);
        user.setPasswordHash(encoder.encode(next));
        users.save(user);
    }

    // ---------- admin ----------
    public List<AppUser> listAll() {
        return users.findAllByOrderByIdAsc();
    }

    private AppUser find(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public AppUser setEnabled(Long id, boolean enabled, AppUser acting) {
        if (!enabled && acting.getId().equals(id)) throw new IllegalArgumentException("You cannot turn off your own account");
        AppUser u = find(id);
        u.setEnabled(enabled);
        return users.save(u);
    }

    public AppUser setRole(Long id, String role, AppUser acting) {
        if (acting.getId().equals(id)) throw new IllegalArgumentException("You cannot change your own role");
        AppUser u = find(id);
        u.setRole(normalizeRole(role));
        return users.save(u);
    }

    public AppUser resetPassword(Long id, String password) {
        checkPassword(password);
        AppUser u = find(id);
        u.setPasswordHash(encoder.encode(password));
        return users.save(u);
    }

    @Transactional
    public void deleteUser(Long id, AppUser acting) {
        if (acting.getId().equals(id)) throw new IllegalArgumentException("You cannot delete your own account");
        AppUser u = find(id);
        expenses.deleteByUserId(id);
        goals.deleteByUserId(id);
        subscriptions.deleteByUserId(id);
        users.delete(u);
    }
}
