import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  // Enable CORS
  app.enableCors();

  // Enable Global Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend Application is running on: http://localhost:${port}`);
}
bootstrap();
