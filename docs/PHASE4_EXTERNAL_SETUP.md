# Phase 4 — External Setup Checklist

The five items below cannot be completed from the repo alone — they
require account access, payments, or KYC documents. This file tracks
their state so we don't lose track of what's been done.

Conventions:

- **🔜 Not started** — nothing done yet.
- **⏳ In flight** — submitted, waiting on a third party (DNS prop,
  KYC review, etc.).
- **✅ Done** — confirmed working end-to-end.
- `TODO(owner)` — a value the owner has to fill in once the step is
  done. Don't paste secrets here; just confirm "filled in" or paste
  the public identifier (account ID, domain registrar reference).

When a section flips to **✅ Done**, leave the verification commands
in place so future-you can re-run them.

---

## 1. npm scope reservation — 🔜 Not started

Brand call: scope is `@sherpa-labs` (kebab). Existing package
`@sherpa-labs/shared-config` already publishes under this scope, but
the scope itself has not been **claimed on the npm registry** under an
organisation account. Until it is, anyone could publish
`@sherpa-labs/anything` first.

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

- npm org slug filled in: `TODO(owner)` — confirm matches the value
  in `docs/BRAND.md`.
- Founder npm username with Owner role: `TODO(owner)`.

---

## 2. GitHub organisation `sherpa-labs` — 🔜 Not started

The repo currently lives at `rudrasatani13/SherpaLabs`. Phase 4 calls
for moving it under a `sherpa-labs/` org so the brand name and the
GitHub URL line up.

### Steps

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

- Org created: `TODO(owner)`.
- Repo transferred: `TODO(owner)`.
- Branch protection re-applied: `TODO(owner)`.

---

## 3. Domain `sherpalabs.cloud` — 🔜 Not started

Phase 4 deliverable: the domain resolves to *something* (even a
placeholder page) so emails and OG previews work later.

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

- Registrar: `TODO(owner)`.
- Cloudflare zone ID: `TODO(owner)` — not a secret; only the API
  token is.
- Placeholder strategy chosen: `TODO(owner)`.

---

## 4. Cloudflare Email Routing — 🔜 Not started

Goal: `noreply@sherpalabs.cloud` and `hello@sherpalabs.cloud` forward
to the founder's personal Gmail until Phase L wires a real sender.

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

- Destination Gmail (kept out of repo): `TODO(owner)` — confirmed
  verified.
- Catch-all created: `TODO(owner)`.
- Test email round-trip confirmed: `TODO(owner)`.

---

## 5. Paddle account + KYC — 🔜 Not started

Paddle is the Phase L billing provider. KYC takes 5–14 business days,
so it must be started in Phase 4 to avoid blocking the monetisation
phase later.

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

- Account email: `TODO(owner)`.
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
