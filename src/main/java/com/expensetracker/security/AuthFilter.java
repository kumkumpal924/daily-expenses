package com.expensetracker.security;

import com.expensetracker.entity.AppUser;
import com.expensetracker.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;

/**
 * Default-deny gate: everything except the login/signup pages needs a valid session.
 * Disabled or deleted users are rejected on their very next request.
 */
@Component
public class AuthFilter extends OncePerRequestFilter {
    public static final String SESSION_USER = "uid";

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/login.html", "/signup.html", "/style.css", "/auth.js", "/favicon.ico",
            "/api/auth/login", "/api/auth/signup", "/api/auth/config");

    private final UserRepository users;

    public AuthFilter(UserRepository users) {
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String path = req.getRequestURI();
        boolean api = path.startsWith("/api/");
        if (api || path.equals("/") || path.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-store");
        }
        if (PUBLIC_PATHS.contains(path)) {
            chain.doFilter(req, res);
            return;
        }

        AppUser user = loadUser(req);
        if (user == null) {
            if (api) writeError(res, HttpServletResponse.SC_UNAUTHORIZED, "Please log in");
            else res.sendRedirect("/login.html");
            return;
        }

        boolean adminOnly = path.startsWith("/api/admin/") || path.equals("/admin.html") || path.equals("/admin.js");
        if (adminOnly && !user.isAdmin()) {
            if (api) writeError(res, HttpServletResponse.SC_FORBIDDEN, "Admin access required");
            else res.sendRedirect("/");
            return;
        }

        req.setAttribute(CurrentUser.ATTR, user);
        chain.doFilter(req, res);
    }

    private AppUser loadUser(HttpServletRequest req) {
        HttpSession session = req.getSession(false);
        if (session == null) return null;
        Object id = session.getAttribute(SESSION_USER);
        if (!(id instanceof Long)) return null;
        AppUser user = users.findById((Long) id).orElse(null);
        if (user == null || !user.isEnabled()) {
            session.invalidate();
            return null;
        }
        return user;
    }

    private void writeError(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        res.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
