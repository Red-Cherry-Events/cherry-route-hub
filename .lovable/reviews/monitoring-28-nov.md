# Monitoring verification, 28 November 2026

## Rules checked
- Visitors must be able to open the app even if their browser refuses storage.
- Changing video size must not restart the race stream.
- Admins must be able to send workflow emails to named crew or partners, separately from restricted test copies.

## Storage coverage
Read every localStorage/sessionStorage call site and its surrounding guard in these 28 files. Router startup now installs separate page-local storage objects when getters or a write probe fail, before route rendering, effects, auth initialization or user actions. Normal working storage remains unchanged. No browser-storage calls exist in server jobs or database functions.

| Surface | Existing behavior | Outcome |
| --- | --- | --- |
| Managed previewAuthStorage and client; shared auth session | Published storage getter unguarded; session rejection unresolved | Startup fallback covers generated files without modifying them; session rejection settles signed out |
| App shell and home feature discovery | Unguarded preference reads/writes | Covered by startup fallback |
| Install prompt and web push opt-in | Unguarded dismissal storage | Covered by startup fallback |
| Crew event choice, department onboarding/packing, admin rental equipment link | Unguarded reads/writes | Covered by startup fallback |
| Entry auto-link and autosync effects | Unguarded storage timestamps | Covered by startup fallback |
| Event chat rules | Unguarded first-post read/write | Covered by startup fallback |
| Offline pack | Snapshot/meta reads/writes guarded; clear metadata unguarded | Covered by startup fallback |
| App preloader, password prompt, root retry handling | Already guarded | Unchanged, fallback also covers them |
| Assistant hint, native push prompt, tracking tutorial | Already guarded | Unchanged, fallback also covers them |
| Live tracking map favourites/follow/routes/team choices, route-map satellite choice | Already guarded | Unchanged, fallback also covers them |
| Tracking panel queue, session flags, manual stops | Already guarded | Unchanged, fallback also covers them |
| Native tracking/push token helpers | Already guarded | Unchanged; no native project edits |
| Analytics, promo analytics, shuffled promos | Already guarded | Unchanged, fallback also covers them |
| Known accounts, rider favourites, crew landing, auth pending-entry fields | Already guarded | Unchanged, fallback also covers them |

Fallback is not durable: closing or refreshing a storage-blocked page loses its page-local session/preferences. It never shares state across visitors or server requests.

## Stream coverage
ICE Info and spectator live surfaces share StreamPlayer. Its countdown mounts IceStreamVideo when opened or when time expires. No other video-size switch reparents a player. Both native fullscreen and the phone fallback keep the same DOM iframe. The fallback uses the browser top layer when supported and fixed viewport dimensions otherwise, with Escape, focus handling and overflow restoration unchanged. Route/live map fullscreen is unrelated and was not changed.

Verified signed-in ICE on 390x844 and 1280x1800: fallback fills the viewport, enters/exits, preserves iframe identity AND its browsing-context variable, with no extra embed request. YouTube content was substituted with an inert playback fixture for deterministic reload detection. Actual iPhone/YouTube playback was not device-tested.

## Workflow email coverage
Read Email Workflows' Test and Send to others actions, Email Builder's test action, sendWorkflowStepTest, shared recorded sendWorkflowEmail, scheduled queue, and the welcome/apology test actions. Test copies remain caller-only. Welcome/apology test recipient restrictions are unchanged. Only explicit Send to others uses the new authenticated admin-only action with validated/deduplicated external addresses (maximum 20), normal delivery/idempotency and send records. Scheduled queue, sender settings, unsubscribe handling and settled send records are unchanged.

Verified the signed-in admin button with partner@example.org: it reaches sendWorkflowStepToOthers. The request was intercepted before delivery. No real email was sent, and external delivery acceptance was not tested.

## Verification
- 31 focused regression tests pass, including blocked getters/writes, isolated fallbacks, partner recipients, caller-only tests, existing security and ICE rules.
- Storage-blocked home and sign-in pages render; page-local values read back.
- Latest automated build reports OK.