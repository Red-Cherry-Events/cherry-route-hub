/** Keep a Child Alive, the donation-matching partner on every Sabrina Love event. */
export const KCA_URL = "https://www.keepachildalive.org";

/**
 * Public GivenGain page riders donate on. Default is the Sabrina Love Foundation's
 * "Donate Now" event set up for the Summer Challenge; admins can swap it in Settings.
 */
export const DEFAULT_KCA_DONATE_URL = "https://www.givengain.com/event/donate-now-7778";

/**
 * Only an https GivenGain page may be used as the donate link, so a typo or a pasted
 * organiser-dashboard link never reaches riders.
 */
export function isPublicGivenGainUrl(value?: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const isGivenGain = host === "givengain.com" || host.endsWith(".givengain.com");
    const isOrganiserPage = /^\/(my-|manage|admin)/i.test(url.pathname);
    return url.protocol === "https:" && isGivenGain && !isOrganiserPage;
  } catch {
    return false;
  }
}

/** The donate link riders see: the admin's page when it is valid, otherwise the default. */
export function kcaDonateUrl(value?: string | null): string {
  return isPublicGivenGainUrl(value) ? new URL(value!.trim()).toString() : DEFAULT_KCA_DONATE_URL;
}
