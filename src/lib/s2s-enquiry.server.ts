import { parseS2sEnquiry, S2S_ENQUIRY_ORIGINS, S2S_LIST_IDS, S2S_NORTH_EVENT_ID, S2S_RIDE_LABELS, s2sCorsHeaders, shouldRecordNorthInterest } from './s2s-enquiry';
import { consumeEnquiryQuota, ENQUIRY_QUOTAS, readEnquiryFields } from './website-enquiry-request.server';
import { syncContactToLists } from './tda-enquiry.server';
import { TDA_TEAM_EMAIL } from './tda-enquiry';

export async function syncS2sEnquiryToEverlytic(id: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: row } = await supabaseAdmin.from('website_enquiries').select('email, consent, event_key').eq('id', id).maybeSingle();
  if (!row?.consent || row.event_key !== 'sea-to-sea') return { synced: false };
  try {
    const username = process.env['EVERLYTIC_USERNAME'];
    const key = process.env['EVERLYTIC_API_KEY'];
    if (!username || !key) throw new Error('Everlytic is not connected');
    await syncContactToLists(row.email, S2S_LIST_IDS, username, key);
    await supabaseAdmin.from('website_enquiries').update({ everlytic_synced: true, everlytic_error: null }).eq('id', id);
    return { synced: true };
  } catch (error) {
    await supabaseAdmin.from('website_enquiries').update({ everlytic_error: (error as Error).message.slice(0, 300) }).eq('id', id);
    return { synced: false };
  }
}

export async function handleS2sEnquiry(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: s2sCorsHeaders(origin) });
  if (!origin || !S2S_ENQUIRY_ORIGINS.includes(origin)) return json({ ok: false, error: 'This form only accepts enquiries from seatosea.co.za.' }, 403);
  let fields: Record<string, unknown>;
  try { fields = await readEnquiryFields(request); } catch { return json({ ok: false, error: 'Please check the form and try again.' }, 400); }
  const parsed = parseS2sEnquiry(fields);
  if (parsed.kind === 'honeypot') return json({ ok: true });
  if (parsed.kind === 'invalid') return json({ ok: false, error: parsed.error }, 400);
  const e = parsed.enquiry;
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  if (!(await consumeEnquiryQuota(supabaseAdmin, 's2s-enquiry-all', 'all', ENQUIRY_QUOTAS.overall.limit, ENQUIRY_QUOTAS.overall.seconds)) || !(await consumeEnquiryQuota(supabaseAdmin, 's2s-enquiry-email', e.email, ENQUIRY_QUOTAS.email.limit, ENQUIRY_QUOTAS.email.seconds))) return json({ ok: false, error: "We've received a lot of messages. Please try again in a little while or call (041) 581 5335." }, 429);
  const now = new Date().toISOString();
  const { data: row, error } = await supabaseAdmin.from('website_enquiries').insert({ event_key: 'sea-to-sea', name: e.name, email: e.email, phone: e.phone, trip: S2S_RIDE_LABELS[e.ride], message: e.team_size ? `Team size: ${e.team_size}\n\n${e.message}` : e.message, consent: e.consent, consent_at: e.consent ? now : null }).select('id').single();
  if (error || !row) return json({ ok: false, error: 'Something went wrong. Please try again or call (041) 581 5335.' }, 500);
  const { sendTemplateEmail } = await import('@/lib/email-templates/send-email');
  const data = { ...e, ride: S2S_RIDE_LABELS[e.ride], receivedAt: now };
  for (const [template, recipient, replyTo, column] of [['s2s-enquiry-notification', TDA_TEAM_EMAIL, e.email, 'notified'], ['s2s-enquiry-auto-reply', e.email, TDA_TEAM_EMAIL, 'auto_replied']]) {
    try {
      const sent = await sendTemplateEmail(template, recipient, { templateData: data, replyTo, idempotencyKey: `${template}-${row.id}` });
      if (sent.sent) await supabaseAdmin.from('website_enquiries').update({ [column]: true }).eq('id', row.id);
    } catch (err) { console.error('s2s-enquiry email failed', template, (err as Error).message); }
  }
  if (shouldRecordNorthInterest(e)) {
    try {
      const key = process.env['EVENT_INTEREST_KEY'];
      if (!key) throw new Error('Event interest is not configured');
      const { handleEventInterest } = await import('./event-interest-handler.server');
      const result = await handleEventInterest(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Event-Interest-Key': key }, body: JSON.stringify({ event_id: S2S_NORTH_EVENT_ID, name: e.name, email: e.email, phone: e.phone ?? undefined, consent: true, topic: 'North entry alerts', source: 'Sea to Sea website enquiry' }) }));
      if (!result.ok) throw new Error(`North interest failed (${result.status})`);
    } catch (err) { console.error('s2s-enquiry North interest failed', (err as Error).message); }
  }
  if (e.consent) {
    const outcome = await Promise.race([syncS2sEnquiryToEverlytic(row.id), new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), 10_000))]);
    if (outcome === 'timeout') await supabaseAdmin.from('website_enquiries').update({ everlytic_error: 'Timed out. Use retry in Admin.' }).eq('id', row.id).eq('everlytic_synced', false);
  }
  return json({ ok: true });
}