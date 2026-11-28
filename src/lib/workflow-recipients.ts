export function workflowTestInput(input: { stepId: string }) {
  // Ignore any caller-supplied recipient fields on the test-only action.
  return { stepId: String(input.stepId) };
}

export function workflowPartnerInput(input: { stepId: string; to: string[] }) {
  const to = [...new Set((Array.isArray(input.to) ? input.to : [])
    .map((email) => String(email).trim().toLowerCase()))];
  if (!to.length || to.length > 20 || to.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new Error("Enter between 1 and 20 valid email addresses");
  }
  return { stepId: String(input.stepId), to };
}