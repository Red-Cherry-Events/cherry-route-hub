import { z } from "zod";

export const S2S_ENQUIRY_ORIGINS = ["https://seatosea.co.za", "https://www.seatosea.co.za", "https://sea-to-sea-red-cherry-events.vercel.app"];
export const S2S_LIST_IDS = ["102756", "97023"];
export const S2S_NORTH_EVENT_ID = "2544f097-ba01-416a-8f51-dbd8af33f5de";
export const S2S_RIDE_LABELS = { south: "Sea to Sea South", north: "Sea to Sea North", both: "Both / not sure yet" };
export function s2sCorsHeaders(origin: string | null): Record<string, string> {
  return { ...(origin && S2S_ENQUIRY_ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin } : {}), "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Accept", "Access-Control-Max-Age": "86400", Vary: "Origin" };
}
const optional = (max: number) => z.string().trim().max(max).optional().transform(v => v || null);
export const s2sEnquirySchema = z.object({
  name: z.string().trim().min(1, "Please add your name.").max(120, "Your name is too long."),
  email: z.string().trim().max(255).email("Please check your email address.").transform(v => v.toLowerCase()),
  phone: optional(40),
  ride: z.enum(["south", "north", "both"], { error: "Please pick south, north or both." }).default("both"),
  team_size: optional(40),
  message: z.string().trim().min(1, "Please add your message.").max(4000, "Your message is too long."),
  consent: z.string().optional().transform(v => v === "on" || v === "true" || v === "yes"),
});
export type S2sEnquiry = z.infer<typeof s2sEnquirySchema>;
export function parseS2sEnquiry(fields: Record<string, unknown>) {
  if (String(fields._gotcha ?? "").trim()) return { kind: "honeypot" } as const;
  const pick = (key: string) => typeof fields[key] === "string" ? fields[key] : fields[key] == null ? undefined : String(fields[key]);
  const result = s2sEnquirySchema.safeParse(Object.fromEntries(["name", "email", "phone", "ride", "team_size", "message", "consent"].map(key => [key, pick(key)])));
  if (!result.success) return { kind: "invalid", error: result.error.issues[0]?.message ?? "Please check the form." } as const;
  return { kind: "ok", enquiry: result.data } as const;
}
export function shouldRecordNorthInterest(e: Pick<S2sEnquiry, "consent" | "ride">) { return e.consent && (e.ride === "north" || e.ride === "both"); }