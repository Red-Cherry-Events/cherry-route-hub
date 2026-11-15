import { z } from 'zod';
import { build } from './email-templates/tda-newsletter-approved';

export const newsletterSchema = z.object({
  email: z.string().trim().max(255).email('Please check your email address.').transform(v => v.toLowerCase()),
  name: z.string().trim().max(120).optional().default(''),
  source: z.string().trim().max(500).optional().default(''),
});
export type TripCount = { sold: number; remaining: number; capacity: number };
export type NewsletterCounts = { dar1: TripCount; dar2: TripCount; nyati: TripCount; logo: string; checkedAt: string };
export function tripLine(t: TripCount) {
  return t.remaining === 0 ? 'Sold out, waiting list' : t.sold === 0 ? 'Entries open' : `${t.remaining} of ${t.capacity} spots left`;
}
export function seriesStopped(c: NewsletterCounts) { return c.dar2.remaining === 0 && c.nyati.remaining === 0; }
export function emailDue(start: string | null, n: number, now = Date.now()) {
  return start !== null && n >= 1 && n <= 4 && now >= Date.parse(start) + (n - 1) * 7 * 86400000;
}
export function newsletterSubject(n: number, c: NewsletterCounts) {
  return String(build('', c.dar1.sold, c.dar2.sold, c.nyati.sold)[n]?.[0] ?? '');
}