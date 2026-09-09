# Security Notes

Plant Plotter uses a signed JWT inside an httpOnly authentication cookie. The browser sends the cookie to the Express API, but client-side JavaScript cannot read the session credential.

## Authentication Session

- Login and registration are handled by the Express API in `plantplotter_backend/controllers/userController.js`.
- A successful login or registration signs a JWT with `jsonwebtoken` and sets it as an httpOnly cookie. The token is not included in the JSON response.
- The JWT payload includes the user id, email, username, and role.
- `JWT_EXPIRES_IN` controls both the JWT expiry and the cookie lifetime; the backend defaults to `24h` when it is unset.
- Local development uses the host-only `plantplotter_session` cookie with `SameSite=Lax` and `Path=/`.
- Production uses `__Host-plantplotter_session`, which is host-only, `Secure`, httpOnly, `SameSite=Lax`, and has `Path=/`.
- Protected backend routes read and verify the cookie in `plantplotter_backend/middleware/verifyToken.js`.
- The frontend uses `credentials: include` for API requests and never reads the authentication cookie.
- Logout calls `POST /api/auth/logout`; logout and successful account deletion expire the authentication cookie in the backend response.
- Invalid or expired cookies are also cleared when authentication verification fails.
- Protected-route `401` responses notify the app and redirect an established session to login with user-friendly expired-session copy.

The previous `localStorage` bearer-token model is no longer accepted by protected endpoints. The frontend removes stale `token`, `authToken`, and cached auth-user values left by earlier builds. Users with one of those older sessions must sign in once after this change is deployed.

## Cookie Policy

The authentication cookie is strictly necessary for account login and protected application features. Plant Plotter does not currently set advertising or analytics cookies. The authentication cookie is not a consent or tracking cookie, and adding non-essential cookies in the future requires a separate privacy and consent review.

## SameSite And Deployment

Production uses `SameSite=Lax` because the canonical frontend (`https://www.plantplotter.me`) and API (`https://api.plantplotter.me`) are separate origins under the same HTTPS site. The cookie is not assigned a `Domain`, so it remains scoped to the API host instead of every `plantplotter.me` subdomain.

Vercel must use `NEXT_PUBLIC_API_URL=https://api.plantplotter.me/api`. Render must set `NODE_ENV=production` and configure `FRONTEND_URL` with the exact canonical frontend origin. Credentialed CORS must never use a wildcard origin.

Vercel preview domains are cross-site with `api.plantplotter.me` and are not part of the production cookie contract. Test production authentication through the canonical custom domain.

## CSRF Protection

- Every unsafe API method (`POST`, `PUT`, `PATCH`, and `DELETE`) requires `X-CSRF-Protection: 1`.
- The shared frontend API client adds this header automatically.
- The custom header forces browser cross-origin requests through CORS preflight.
- Backend CORS allows credentials and only explicitly configured frontend origins.
- Requests without the required header receive `403 CSRF_VALIDATION_FAILED` before route handlers can change data.
- `SameSite=Lax` provides an additional browser-level restriction but is not treated as the only CSRF defense.

API tools used for manual testing must send both the authentication cookie and the CSRF header for unsafe endpoints. Safe methods such as `GET`, `HEAD`, and `OPTIONS` do not require the header.

## Password Reset

Password-reset tokens are separate from authentication sessions. They remain short-lived, single-use values delivered through the reset link and are not stored as browser authentication credentials.

## Known Limitation

Refresh tokens and server-side JWT revocation are not implemented. Session JWTs expire according to `JWT_EXPIRES_IN`; signing out removes the browser cookie, while changing `JWT_SECRET` invalidates all outstanding sessions.

## Developer Guidance

- Do not log JWTs, password-reset tokens, cookies, authorization headers, or raw credential payloads.
- Do not display session credentials in user-facing UI.
- Avoid unsafe HTML injection. Prefer React text rendering for user-provided content.
- Treat any future use of `dangerouslySetInnerHTML`, `innerHTML`, markdown rendering, rich text rendering, or third-party embeds as a security review point.
- Keep real secrets in local or platform environment variables only. Do not commit `.env` or `.env.local` files.

## Browser Security Headers

The frontend security headers are defined in `plantplotter/next.config.js` and applied to every frontend route. The enforced Content Security Policy uses these browser origins:

- `'self'` for scripts, styles, images, fonts, media, workers, manifests, forms, and other application resources.
- The origin from `NEXT_PUBLIC_API_URL` for PlantPlotter API requests.
- `https://api.open-meteo.com` for tracker weather requests.
- WebSocket origins in development only for Next.js Fast Refresh.

The policy blocks plugins and objects, framing, cross-origin frames, base URL changes, and inline script event handlers. It also includes `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and a `Permissions-Policy` that disables camera and microphone access while preserving same-origin geolocation.

Next.js currently requires inline framework scripts for hydration, and the planner uses React inline style attributes for dynamic dimensions and plant placement. The policy therefore permits inline scripts and styles, while separately blocking inline script attributes with `script-src-attr 'none'`. Development additionally requires `unsafe-eval` for React diagnostics. These exceptions must not be expanded to third-party origins without review.

A nonce-based CSP is intentionally deferred. Next.js requires nonce-protected pages to be dynamically rendered, which disables static optimization and normal CDN caching. Revisit nonces, CSP hashes, or stable Subresource Integrity support if the app's rendering strategy changes or stricter compliance requirements justify that performance tradeoff.

After changing frontend dependencies or external services, run a production build and manually test login, gardens, planner, tracker weather, profile, and password-reset flows with the browser console open for CSP violations. Confirm the response headers on the page's document request in DevTools Network.
