import { createCorsOriginChecker, parseAllowedOrigins } from './cors'

describe('cors config', () => {
  it('parses comma-separated allowed origins', () => {
    expect(parseAllowedOrigins('https://app.example.com, https://preview.example.com')).toEqual([
      'https://app.example.com',
      'https://preview.example.com',
    ])
  })

  it('allows configured public origins', () => {
    const checker = createCorsOriginChecker('https://app.example.com')
    const callback = jest.fn()

    checker('https://app.example.com', callback)

    expect(callback).toHaveBeenCalledWith(null, true)
  })

  it('rejects unconfigured origins in production mode', () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const checker = createCorsOriginChecker('https://app.example.com')
    const callback = jest.fn()

    checker('https://evil.example.com', callback)

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Error)
    process.env.NODE_ENV = previousNodeEnv
  })
})
