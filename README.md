# Daily Expenses

A full-stack expense tracker built with Java 17, Spring Boot, MySQL, HTML, CSS and JavaScript.
Every person logs in with their own account and only sees their own data. An admin can manage all accounts.

## Requirements

- Java JDK 17
- Apache Maven 3.8+
- MySQL Server 8+
- MySQL Workbench (optional, for looking at the database)

## Database setup

1. Start MySQL Server and open MySQL Workbench.
2. Run `CREATE DATABASE daily_expenses;` in a SQL tab (the app can also create it by itself).
3. Open `src/main/resources/application.properties` and replace `CHANGE_ME` with your MySQL root password.

All tables are created or updated automatically on startup.

## Run

```bash
mvn spring-boot:run
```

Open `http://localhost:8080`. You will be sent to the login page.

## First login (admin)

On the first start an admin account is created from `application.properties`:

| Setting | Default |
| --- | --- |
| `app.admin.username` | `admin` |
| `app.admin.password` | `Admin@123` |

Log in with these, then use **Change password** in the sidebar. You can also change the two values in
`application.properties` before the very first start.

If you already had expenses, goals or subscriptions saved before login existed, they are
assigned to the admin account automatically, so nothing is lost.

## What each role can do

**User** (self sign up at `/signup.html`, or created by the admin)
- Add, edit and delete expenses, quick add, search and filters, charts, CSV export
- Monthly budget, savings goals, subscriptions, insights and streak
- Change own password
- Sees only their own data. Other users' data is never returned by the API.

**Admin** (`/admin.html`)
- Create users (as User or Admin)
- See the user list with role, expense count and total, join date and last login
- Turn a user's access on or off with a switch. A turned-off user is blocked immediately, even if already logged in.
  Their data is kept and comes back when you switch them on again.
- Reset a user's password, make a user an admin (or remove admin), delete a user together with their data
- Cannot turn off, delete or change the role of their own account
- Admins also have their own personal expense dashboard ("My expenses")

## Settings (`application.properties`)

| Setting | Meaning |
| --- | --- |
| `app.admin.*` | Admin account created on first start |
| `app.signup.enabled` | `false` hides public sign up so only the admin can create accounts |
| `server.servlet.session.timeout` | Auto logout after inactivity (default 8h) |

## Security notes

- Passwords are stored as BCrypt hashes, never as plain text.
- Every page and API except login/sign up needs a valid session; admin pages and `/api/admin/**` need the admin role.
- 5 wrong passwords for a username locks that username for 5 minutes.
- Each expense, goal and subscription belongs to one user and is checked on every read, edit and delete.
- Use HTTPS if you deploy this on a real server.

## API

Auth: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/password`

Own data: `/api/expenses` (+ `/summary`), `/api/goals`, `/api/subscriptions`

Admin: `GET/POST /api/admin/users`, `PUT /api/admin/users/{id}/enabled`, `PUT /api/admin/users/{id}/role`,
`PUT /api/admin/users/{id}/password`, `DELETE /api/admin/users/{id}`
