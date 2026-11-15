package com.expensetracker.config;

import com.expensetracker.entity.AppUser;
import com.expensetracker.repository.GoalRepository;
import com.expensetracker.repository.SubscriptionRepository;
import com.expensetracker.repository.TransactionRepository;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * On startup: makes sure at least one admin exists, and hands any old data
 * (saved before login existed) over to that admin so nothing is lost.
 */
@Component
public class DataInitializer implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository users;
    private final UserService userService;
    private final TransactionRepository expenses;
    private final GoalRepository goals;
    private final SubscriptionRepository subscriptions;
    private final String adminName;
    private final String adminUsername;
    private final String adminPassword;

    public DataInitializer(UserRepository users, UserService userService, TransactionRepository expenses,
                           GoalRepository goals, SubscriptionRepository subscriptions,
                           @Value("${app.admin.name:Administrator}") String adminName,
                           @Value("${app.admin.username:admin}") String adminUsername,
                           @Value("${app.admin.password:Admin@123}") String adminPassword) {
        this.users = users;
        this.userService = userService;
        this.expenses = expenses;
        this.goals = goals;
        this.subscriptions = subscriptions;
        this.adminName = adminName;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(String... args) {
        if (!users.existsByRole("ADMIN")) {
            String uname = adminUsername.trim().toLowerCase();
            AppUser existing = users.findByUsername(uname).orElse(null);
            if (existing != null) {
                existing.setRole("ADMIN");
                existing.setEnabled(true);
                users.save(existing);
                log.info("Existing user '{}' was promoted to admin.", uname);
            } else {
                userService.createUser(adminName, adminUsername, adminPassword, "ADMIN", true);
                log.info("Admin account created. Username: '{}'. Change the password after your first login.", uname);
            }
        }
        AppUser owner = users.findAllByOrderByIdAsc().stream().filter(AppUser::isAdmin).findFirst().orElse(null);
        if (owner != null) {
            int moved = expenses.assignOrphans(owner.getId()) + goals.assignOrphans(owner.getId())
                    + subscriptions.assignOrphans(owner.getId());
            if (moved > 0) log.info("{} older record(s) were assigned to admin '{}'.", moved, owner.getUsername());
        }
    }
}
