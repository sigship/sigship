export const trackPaid = (id: string) => posthog.capture('invoice.paid', { id });
