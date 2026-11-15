import { z } from 'zod';

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
  if (n === 1) return 'Three ways to ride Addo in 2027';
  if (n === 2) return 'What four days in Addo actually look like';
  if (n === 4) return 'Last one from us about 2027';
  return c.dar2.remaining === 0 ? 'Darlington Trip 2 is sold out, a Nyati update' : c.dar2.sold === 0 ? 'Darlington Trip 2: entries open for 2027' : `${c.dar2.remaining} spots left on Darlington Trip 2`;
}