import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { createCorsOriginChecker } from './config/cors'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: createCorsOriginChecker(process.env.FRONTEND_URL),
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000)
}

bootstrap()
