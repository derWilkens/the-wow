import { HealthController } from './health.controller'

describe('HealthController', () => {
  it('returns an ok health payload', () => {
    const controller = new HealthController()
    const result = controller.health()

    expect(result.status).toBe('ok')
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date')
  })
})
