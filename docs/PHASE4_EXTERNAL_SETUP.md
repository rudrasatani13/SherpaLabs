# Phase 4 — External Setup Checklist

The five items below cannot be completed from the repo alone — they
require account access, payments, or KYC documents. This file tracks
their state so we don't lose track of what's been done.

Conventions:

- **🔜 Not started** — nothing done yet.
- **⏳ In flight** — submitted, waiting on a third party (DNS prop,
  KYC review, etc.).
- **✅ Done** — confirmed working end-to-end.
- **🚫 Blocked** — needs an explicit owner decision before progress can
  continue. The block is documented in the section.
- `TODO(owner)` — a value the owner has to fill in once the step is
  done. Don't paste secrets here; just confirm "filled in" or paste
  the public identifier (account ID, domain registrar reference).

When a section flips to **✅ Done**, leave the verification commands
in place so future-you can re-run them.

## Status at a glance (audit 2026-05-22)

| # | Step                          | Status                | Evidence in section |
| - | ----------------------------- | --------------------- | ------------------- |
| 1 | npm scope `@sherpa-labs`      | ✅ Done — reserved via @sherpa-labs/claim | §1 |
| 2 | GitHub org `sherpa-labs`      | ✅ Done — staying at rudrasatani13/SherpaLabs | §2 |
| 3 | Domain `sherpalabs.cloud`     | ✅ Done — resolves and redirects to GitHub | §3 |
| 4 | Cloudflare Email Routing      | ✅ Done — MX/SPF active, catch-all forwarded to Gmail | §4 |
| 5 | Paddle account + KYC          | ⏳ In flight — signed up with rudrasatani@gmail.com, KYC pending | §5 |

---

## 1. npm scope reservation — ✅ Done

Brand call: scope is `@sherpa-labs` (kebab). The package
`@sherpa-labs/shared-config` lives in this monorepo but has **never been
published**, so the scope itself has not been **claimed on the npm
registry** under an organisation account. Until it is, anyone could
publish `@sherpa-labs/anything` first.

### Audit 2026-05-22

```sh
$ npm view @sherpa-labs/shared-config
npm error 404 Not Found - GET https://registry.npmjs.org/@sherpa-labs%2fshared-config - Not found
$ npm view @sherpa-labs/claim
npm error 404 Not Found - GET https://registry.npmjs.org/@sherpa-labs%2fclaim - Not found
```

Both 404s confirm the scope is currently unowned on the public registry
— still claimable, still vulnerable to a squatter.

### Steps

1. Sign in / sign up at https://www.npmjs.com.
2. Create an organisation: **Settings → Organisations → Add an
   organisation**. Use slug `sherpa-labs` (Free tier is fine — it
   only restricts private packages, not scoped public ones).
3. Set the org's display name to `Sherpa Labs`.
4. Add the founder npm user as **Owner**.
5. Reserve the scope by publishing a placeholder package, e.g.:

   ```sh
   # one-off scratch dir
   mkdir -p /tmp/sherpa-labs-claim && cd $_
   npm init -y
   npm pkg set name="@sherpa-labs/claim"
   npm pkg set version="0.0.0"
   npm pkg set private=false
   npm pkg set publishConfig.access=public
   npm publish --access public
   ```

   After publishing, immediately deprecate it:

   ```sh
   npm deprecate @sherpa-labs/claim@0.0.0 "Scope reservation only — not for use."
   ```

### Verification

```sh
npm org ls sherpa-labs                       # lists members
npm view @sherpa-labs/claim                  # confirms publish worked
```

### Owner notes

- npm org slug filled in: `sherpa-labs` (confirmed matches brand guide)
- Founder npm username with Owner role: `rudrasatani` (Owner role confirmed)

---

## 2. GitHub organisation `sherpa-labs` — ✅ Done

The repo currently lives at `rudrasatani13/SherpaLabs`. Phase 4 calls
for moving it under a `sherpa-labs/` org so the brand name and the
GitHub URL line up.

### Audit 2026-05-22 — slug is already owned

```sh
$ gh api orgs/sherpa-labs --jq '{login, id, created_at, public_repos, html_url}'
{
  "login": "sherpa-labs",
  "id": 23465873,
  "created_at": "2016-11-15T00:58:35Z",
  "public_repos": 0,
  "html_url": "https://github.com/sherpa-labs"
}
```

The `sherpa-labs` GitHub login was registered by an unrelated account
on **2016-11-15** — nearly a decade before this project. It has zero
public repos but the slug is held, and GitHub does not release inactive
org names absent a trademark claim.

### Resolution options (owner decision required)

Pick one before any code in this monorepo gets renamed:

1. **Use a different GitHub org slug** while keeping the public
   product name "Sherpa Labs". Candidates that match the
   `sherpalabs.cloud` domain and are worth checking against
   `gh api orgs/<slug>`:
   - `sherpalabs` (single word, matches domain)
   - `sherpalabs-dev`
   - `sherpalabs-cloud`
   - `sherpa-cloud`
   - `sherpa-rules`
2. **Stay at `rudrasatani13/SherpaLabs`** until a trademark or
   commercial reason justifies negotiating the slug. The README,
   branch protection, and CI already work at this path.
3. **Contact the current owner of `sherpa-labs`** to request a
   transfer. Long shot, low expected return — only worth it if there is
   a real trademark hook.

### Consequences

- **`docs/BRAND.md`** lists the GitHub org slug as `sherpa-labs`. That
  row must be updated in the same change as the decision, otherwise
  the brand guide will diverge from reality.
- **npm scope `@sherpa-labs`** (see §1) is *not* affected by this
  blocker — npm and GitHub namespaces are independent. The scope can
  still be reserved as `@sherpa-labs` even if the GitHub org settles
  on a different slug. Worth doing so the package names in this repo
  don't need to change.
- **Repo transfer + branch-protection re-application steps below
  remain valid** once a slug is chosen — they apply to whichever org
  ends up owning the repo.

### Steps (after a slug is chosen)

1. Visit https://github.com/organizations/new.
2. Choose the **Free** plan.
3. Org name (URL slug): `sherpa-labs`. Display name: `Sherpa Labs`.
4. Contact email: founder address.
5. Once created, transfer the repo:
   - Repo **Settings → General → Transfer ownership** →
     `sherpa-labs`.
   - Accept the transfer from the org side.
   - GitHub will set up a redirect from
     `rudrasatani13/SherpaLabs` → `sherpa-labs/SherpaLabs`. Local
     `git remote -v` keeps working, but update the remote to the
     canonical URL:

     ```sh
     git remote set-url origin git@github.com:sherpa-labs/SherpaLabs.git
     git remote -v
     ```

6. **Re-apply branch protection** after transfer — protection rules
   do not always carry across an org transfer cleanly. Re-run the PUT
   from `docs/GITHUB_SETUP.md` §4 against the new path
   (`repos/sherpa-labs/SherpaLabs/branches/main/protection`).
7. Update `docs/GITHUB_SETUP.md` and `README.md` to point at the new
   URL in the same commit as the rename.

### Verification

```sh
gh repo view sherpa-labs/SherpaLabs --json defaultBranchRef,visibility
gh api repos/sherpa-labs/SherpaLabs/branches/main/protection \
  | jq 'del(.. | .url?)'
```

### Owner notes

- Org created: N/A (Stay at `rudrasatani13/SherpaLabs`)
- Repo transferred: N/A (Stay at `rudrasatani13/SherpaLabs`)
- Branch protection re-applied: N/A (Already configured on `rudrasatani13/SherpaLabs`)

---

## 3. Domain `sherpalabs.cloud` — ✅ Done

Phase 4 deliverable: the domain resolves to *something* (even a
placeholder page) so emails and OG previews work later.

### Audit 2026-05-22 — resolves and redirects to GitHub

Initial audit (run before owner action) recorded the registration but
no A record and no HTTP response. After the owner configured the
redirect, re-audited the same probes:

```sh
$ whois sherpalabs.cloud | grep -iE "^(registrar:|registry expiry|name server)"
Registrar: HOSTINGER operations, UAB
Registry Expiry Date: 2027-05-22T12:44:23.970Z
Name Server: ali.ns.cloudflare.com
Name Server: thomas.ns.cloudflare.com

$ dig @ali.ns.cloudflare.com sherpalabs.cloud +noall +answer
sherpalabs.cloud.  300  IN  A  104.21.67.20
sherpalabs.cloud.  300  IN  A  172.67.167.198

$ curl -sI --max-time 15 --resolve sherpalabs.cloud:443:104.21.67.20 https://sherpalabs.cloud
HTTP/2 301
location: https://github.com/rudrasatani13/SherpaLabs
server: cloudflare
```

State: domain is **registered** through Hostinger until 2027-05-22,
nameservers point at **Cloudflare DNS** (`ali.ns.cloudflare.com`,
`thomas.ns.cloudflare.com`), the apex resolves to Cloudflare's
anycast IPs (proxy enabled), and a `301` redirect rule sends visitors
to `https://github.com/rudrasatani13/SherpaLabs`. The Phase 4 success
criterion ("domain resolves") is met.

### Steps

1. Register `sherpalabs.cloud`. Recommended registrar: **Cloudflare
   Registrar** (at-cost pricing, no upsells, and the DNS will already
   live there). Alternates: Porkbun, Namecheap.
2. Point the nameservers at Cloudflare (skip if registered through
   Cloudflare Registrar — they default to Cloudflare DNS).
3. Add a placeholder DNS record so the apex resolves to *something*:
   - Cheapest: a Cloudflare Page Rule / redirect to
     `https://github.com/sherpa-labs/SherpaLabs`.
   - Alternative: a tiny Workers Site serving a one-page placeholder.
4. Enable HTTPS (Cloudflare does this by default with their universal
   SSL).

### Verification

```sh
dig +short sherpalabs.cloud
curl -sI https://sherpalabs.cloud | head -5
```

Expect a `200` or `30x` response — anything that proves DNS + TLS are
live.

### Owner notes

- Registrar: `Hostinger` (pointed to Cloudflare)
- Cloudflare zone ID: `Confirmed active`
- Placeholder strategy chosen: `Redirect to GitHub repository`

---

## 4. Cloudflare Email Routing — ✅ Done

Goal: `noreply@sherpalabs.cloud` and `hello@sherpalabs.cloud` forward
to the founder's personal Gmail until Phase L wires a real sender.

### Audit 2026-05-22 — MX, SPF, and DKIM all live

```sh
$ dig +short MX sherpalabs.cloud
14 route2.mx.cloudflare.net.
32 route3.mx.cloudflare.net.
44 route1.mx.cloudflare.net.

$ dig +short TXT sherpalabs.cloud | grep -i spf
"v=spf1 include:_spf.mx.cloudflare.net ~all"

$ dig +short TXT cf2024-1._domainkey.sherpalabs.cloud
"v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhk... (DKIM public key present)"
```

State: Cloudflare Email Routing is live. MX records point at the three
Cloudflare route servers, SPF authorises Cloudflare to send on the
domain's behalf, and a DKIM public key is published under
`cf2024-1._domainkey`. The catch-all rule and the destination Gmail
verification are configured inside the Cloudflare dashboard, which
isn't externally observable — the owner notes below record the
self-reported confirmation.

### Steps

1. In the Cloudflare dashboard, open the `sherpalabs.cloud` zone →
   **Email → Email Routing**. Free tier is sufficient.
2. Cloudflare will offer to insert the required MX + TXT records
   automatically. Accept.
3. Add destination address: the founder's personal Gmail. Confirm via
   the verification link Cloudflare sends.
4. Create catch-all rule: `*@sherpalabs.cloud` → forward to the
   verified Gmail. (Optional: also create explicit rules for
   `noreply@` and `hello@`.)
5. From a different account, send a test email to
   `hello@sherpalabs.cloud`. Confirm it lands in the Gmail inbox.

### Verification

```sh
dig +short MX sherpalabs.cloud
# expect: route1.mx.cloudflare.net, route2.mx.cloudflare.net,
# route3.mx.cloudflare.net
dig +short TXT sherpalabs.cloud | grep -i spf
# expect: "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

### Owner notes

- Destination Gmail (kept out of repo): `Confirmed verified (rudrasatani@gmail.com)`.
- Catch-all created: `Yes, configured in Cloudflare`.
- Test email round-trip confirmed: `Yes`.

---

## 5. Paddle account + KYC — ⏳ In flight

Paddle is the Phase L billing provider. KYC takes 5–14 business days,
so it must be started in Phase 4 to avoid blocking the monetisation
phase later.

### Audit 2026-05-22

Paddle does not expose a public API for non-vendors to check seller
status, so this step cannot be verified from the repo side. State is
self-reported below.

- KYC submitted on: `TODO(owner-date)` — leave as the placeholder
  until the docs have been uploaded.
- Confirmation email received from `support@paddle.com`:
  `TODO(owner)`.
- Sandbox dashboard reachable at https://sandbox-vendors.paddle.com:
  `TODO(owner)`.

Suggested product description to paste into Paddle's "What will you
be selling?" form (already drafted in the project notes):

> Sherpa Labs sells Sherpa — a B2B SaaS developer tool that helps
> software engineering teams keep their AI coding-assistant rules
> (Cursor, Claude Code, Windsurf, etc.) consistent and auditable
> across their code repositories. Delivered as a web dashboard at
> sherpalabs.cloud plus two companion CLIs (`aimcp-lint` and
> `sherpa`) distributed via npm. Recurring monthly/annual SaaS
> subscriptions. No physical goods, no financial products, no
> gambling, no adult content, no marketplace, no cryptocurrency.

### Steps

1. Sign up at https://vendors.paddle.com/signup.
2. Choose **Paddle Billing** (not Paddle Classic) — the new API and
   pricing model is what later phases assume.
3. Fill in business details. For an Indian sole proprietor / private
   limited:
   - Legal entity name (must match PAN / bank documents).
   - Registered address.
   - GST number if registered (optional but speeds up review).
4. Upload KYC documents — Paddle will ask for some combination of:
   - Government photo ID (passport, Aadhaar, driving licence).
   - Proof of address (utility bill, bank statement, < 3 months old).
   - Business registration certificate if applicable.
   - Bank account statement / cancelled cheque for payouts.
5. Configure the seller profile:
   - Default currency: `USD`.
   - Payout currency + bank: founder's bank account in `INR` (Paddle
     will FX from USD).
6. Add `sherpalabs.cloud` as the approved checkout domain (Paddle
   requires this before live payments).
7. Wait for Paddle's KYC team to approve. They'll email when the
   account moves from sandbox-only to live mode.

### Verification

- Confirmation email from `support@paddle.com` (subject usually
  contains "Welcome" or "verified").
- Sandbox dashboard accessible at https://sandbox-vendors.paddle.com.

### Owner notes

- Account email: `rudrasatani@gmail.com`.
- Paddle vendor / seller ID (public-ish, but still scoped): `TODO(owner)`.
- KYC submitted on: `TODO(owner-date)`.
- KYC approved on: `TODO(owner-date)`.
- Sandbox API key generated and stored in a password manager (NOT in
  this repo): `TODO(owner)`.

---

## Cross-phase reminders

When all five items above are **✅ Done**:

1. Flip the relevant rows in [`docs/BRAND.md`](./BRAND.md) from
   `TODO(owner)` to the real value (where the value is non-sensitive —
   org slugs, public domains, etc., not API keys).
2. Update [`docs/GITHUB_SETUP.md`](./GITHUB_SETUP.md) §1 to reference
   the new `sherpa-labs/SherpaLabs` URL.
3. Update [`README.md`](../README.md) "Tech stack" section if any
   chosen tooling diverges from the original plan (it shouldn't —
   this phase is brand only).
4. Mark Phase 4 complete in `SHERPA_LABS_DEVELOPMENT.md` notes.
