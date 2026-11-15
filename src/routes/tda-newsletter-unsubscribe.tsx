import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
const unsubscribe=createServerFn({method:'POST'}).inputValidator((v:unknown)=>z.object({token:z.string().uuid()}).parse(v)).handler(async({data})=>{
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {error}=await supabaseAdmin.from('tda_newsletter_signups').update({status:'unsubscribed',unsubscribed_at:new Date().toISOString()}).eq('unsubscribe_token',data.token);
  if(error) throw Error('Please try again.');return {ok:true};
});
export const Route=createFileRoute('/tda-newsletter-unsubscribe')({validateSearch:(v:Record<string,unknown>)=>({token:typeof v.token==='string'?v.token:'',test:v.test==='1'}),head:()=>({meta:[{title:'Tour de Addo newsletter preferences'},{name:'description',content:'Unsubscribe from M&G Investments Tour de Addo news.'},{property:'og:title',content:'Tour de Addo newsletter preferences'},{property:'og:description',content:'Manage your Tour de Addo newsletter subscription.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex'}]}),component:Unsubscribe});
function Unsubscribe(){const {token,test}=Route.useSearch();const run=useServerFn(unsubscribe);const [state,setState]=useState('');return <main className="mx-auto max-w-lg p-6 space-y-4"><h1 className="text-2xl font-bold">Tour de Addo news</h1><p>{test?'This is an email preview. Your subscription has not changed.':state==='done'?"You've been unsubscribed from Tour de Addo news.":'Unsubscribe from Tour de Addo news?'}</p>{!test&&state!=='done'&&<Button disabled={!z.string().uuid().safeParse(token).success||state==='busy'} onClick={async()=>{setState('busy');try{await run({data:{token}});setState('done');}catch{setState('Please try again.');}}}>Unsubscribe</Button>}{state.startsWith('Please')&&<p className="text-destructive">{state}</p>}</main>;}