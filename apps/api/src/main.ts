import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { securityHeaders } from './security/security-headers';
import { validateEnv } from './security/env-validation';
import { resolveRequestId } from './observability/request-id';

async function bootstrap(): Promise<void> {
  // Fail closed on insecure configuration in production (OWASP A05).
  const { errors, warnings } = validateEnv(process.env);
  warnings.forEach((w) => Logger.warn(w, 'EnvValidation'));
  if (errors.length > 0) {
    errors.forEach((e) => Logger.error(e, 'EnvValidation'));
    throw new Error(
      `Refusing to start: ${errors.length} security configuration error(s).`,
    );
  }

  // rawBody is needed so the webhook guard can verify the signature over the
  // exact signed bytes; the normal JSON parser stays active for every other route.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const isProd =
    (config.get<string>('NODE_ENV') ?? 'development') === 'production';

  app.setGlobalPrefix('api');

  // Correlation id: reuse a valid incoming x-request-id or mint one, expose it on
  // the request (for the metrics interceptor) and mirror it back in the response
  // so a client/proxy can correlate end-to-end. PII-free, additive.
  app.use(
    (
      req: { headers: Record<string, unknown>; requestId?: string },
      res: { setHeader: (k: string, v: string) => void },
      next: () => void,
    ) => {
      const requestId = resolveRequestId(req.headers['x-request-id']);
      req.requestId = requestId;
      res.setHeader('x-request-id', requestId);
      next();
    },
  );

  // Security headers on every response; the interactive docs route gets a
  // relaxed CSP so Swagger UI can load its inline assets.
  app.use(
    (
      req: { path?: string },
      res: { setHeader: (k: string, v: string) => void },
      next: () => void,
    ) => {
      const headers = securityHeaders({
        production: isProd,
        relaxedCsp: (req.path ?? '').startsWith('/api/docs'),
      });
      for (const [key, value] of Object.entries(headers))
        res.setHeader(key, value);
      next();
    },
  );

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:4200',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Bursa API')
    .setDescription(
      'Funding platform for verified, admitted MBA students — prototype',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
  Logger.log(`Bursa API ready on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
