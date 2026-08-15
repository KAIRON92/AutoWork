import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnvironment } from './config/validate-environment';

async function bootstrap() {
  validateEnvironment();

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  const config = new DocumentBuilder()
    .setTitle('Autowork.com pCloud Automation Platform API')
    .setDescription('Autowork multi-tenant pCloud file sharing, transfer orchestrator, and campaign automation API specification.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Autowork Backend API running on http://localhost:${port}`);
  console.log(`📚 Swagger OpenAPI documentation available at http://localhost:${port}/api/docs`);
  console.log(`🩺 Health check available at http://localhost:${port}/api/health`);
}
bootstrap().catch((error) => {
  console.error('❌ Autowork backend failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
