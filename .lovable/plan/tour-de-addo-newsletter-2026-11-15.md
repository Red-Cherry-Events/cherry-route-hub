# Tour de Addo newsletter

## What Shaun gets
- A browser-ready newsletter endpoint at `https://riderhub.redcherryevents.co.za/api/public/tda-newsletter`, accepting the website's multipart form and returning `{ok:true}`.
- Sign-ups stored immediately, with consent time, email deduplication and fresh consent after a local unsubscribe. Repeat active sign-ups do not restart the series.
- Opt-out-preserving sync to Everlytic lists **102527 (Enquiry - TDA)** and **102600 (Bicycles)**. Sync failures never turn a stored sign-up into a failed response.
- **Admin > Comms > Tour de Addo newsletter**: four full email previews, signed-in-admin-only test buttons, subscriber status/progress and a clearly labelled series switch, initially **OFF**.
- Four personalised emails, starting at email 1 when enabled, then days 7, 14 and 21 from each subscriber's series start. No backdated catch-up sends for people who signed up while off.

## Delivery and copy
These are marketing emails, so they must use **Everlytic**, not Lovable's app-email sender. Keep the existing sender setup untouched. Verify Everlytic's supported campaign delivery method and sender before enabling any delivery; a provider limitation must leave the switch unavailable rather than silently use another service.

Use the supplied photos, green/lime styling, M&G Investments lock-up, footer, reply-to and copy. Expected temporary photo 404s do not block setup. Every email has an unsubscribe link.

Make the few necessary truth-preserving copy changes:
- Zero sold: say **Entries open**, including subject/preheader, rather than a remaining-spots headline.
- Sold out: say **Sold out, waiting list** and remove that trip's booking button.
- Do not claim Trip 1 sold first or Trip 2 is filling unless the live figures support it.
- Omit the unverified promise that the next chance is 2028, and the promise of future occasional news, unless a separate news programme exists.
- No invented early-bird deadline. Use the supplied R15 500 Darlington email price; the Hub currently stores R15 550, which this task will not change.

## Stop checks and live figures
Before every subscriber send, match the normalised email against synced entrant emails for Entry Ninja events **84152** and **84785**. No name-only matching. Mark matches entered and stop; also stop for local/provider unsubscribe. Read availability from the same class-counting helper as the public feed, directly from current stored entries, without the feed's HTTP cache. Stop the series when both Darlington Trip 2 and Nyati are sold out.

The current Entry Ninja refresh runs at **06:00, 10:00, 14:00 and 18:00 UTC**, so stored entry checks are not real-time. Show the latest available sync timestamp and describe that limitation in the handover.

## Technical details
- Reuse the enquiry CORS allow-list, atomic quota RPC and Everlytic membership helper. Accept `_gotcha`, `email`, optional `name` and `source`; reject malformed email with a clear 400 response.
- Keep newsletter consent/progress private with admin-only access. Use an atomic database function for signup/re-consent to prevent duplicate races, and durable send claims to prevent concurrent double sends.
- Keep newsletter marketing dispatch separate from the existing operational workflow sender. Reuse the existing private-key hourly workflow callback if Everlytic cannot provide the required per-person delay and live-data checks. No additional permanent scheduler.
- Add token-protected local unsubscribe and check provider opt-outs before every send. Re-consent clears only local unsubscribe, never external opt-outs.
- Verify admin identity server-side for previews, switches and test sends. Test recipient is taken from verified account identity, never a browser-supplied address.
- Record architecture in AGENTS.md and progress in roadmap.md.

## Verification and production impact
- Test form validation, CORS/preflight, honeypot, repeat signup, re-consent, scheduling, disabled-state protection, entrant stop, sell-out rules, admin access and concurrent-send safeguards.
- Verify a stored test signup and remove only the test record. Verify admin previews on desktop and phone. Send only an admin test if the Everlytic API supports the verified delivery path.
- Preview and live share storage: schema changes take effect immediately, but the series stays OFF. Publish the endpoint/admin page after verification. The separate Astro site is not changed by this task.
- Handover includes the exact endpoint, CORS evidence, admin location, sender, matching/freshness, copy changes and any checks that could not be completed.