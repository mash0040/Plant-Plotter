# Security Notes

Plant Plotter is a portfolio-ready application with a simple JWT authentication model. This file documents the current security posture and the safest incremental path for hardening it.

## Current JWT Lifecycle

- Login and registration are handled by the Express API in `plantplotter_backend/controllers/userController.js`.
- On successful login or registration, the backend signs a JWT with `jsonwebtoken`.
- The token payload includes the user id, email, username, and role.
- Token lifetime is controlled by `JWT_EXPIRES_IN`; if unset, the backend defaults to `24h`.
- The frontend stores the JWT in `localStorage` under `token`.
- Older browser sessions may still have a legacy `authToken` key. The API client can read that key for compatibility, but new sessions do not write it.
- API requests attach the JWT as `Authorization: Bearer <token>`.
- Protected backend routes verify the JWT with `plantplotter_backend/middleware/verifyToken.js`.
- Logout clears `token`, the legacy `authToken`, cached `user`, and cached `gardens` from `localStorage`.
- Account deletion calls the backend delete endpoint, then clears the same local session state.
- Protected-route `401` responses clear local session state and notify the app to redirect to login.
- Login and registration `401` responses are treated as auth-entry errors, not expired-session events.

## localStorage JWT Tradeoff

Storing JWTs in `localStorage` keeps the frontend/backend deployment simple and works with the current Render API plus Vercel frontend setup. The tradeoff is that any successful cross-site scripting issue on the Plant Plotter origin could read the JWT with JavaScript.

This does not mean an XSS vulnerability is currently known. It means the impact of a future XSS bug would be higher than it would be with an httpOnly cookie session.

## Current Low-Risk Hardening

- New login and registration sessions now write only the `token` key instead of duplicating the JWT into both `token` and `authToken`.
- The frontend still reads the old `authToken` key so existing browser sessions keep working.
- Logout, account deletion, and session-expiry cleanup still remove both keys.
- A broad frontend audit found no direct `dangerouslySetInnerHTML` or `innerHTML` usage.
- No obvious token logging or user-facing token display was found in the frontend or backend code.

## Future Migration Path

A stronger session model should move authentication to secure, httpOnly cookies. That should be done as a dedicated feature because it touches backend CORS, cookie settings, CSRF protection, frontend request credentials, logout behavior, and production platform configuration.

Recommended sequence:

1. Add backend support for issuing an httpOnly, `Secure`, `SameSite` cookie on login and registration.
2. Add CSRF protection for cookie-authenticated unsafe methods such as POST, PUT, PATCH, and DELETE.
3. Update frontend requests to use credentialed fetch calls.
4. Keep bearer-token auth temporarily during migration if needed.
5. Update logout and account deletion to expire the auth cookie server-side.
6. Add tests for login, registration, protected requests, logout, CSRF rejection, and expired sessions.
7. Remove browser-accessible JWT storage once cookie auth is verified in local, preview, and production environments.

Refresh tokens are a related but separate design decision. If added, refresh tokens should be stored only in httpOnly cookies and rotated or invalidated server-side.

## Developer Guidance

- Do not log JWTs, password reset tokens, authorization headers, or raw credential payloads.
- Do not display tokens or authorization headers in user-facing UI.
- Avoid unsafe HTML injection. Prefer React text rendering for user-provided content.
- Treat any future use of `dangerouslySetInnerHTML`, `innerHTML`, markdown rendering, rich text rendering, or third-party embeds as a security review point.
- Keep real secrets in local/platform environment variables only. Do not commit `.env` or `.env.local` files.
