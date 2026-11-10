import { ThrottlerModule } from '@nestjs/throttler';
@Module({ imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }])] })
export class AppModule {}
