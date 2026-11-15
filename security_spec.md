# Security Specification — Global Presell Commerce

## 1. Data Invariants
1. Every private user-owned resource (`categories`, `products`, `affiliateLinks`, `pages`, `pageVersions`, `userTemplates`, `campaigns`, `whatsappWidgets`, `paymentGateways`, `userSettings`) MUST have `ownerId == request.auth.uid` on create and read/list, and `ownerId` is immutable on update.
2. User PII (`email`, `companyName`, `defaultPolicyEmail`) is isolated in `/users/{userId}/private/info` readable and writable strictly by `userId == request.auth.uid`.
3. Publicly published pages live in `/publishedPages/{publicKey}` with no secret credentials. Public `get` and `list` are strictly gated by `resource.data.status == 'published'` (or owner access).
4. Public short-link redirects live in `/redirectLinks/{shortCode}` where `get` is allowed only if `resource.data.isActive == true` (or owner), and `list` is restricted to `resource.data.ownerId == request.auth.uid`.
5. `clickEvents` are immutable telemetry logs: public visitors can `create` events ONLY when the referenced `publishedPages/{publicKey}` exists (`exists(...)`) and timestamps equal `request.time`. Only `resource.data.ownerId == request.auth.uid` can `get` or `list` click events. `update` and `delete` are forbidden.
6. All document IDs must match `^[a-zA-Z0-9_-]+$` and be <= 128 chars. All strings enforce `.size()` bounds. Timestamps enforce `request.time`.

## 2. Dirty Dozen Adversarial Payloads
1. **Identity Spoofing on Product**: Attacker sets `ownerId: "victim_uid"` when creating `/products/p1`. -> **DENIED** (`incoming().ownerId == request.auth.uid`).
2. **Owner Hijack on Update**: Attacker updates `/pages/pg1` changing `ownerId` to attacker UID. -> **DENIED** (`incoming().ownerId == existing().ownerId`).
3. **Shadow Field Injection**: Attacker includes `isAdmin: true` in `/users/u1` create payload. -> **DENIED** (`keys().hasOnly(...)`).
4. **PII Blanket Read**: Signed-in non-owner reads `/users/victim/private/info`. -> **DENIED** (`isOwner(userId)`).
5. **Unverified Email Write**: User with `email_verified: false` tries to create `/products/p2`. -> **DENIED** (`isVerifiedUser()`).
6. **ID Poisoning**: Attacker creates `/categories/` with 500-char ID containing `/../`. -> **DENIED** (`isValidId()`).
7. **Unpublished Page Scrape**: Anonymous user queries `/publishedPages/draft_secret` where `status == 'unpublished'`. -> **DENIED** (`resource.data.status == 'published'`).
8. **ClickEvent Forgery for Non-Existent Page**: Attacker writes `/clickEvents/e1` with fake `publicKey: "ghost_123"`. -> **DENIED** (`exists(/databases/.../publishedPages/...)`).
9. **ClickEvent Timestamp Spoofing**: Attacker sends `createdAt: "2020-01-01"` instead of server timestamp. -> **DENIED** (`incoming().createdAt == request.time`).
10. **ClickEvent Tampering**: Attacker tries to update or delete `/clickEvents/e1` to inflate conversions. -> **DENIED** (`allow update, delete: if false`).
11. **Value Poisoning on Page**: Attacker sends `title` as a 5000-char string or number. -> **DENIED** (`isValidPage` size and type checks).
12. **Blanket List Query on Private Collection**: Non-owner runs `getDocs(collection(db, 'products'))` without owner filter. -> **DENIED** (`allow list: if isSignedIn() && resource.data.ownerId == request.auth.uid`).
