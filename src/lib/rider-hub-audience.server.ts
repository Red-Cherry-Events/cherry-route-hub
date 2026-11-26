// Copies confirmed Rider Hub accounts into the Everlytic "RiderHub signups" list.
// Never overwrites an existing contact status or mapping, so opt-outs and bounces stay put.
import { everlyticRequest } from './everlytic.server';
import { mayAddMembership } from './entry-interest-audience';

export const RIDER_HUB_LIST = '147394';

type Admin = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>; from: (t: string) => any };

export async function syncRiderHubContact(email: string, fullName: string | null, u: string, k: string) {
  const lookup = async () => {
    const raw = await everlyticRequest(`/api/2.0/contacts?filters[email]=${encodeURIComponent(email)}&count=25`, 'GET', u, k);
    return (raw.collection ?? []).map((i: { data?: Record<string, unknown> }) => i.data ?? i).find((c: Record<string, unknown>) => String(c.email).toLowerCase() === email);
  };
  let contact = await lookup();
  if (!contact) {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    const named = parts.length && !fullName?.includes('@');
    await everlyticRequest('/api/2.0/contacts', 'POST', u, k, {
      contact_email: email, list_id: RIDER_HUB_LIST,
      ...(named ? { contact_name: parts[0], contact_lastname: parts.slice(1).join(' ') } : {}),
    });
    contact = await lookup();
  }
  if (!contact?.id) throw new Error('Could not verify Everlytic contact');
  const membership = async () => {
    try { return await everlyticRequest(`/api/2.0/list_subscriptions/${RIDER_HUB_LIST}/${contact.id}`, 'GET', u, k); }
    catch (e) { if (e && typeof e === 'object' && 'status' in e && e.status === 404) return null; throw e; }
  };
  const mapping = await membership();
  if (mayAddMembership(contact, mapping)) {
    await everlyticRequest(`/api/2.0/list_subscriptions/${RIDER_HUB_LIST}`, 'POST', u, k, { contact_id: contact.id, email_status: 'subscribed' });
    if (!(await membership())) throw new Error('Could not verify list membership');
  }
}

export async function processRiderHubAudience(admin: Admin, limit = 150) {
  const u = process.env['EVERLYTIC_USERNAME'], k = process.env['EVERLYTIC_API_KEY'];
  if (!u || !k) return { skipped: 'no credentials' };
  const { data, error } = await admin.rpc('rider_hub_audience_pending', { _limit: limit });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; email: string; full_name: string | null }[];
  let synced = 0, failed = 0;
  for (const r of rows) {
    try {
      await syncRiderHubContact(r.email, r.full_name, u, k);
      await admin.from('profiles').update({ everlytic_synced_at: new Date().toISOString(), everlytic_error: null }).eq('id', r.id);
      synced++;
    } catch (e) {
      failed++;
      await admin.from('profiles').update({ everlytic_error: (e as Error).message.slice(0, 300) }).eq('id', r.id);
    }
  }
  return { checked: rows.length, synced, failed };
}
