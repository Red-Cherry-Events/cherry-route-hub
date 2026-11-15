import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
export const manageTdaNewsletter=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((v:unknown)=>z.object({action:z.enum(['list','preview','test','toggle','retry']),number:z.number().int().min(1).max(4).optional(),enabled:z.boolean().optional(),id:z.string().uuid().optional()}).parse(v)).handler(async({context,data})=>{
  const {data:role,error}=await context.supabase.from('user_roles').select('role').eq('user_id',context.userId).eq('role','admin').maybeSingle();
  if(error||!role) throw Error('Admins only');
  const {supabaseAdmin:admin}=await import('@/integrations/supabase/client.server');
  const {newsletterPreview,sendNewsletterTest,syncNewsletter}=await import('./tda-newsletter.server');
  if(data.action==='toggle') {if(data.enabled) throw Error('Individual Everlytic delivery still needs verification. The series cannot be enabled yet.');const {error}=await admin.rpc('set_tda_newsletter_enabled',{_enabled:false});if(error) throw Error('Could not save the switch.');return {ok:true};}
  if(data.action==='retry') {if(!data.id) throw Error('Choose a sign-up');return {ok:await syncNewsletter(admin,data.id)};}
  if(data.action==='preview'||data.action==='test') {
    if(!data.number) throw Error('Choose an email');
    const {data:identity,error}=await context.supabase.auth.getUser();
    if(error||identity.user?.id!==context.userId||!identity.user.email) throw Error('Could not verify your email');
    if(data.action==='test') return sendNewsletterTest(admin,identity.user.email,String(identity.user.user_metadata?.full_name??''),data.number);
    return newsletterPreview(admin,data.number,'Shaun','https://riderhub.redcherryevents.co.za/tda-newsletter-unsubscribe?test=1');
  }
  const {data:rows,error:re}=await context.supabase.from('tda_newsletter_signups').select('id,email,name,source,consent_at,status,next_email,series_started_at,everlytic_synced,everlytic_error').order('consent_at',{ascending:false}).limit(2000);
  const {data:config}=await context.supabase.from('tda_newsletter_campaign').select('*').eq('id',true).maybeSingle();
  if(re) throw Error('Could not load sign-ups');
  return {rows:rows??[],config:config??{enabled:false,delivery_verified:false}};
});