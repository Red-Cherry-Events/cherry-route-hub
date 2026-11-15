import { afterAll, expect, mock, test } from 'bun:test';
let row = null;
let interest = null;
let quotaAllowed = true;
const sent = [];
mock.module('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {
  rpc: async () => ({ data: quotaAllowed, error: null }),
  from: () => ({
    insert: (data) => ({ select: () => ({ single: async () => { row = { ...data, id: 'test-id' }; return { data: row, error: null }; } }) }),
    update: (patch) => ({ eq: async () => { row = { ...row, ...patch }; return { error: null }; } }),
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row }) }) }),
  }),
} }));
mock.module('@/lib/email-templates/send-email', () => ({ sendTemplateEmail: async (template) => { expect(row?.id).toBe('test-id'); sent.push(template); return { sent: true }; } }));
mock.module('./event-interest-handler.server', () => ({ handleEventInterest: async (request) => { interest = await request.json(); return Response.json({ ok: true }); } }));
mock.module('./tda-enquiry.server', () => ({ syncContactToLists: async () => { throw new Error('test provider unavailable'); } }));
const original = process.env['EVENT_INTEREST_KEY'];
process.env['EVENT_INTEREST_KEY'] = 'test-key';
const { handleS2sEnquiry } = await import('./s2s-enquiry.server');
afterAll(() => { if (original === undefined) delete process.env['EVENT_INTEREST_KEY']; else process.env['EVENT_INTEREST_KEY'] = original; mock.restore(); });
const request = (fields) => new Request('https://example.test/api/public/s2s-enquiry', { method: 'POST', headers: { Origin: 'https://seatosea.co.za', 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
test('store first, consented North interest and Everlytic failure still return success', async () => {
  const response = await handleS2sEnquiry(request({ name: 'Test', email: 'test@example.com', message: 'Question', ride: 'both', team_size: '4', consent: 'yes' }));
  expect(await response.json()).toEqual({ ok: true });
  expect(row.event_key).toBe('sea-to-sea');
  expect(row.message).toBe('Team size: 4\n\nQuestion');
  expect(row.consent_at).toBeString();
  expect(sent).toEqual(['s2s-enquiry-notification','s2s-enquiry-auto-reply']);
  expect(interest.event_id).toBe('2544f097-ba01-416a-8f51-dbd8af33f5de');
  expect(interest.consent).toBe(true);
  expect(row.everlytic_error).toBeString();
});
test('honeypot does not store or send', async () => { row=null;sent.length=0;const response=await handleS2sEnquiry(request({_gotcha:'bot'}));expect(await response.json()).toEqual({ok:true});expect(row).toBeNull();expect(sent).toHaveLength(0); });
test('quota denial does not store or send', async () => { quotaAllowed=false;const response=await handleS2sEnquiry(request({name:'Test',email:'test@example.com',message:'Question'}));expect(response.status).toBe(429);expect(row).toBeNull();expect(sent).toHaveLength(0); });