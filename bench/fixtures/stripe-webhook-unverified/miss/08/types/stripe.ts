export type HandledEvent = 'checkout.session.completed' | 'customer.subscription.updated' | 'invoice.paid';
export const HANDLED: HandledEvent[] = ['checkout.session.completed', 'customer.subscription.updated', 'invoice.paid'];
