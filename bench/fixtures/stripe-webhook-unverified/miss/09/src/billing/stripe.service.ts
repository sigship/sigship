import { StripeWebhookHandler } from '@golevelup/nestjs-stripe';
export class StripeService {
  @StripeWebhookHandler('checkout.session.completed')
  async onCheckout(evt) { await this.billing.fulfil(evt.data.object); }
}
