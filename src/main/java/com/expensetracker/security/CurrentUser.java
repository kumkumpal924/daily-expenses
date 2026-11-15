package com.expensetracker.security;

import com.expensetracker.entity.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Gives controllers the logged-in user that AuthFilter attached to the request. */
public final class CurrentUser {
    public static final String ATTR = "currentUser";

    private CurrentUser() {}

    public static AppUser require(HttpServletRequest req) {
        Object u = req.getAttribute(ATTR);
        if (u instanceof AppUser) return (AppUser) u;
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in");
    }

    public static Long id(HttpServletRequest req) {
        return require(req).getId();
    }
}
