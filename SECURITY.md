# Security Notes

Plant Plotter uses a signed JWT inside an httpOnly authentication cookie. The browser sends the cookie to the Express API, but client-side JavaScript cannot read the session credential.

## Authentication Session

- Login and registration are handled by the Express API in `plantplotter_backend/controllers/userController.js`.
- A successful login or signup-code verification signs a JWT with `jsonwebtoken` and sets it as an httpOnly cookie. Starting registration does not create a user or authentication session. The token is not included in the JSON response.
- The JWT payload includes the user id, email, username, and `sessionVersion`.
- `JWT_EXPIRES_IN` controls both the JWT expiry and the cookie lifetime; the backend defaults to `24h` when it is unset.
- Protected backend routes read and verify the cookie in `plantplotter_backend/middleware/verifyToken.js`, then compare its version with the active user's `users.session_version` on every request. Missing/inactive accounts and mismatched or missing versions receive `401 INVALID_TOKEN` and the cookie is cleared.
- Session verification requires one indexed user lookup per protected request. Database failures deny access without clearing the cookie; temporary outages use the existing `503 SERVICE_UNAVAILABLE` response.
- The frontend uses `credentials: include` for API requests and never reads the authentication cookie.
- Logout calls `POST /api/auth/logout`; logout and successful account deletion expire the authentication cookie in the backend response.
- Invalid or expired cookies are also cleared when authentication verification fails.
- Protected-route `401` responses notify the app and redirect an established session to login with user-friendly expired-session copy.

Protected endpoints accept the authentication cookie, not bearer tokens from browser storage. The frontend clears legacy token and cached auth-user entries from `localStorage`.

## Cookie Policy

The authentication cookie is strictly necessary for account login and protected application features. Plant Plotter does not currently set advertising or analytics cookies. The authentication cookie is not a consent or tracking cookie, and adding non-essential cookies in the future requires a separate privacy and consent review.

## Cookie Configuration And Deployment

Both authentication cookie variants are httpOnly, host-only (no `Domain`), and use `SameSite=Lax` with `Path=/`:

| Environment | Cookie name | `Secure` |
| --- | --- | --- |
| Local development | `plantplotter_session` | No |
| Production (`NODE_ENV=production`) | `__Host-plantplotter_session` | Yes |

The canonical frontend (`https://www.plantplotter.me`) and API (`https://api.plantplotter.me`) are separate origins under the same HTTPS site, allowing `SameSite=Lax` authentication. The cookie remains scoped to the API host.

Vercel must use `NEXT_PUBLIC_API_URL=https://api.plantplotter.me/api`. Render must set `NODE_ENV=production` and configure `FRONTEND_URL` with the exact canonical frontend origin. Credentialed CORS must never use a wildcard origin.

The production API trusts one proxy hop (`trust proxy: 1`). Keep the deployment's proxy path consistent with this setting so client-IP rate limits use the intended address.

Vercel preview domains are cross-site with `api.plantplotter.me` and are not part of the production cookie contract. Test production authentication through the canonical custom domain.

## CSRF Protection

- Every unsafe API method (`POST`, `PUT`, `PATCH`, and `DELETE`) requires `X-CSRF-Protection: 1`.
- The shared frontend API client adds this header automatically.
- The custom header forces browser cross-origin requests through CORS preflight.
- Backend CORS allows credentials and only explicitly configured frontend origins.
- Requests without the required header receive `403 CSRF_VALIDATION_FAILED` before route handlers can change data.
- `SameSite=Lax` provides an additional browser-level restriction but is not treated as the only CSRF defense.

The header requirement is independent of authentication:

| Unsafe endpoints | Required credentials in addition to `X-CSRF-Protection: 1` |
| --- | --- |
| Login, registration start, forgot-password, reset-password, and logout | No pre-existing authenticated session. Reset-password requires the reset token in the request body. |
| Signup verification, resend, and change-email | The separate signup cookie and matching `attemptId` and `revision`; no authenticated session. |
| Protected account, garden, and tracker mutations | A valid authentication cookie. |

API tools used for manual testing must send the header and any credentials required by the endpoint. Safe methods (`GET`, `HEAD`, and `OPTIONS`) do not require the CSRF header; protected reads still require authentication.

## Password Policy

New passwords must be at least 8 JavaScript string units long, contain an ASCII
uppercase letter, lowercase letter, and number, and fit within **72 UTF-8 bytes**.
The minimum and complexity rules are unchanged. The maximum matches bcrypt's
effective input boundary: accented letters and emoji can require multiple bytes.
Passwords are never trimmed, normalized, or silently truncated by validation.

Registration and password reset use the shared backend validator before database
work or bcrypt hashing. The frontend mirrors it with `TextEncoder`; the backend
uses `Buffer.byteLength(password, 'utf8')`. Over-limit input receives a clear
validation error (`400` from the API). HTML `maxLength` is intentionally omitted:
it counts UTF-16 units rather than UTF-8 bytes and can silently clip pasted input.
Any future password-change flow must use the same new-password policy.

Login and account-deletion confirmation continue to verify existing passwords
without applying new-password rules, preserving access for accounts created
under the previous policy. Existing over-limit hashes retain bcrypt's prefix
semantics until the password is reset; this change does not migrate stored hashes.

## New Account Email Verification

New registrations use `POST /api/auth/register` to validate the established display-name,
email, and password rules and create a temporary signup. A `202` response carries
`pending` metadata, never a user or authentication token. `pending.delivery` is
`sent` only after provider acceptance; `failed` means the user must explicitly retry.
Provider acceptance does not prove inbox delivery. Existing accounts, including
legacy unverified addresses and the shared demo, retain their login/session behavior.

The separate signup cookie is a random 256-bit credential with the same httpOnly,
Secure-in-production, host-only, SameSite=Lax policy as the session cookie. Its name
is `plantplotter_signup` locally and `__Host-plantplotter_signup` in production.
It grants access only to that pending signup, never to protected application data.
Only its SHA-256 hash is stored. `GET /api/auth/register/pending` restores the
verification screen after refresh with `Cache-Control: no-store`; passwords and
signup credentials are never placed in browser storage or URLs.

`POST /api/auth/register/verify`, `/resend`, and `/change-email` require the signup
cookie, the matching `attemptId` and `revision`, and the existing CSRF protection.
Changing an address updates only the pending attempt and requires a new code.
Starting another signup from the same cookie invalidates the old pending attempt.
An email address alone cannot read or change someone else's pending credentials.

Six-digit codes use `crypto.randomInt`, expire after 10 minutes, and allow at most
five incorrect submissions, including malformed codes. A domain-separated HMAC-SHA256
key derived from `JWT_SECRET` protects verifiers, binding each to its attempt,
address and revision. All API instances must share this secret; rotating it invalidates
outstanding codes as well as existing JWTs. Pending passwords are bcrypt hashes.
Passwords, cookie credentials, and provider/SQL errors containing them are never
logged by the signup path. Codes are not logged in email mode (the default).

For explicit local testing only, set both `NODE_ENV=development` and
`SIGNUP_EMAIL_MODE=console` in the backend environment. This prints each newly
issued code in the backend terminal instead of contacting the email provider,
allowing the normal verification flow to complete without a real inbox. It does
not prove mailbox ownership and must be used only with a local development
database. The signup service treats terminal output as delivery in this mode;
the user-facing flow and warning wording are unchanged. Expiry, single-use codes,
guess limits, resend cooldowns, and shared budgets still apply.

Console mode is rejected before logging or delivery in production, test, and when
`NODE_ENV` is unset. It is never selected automatically for missing configuration
or provider failures. Production must use `SIGNUP_EMAIL_MODE=email` (or omit it)
and a configured email provider. Never run a deployed API with `NODE_ENV=development`.
Passwords and signup-cookie credentials are not printed even in console mode.

MySQL row locks serialize code verification, resend, and address changes. Verification
inserts one verified user and consumes the attempt in one transaction. The unique
user email constraint remains authoritative. Consumption erases the pending password
hash and code verifier. Replays never issue another session. If the verification
response is lost after commit, the user can sign in with their chosen password;
the pending-status endpoint reports completion. No legacy user is marked verified.
Successful login, sign-out and account deletion clear the signup cookie so it does not linger into
a later registration flow.

Sending reserves a new revision and budgets before contacting the provider outside
the transaction. Only that revision can be finalized as sent. A provider failure,
timeout, or process interruption leaves no authenticated account and permits a
resend after the cooldown. An older code is invalidated when a resend is reserved;
it remains invalid if that send fails. Retry requests must be explicit. The existing
Resend/SendGrid configuration is reused, with a 10-second provider timeout.

Signup limits are persisted in MySQL and apply across API instances and restarts:

| Limit | Bound |
| --- | --- |
| Resend/address change per attempt | Once per 60 seconds |
| Sends per normalized email | Once per 60 seconds, 5 per hour, 10 per day |
| Sends per normalized IP / IPv6 subnet | 20 per hour, 100 per day |
| Verification submissions across attempts per email | 25 per hour |
| Verification submissions across attempts per IP / IPv6 subnet | 100 per hour |

Windows start with the first counted request; failed sends consume sending budget.
Resend and new attempts cannot reset shared guessing limits. `429` responses include
`Retry-After`. Existing general API and registration request limits also apply.
IP normalization uses the established proxy/IP configuration; deploy behind only
the trusted proxy described above. Budget identities are hashed.

Attempts expire after 24 hours and never reserve an email in `users`. Each signup
start deletes at most 100 expired attempts and 100 expired budget rows using expiry
indexes. Rows may remain at rest while there is no signup traffic; expiry is checked
on every operation. See the [signup migration and deployment instructions](plantplotter_db/README.md#email-verification-before-account-creation).

## Password Reset

Password-reset tokens are separate from authentication sessions. They expire after 30 minutes, are single-use, and are stored only as SHA-256 hashes in the database. The reset link carries the raw token; it is not a browser authentication credential.

If email-provider configuration is missing or invalid and `NODE_ENV` is anything other than `production`, the email service intentionally prints the reset link in the backend terminal and skips email delivery. This fallback supports local development/testing, including environments where `NODE_ENV` is unset. It does not run after a configured provider rejects or fails a send. The API response remains generic and never includes the reset link.

Production requires `NODE_ENV=production`, configured email delivery, and an HTTPS `PASSWORD_RESET_BASE_URL`. Reset tokens and links must not appear in production logs or diagnostic output. Missing email configuration raises an error instead of printing a link; configuration/send errors are logged while the reset request retains its generic response. Never run a deployed API with a non-production `NODE_ENV`.

A successful reset increments `users.session_version` in the same conditional database update that changes the password hash and consumes the reset token. All previously issued sessions for that account are rejected on their next protected request. Requests already authenticated before the reset completes may finish. Resetting a password does not automatically sign in; signing in with the new password issues a cookie with the current version. Other accounts remain signed in.

Requesting a reset link, invalid/expired/reused links, validation failures, and failed password updates do not increment the version. Any future password-changing flow must increment it atomically with the password change as well.

See the [database migration instructions](plantplotter_db/README.md#migrations) for existing-database upgrades and deployment order. All API instances must enforce session-version checks; cookies without a version require a new sign-in.

## Account Deletion

`DELETE /api/users/account` requires the authenticated user's current password in
the JSON request body. The API verifies it against that user's stored hash before
opening the deletion transaction and always targets the authenticated user ID.
Missing passwords return `400`; incorrect passwords return `403 INVALID_PASSWORD`
without expiring the session. The UI also requires typing `DELETE` and keeps
pending and retry feedback within the account-deletion confirmation.

## Shared Demo Account

The seeded `demo@plantplotter.com` address is reserved for the general testing of the app 
demo. The API identifies it from the stored user record; account-mutation guards
look up that record using the authenticated user ID. Request-body fields and
email/role values cached in a session JWT cannot override this protection.

Profile updates and account deletion return HTTP `403`
with code `DEMO_ACCOUNT_PROTECTED` before any account mutation or deletion
transaction. A failed permission lookup does not allow the mutation to proceed.
Forgot-password requests return the usual generic response without generating
a token or sending email. Existing reset tokens for the demo account are also
rejected before changing its password.

Profile and login responses include `isProtectedDemo` for the read-only profile
UI; the API enforces protection independently of that flag.

The five showcase gardens, 23 seeded tasks, and 40 seeded activities carry
server-managed `demo_showcase_key` values. Their DELETE endpoints check both the
persisted key and the owner's stored demo identity before any deletion, including
garden child deletion. Blocked requests return HTTP `403`, code
`DEMO_DATA_PROTECTED`. Permission lookup failures deny the action. Request bodies
and JWT display fields cannot grant deletion or change the keys. API responses
expose `isDeletionProtected` for the UI and omit the internal keys.

Planner saves (including plant removal/clearing), garden and tracker edits, task
status changes, creation, and logout remain available. Visitor-created records
and recurring follow-up tasks have no showcase key and can be deleted. Normal
users retain their existing ownership-based permissions, even if a record has a
showcase key. This policy prevents record deletion; it does not freeze showcase
content. The [manual demo restore command](plantplotter_db/README.md#restore-the-shared-demo)
replaces only the stored demo owner's garden/planner/tracker data, including
visitor-created records. It preserves account credentials, normal-user data,
and the shared plant catalogue. It restores showcase keys, runs in one
transaction, refuses inconsistent cross-owner tracker data, and closes its
connection on success or failure. It is an operator command, not a public API.

Existing databases need the [showcase protection migration](plantplotter_db/README.md#showcase-deletion-protection)
before deploying this API. No additional environment variable is needed.
Protection assumes the seeded demo address is
still assigned to the shared account; this change does not repair an account
that was already renamed or deleted. Database administrators must preserve the
reserved identity when maintaining the demo account.

## Session Limitations

Refresh tokens, individual-session revocation, and a server-side session store are not implemented. Password resets revoke sessions at the account level. Session JWTs still expire according to `JWT_EXPIRES_IN`; signing out only removes that browser's cookie and does not invalidate a copied JWT. Changing `JWT_SECRET` invalidates all outstanding sessions.

## Developer Guidance

- Do not log JWTs, cookies, authorization headers, or raw credential payloads. Password-reset tokens and links must not be logged except through the intentional non-production fallback described in [Password Reset](#password-reset); do not add other token logging.
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

The policy blocks plugins and objects, embedded frames, framing of the application, and inline script event handlers. `base-uri 'self'` restricts base URLs to the same origin; it does not forbid all base-element changes. Images additionally allow `blob:` and `data:`, and workers allow `blob:`. Outside development, the policy includes `upgrade-insecure-requests`.

Other response headers include `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, and a `Permissions-Policy` that disables camera and microphone access while preserving same-origin geolocation.

Next.js currently requires inline framework scripts for hydration, and the planner uses React inline style attributes for dynamic dimensions and plant placement. The policy therefore permits inline scripts and styles, while separately blocking inline script attributes with `script-src-attr 'none'`. Development additionally requires `unsafe-eval` for React diagnostics. These exceptions must not be expanded to third-party origins without review.

The current CSP does not use nonces or hashes to authorize individual inline scripts, so it does not block injected inline script elements. This remains a limitation of the current rendering setup.

After changing frontend dependencies or external services, run a production build and manually test login, gardens, planner, tracker weather, profile, and password-reset flows with the browser console open for CSP violations. Confirm the response headers on the page's document request in DevTools Network.

## Vulnerability Reporting

A private vulnerability-reporting contact is pending; no private reporting route has been selected for this project. Do not publish sensitive vulnerability details, credentials, or exploit instructions in public issues.
