import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/public/s2s-enquiry')({ server: { handlers: {
  OPTIONS: async ({ request }) => {
    const { s2sCorsHeaders } = await import('@/lib/s2s-enquiry');
    return new Response(null, { status: 204, headers: s2sCorsHeaders(request.headers.get('origin')) });
  },
  POST: async ({ request }) => {
    const { handleS2sEnquiry } = await import('@/lib/s2s-enquiry.server');
    return handleS2sEnquiry(request);
  },
} } });