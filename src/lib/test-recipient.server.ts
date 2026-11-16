// Limits admin test/preview email recipients to the caller's own address or
// Red Cherry team mailboxes, so admin tools can't be used to mail arbitrary people.
const TEAM_DOMAIN = "@redcherryevents.co.za";

export function allowedTestRecipient(requested: string | null | undefined, callerEmail: string | null | undefined): string {
  const own = (callerEmail ?? "").trim().toLowerCase();
  const to = (requested ?? "").trim().toLowerCase() || own;
  if (!to) throw new Error("No admin email address to send to");
  if (to !== own && !to.endsWith(TEAM_DOMAIN)) {
    throw new Error("Test emails can only go to your own address or a Red Cherry team address");
  }
  return to;
}
