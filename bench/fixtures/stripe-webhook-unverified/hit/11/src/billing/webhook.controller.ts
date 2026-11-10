import { Body, Controller, Post } from '@nestjs/common';
@Controller('webhooks')
export class WebhookController {
  @Post('stripe')
  async handle(@Body() event: any) {
    if (event.type === 'customer.subscription.created') await this.billing.start(event.data.object);
    return { received: true };
  }
}
