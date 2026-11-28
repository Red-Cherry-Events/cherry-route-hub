// Both actions verify admin access before reading the step or delivering mail.
export async function deliverWorkflowStep(data: { stepId: string; to?: string[] }, context: any) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWorkflowEmail } = await import("./email-workflows.server");

    const { data: step, error } = await supabaseAdmin
      .from("event_email_steps")
      .select(
        "id, campaign_id, subject, heading, body, blocks, cta_label, cta_url, banner_url, image_urls, template_name, event_email_campaigns(id, event_id, events(id, name, event_date, location, logo_url, cover_url))",
      )
      .eq("id", data.stepId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!step) throw new Error("Email not found");

    const event = (step as any).event_email_campaigns?.events;
    if (!event) throw new Error("This workflow has no event attached");

    // Extra named recipients (e.g. crew or partners who aren't entered):
    // real sends, recorded so they're never repeated.
    if (data.to?.length) {
      for (const to of data.to) {
        await sendWorkflowEmail(supabaseAdmin, {
          campaignId: (step as any).campaign_id,
          stepId: (step as any).id,
          event,
          step,
          to,
          name: null,
        });
      }
      return { to: data.to.join(", ") };
    }

    const to = (context as any).claims?.email as string | undefined;
    if (!to) throw new Error("Your account has no email address");

    await sendWorkflowEmail(supabaseAdmin, {
      campaignId: (step as any).campaign_id,
      stepId: `test-${(step as any).id}-${Date.now()}`,
      event,
      step,
      to,
      name: "Test",
      record: false,
    });
    return { to };
}

