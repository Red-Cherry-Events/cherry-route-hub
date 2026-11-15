import { build } from './tda-newsletter-approved';
import type { NewsletterCounts } from '../tda-newsletter';

export async function renderTdaNewsletter({ number, name, counts, unsubscribeUrl }: { number: number; name?: string; counts: NewsletterCounts; unsubscribeUrl: string }) {
  const first = (name?.trim().split(/\s+/)[0] ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  const emails = build(first, counts.dar1.sold, counts.dar2.sold, counts.nyati.sold);
  const email = emails[number];
  if (!email) throw Error('Choose email 1 to 4');
  const href = unsubscribeUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return String(email[1]).replace('href="#"', `href="${href}"`);
}