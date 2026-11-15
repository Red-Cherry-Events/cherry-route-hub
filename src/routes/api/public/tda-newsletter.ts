import { createFileRoute } from '@tanstack/react-router';
import { tdaCorsHeaders } from '@/lib/tda-enquiry';
export const Route=createFileRoute('/api/public/tda-newsletter')({server:{handlers:{
  OPTIONS:async({request})=>new Response(null,{status:204,headers:tdaCorsHeaders(request.headers.get('origin'))}),
  POST:async({request})=>{const {handleTdaNewsletter}=await import('@/lib/tda-newsletter.server');return handleTdaNewsletter(request);},
}}});