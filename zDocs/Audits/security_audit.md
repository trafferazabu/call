Security Audit
Run a comprehensive security audit of the entire codebase. This prompt is designed to be re-run periodically. Do not make any changes during the audit — findings and recommendations only. Present results as a structured report.
1. Authentication & Session Security

Are all API endpoints verifying Clerk session tokens before processing requests?
Is there any endpoint that is publicly accessible that should be auth-gated?
Are session tokens being handled and stored securely?
Is there any sensitive operation that relies solely on client-supplied data without server-side verification?

2. Brute Force & Rate Limiting

Are our own API endpoints rate limited independently of Clerk's auth protection?
Is the /api/call/start endpoint rate limited to prevent call-flooding abuse?
Is the /api/rates endpoint rate limited (it is public-facing)?
Is the /api/contacts POST endpoint rate limited to prevent bulk data insertion?
Is there any endpoint with no rate limiting that could be abused at scale?

3. Account Isolation & Cross-Account Access

Can user A access user B's call history?
Can user A access user B's contacts?
Can user A read or modify user B's balance?
Are all database queries scoped to the authenticated user's ID (req.dbUserId) without exception?
Is there any endpoint that accepts a user_id parameter from the client that could be manipulated?
Can a user enumerate other users or accounts in any way?

4. Balance & Billing Integrity

Can a user manipulate their own balance via any API endpoint?
Can call costs be avoided or reduced by manipulating request parameters?
Is the balance deduction atomic — is there any race condition where two simultaneous calls could overdraw a balance?
Is the billing calculation done entirely server-side with no client-supplied cost values trusted?

5. Input Validation & Injection

Are all user-supplied inputs sanitized before touching the database?
Is parameterized queries / prepared statements used everywhere — no string interpolation in SQL?
Are phone numbers validated server-side (not just client-side) before being passed to Telnyx?
Is there any endpoint that passes user input directly to a shell command, file path, or external API without sanitization?
Are contact names and other free-text fields sanitized against XSS?

6. Sensitive Data Exposure

Are any internal identifiers, provider names, or infrastructure details leaking in API responses beyond what was fixed today?
Are error messages returning stack traces or internal details to the client?
Are any credentials, API keys, or secrets present in client-side code or public files?
Is any personally identifiable user data being logged unnecessarily?

7. Webhook Security

If we are receiving webhooks (Telnyx call events, billing events etc.) are they verified for authenticity before being processed?
Can a malicious actor send a fake webhook to manipulate call state or balance?

8. Transport & Infrastructure

Is HTTPS enforced everywhere — no mixed content, no HTTP fallback?
Are secure headers set (CORS policy, Content-Security-Policy, X-Frame-Options etc.)?
Are database credentials and API keys stored only in environment variables, never in code or committed files?


Output Format
Present findings as:

PASS — no issue found
WARN — potential issue, low severity or mitigated elsewhere
FAIL — confirmed vulnerability requiring a fix
N/A — not applicable to current architecture

For every FAIL and WARN, include: what the issue is, where in the codebase it exists, and recommended fix. Prioritize FAILs by severity.
Do not make any changes. Audit and report only.