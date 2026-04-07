export function parseAllowedOrigins(frontendUrl: string | undefined): string[] {
  return (frontendUrl ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function createCorsOriginChecker(frontendUrl: string | undefined) {
  const allowedOrigins = parseAllowedOrigins(frontendUrl)
  const isProduction = process.env.NODE_ENV === 'production'

  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`))
  }
}
