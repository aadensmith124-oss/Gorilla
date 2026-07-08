---
name: Order fee/discount model
description: How payment-method fees and discount codes must be applied consistently across all checkout paths (cashapp, crypto, balance, deposits) in this marketplace app.
---

Manual payment methods (CashApp, Chime, Zelle) support an admin-configurable fee percentage (`{method}_fee` site setting). Two different fee models exist depending on flow direction:

- **Deposits** (wallet top-up, no cart items): fee reduces the amount credited to the user's balance. `creditAmount = grossAmount * (1 - feeRate)`. The transaction description must embed the *actual* configured fee percentage, not a hardcoded value — a prior bug hardcoded "20% fee" text regardless of the real fee.
- **Purchases** (cart checkout with items): fee is a surcharge added on top of the item total that the buyer must pay extra. Compute `feeAmount` server-side from the configured fee and item total, then set `order.total = itemsTotal + feeAmount` so admin's manual "Paid" confirmation and the amount displayed to the buyer always match.

**Why:** Order creation across `/api/orders/cashapp` and `/api/orders/crypto` funnels through `storage.createPendingOrder`, while wallet-balance checkout uses a separate `storage.createOrder`. These two code paths drifted — `createPendingOrder` originally had no discount-code support and no fee handling, so cart discounts and CashApp/Crypto surcharges were silently dropped for those payment methods even though the UI implied they applied.

**How to apply:** Any new checkout path (or changes to discount/fee logic) must be applied to *both* `createOrder` and `createPendingOrder` in `server/storage.ts`, since they duplicate the discount + rank-discount calculation. Never compute fee/discount client-side and trust it — always recompute server-side and return the authoritative total in the API response for the frontend to display.
