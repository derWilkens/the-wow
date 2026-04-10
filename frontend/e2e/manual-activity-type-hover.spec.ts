import { test, expect } from '@playwright/test'
import {
  createWorkflow,
  getActivityNodeIds,
  login,
  requireCredentials,
  testSuffix,
} from './helpers'

test.describe('manual activity type hover pause', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('opens the type popover, hovers a type option, and pauses', async ({ page }) => {
    test.setTimeout(60_000)

    await login(page)
    const workflow = await createWorkflow(page, `Manual Type Hover ${testSuffix()}`)

    await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
    const [activityId] = await getActivityNodeIds(page)

    const trigger = page.getByTestId(`activity-type-trigger-${activityId}`)
    await trigger.click()
    await expect(page.getByTestId(`activity-type-popover-${activityId}`)).toBeVisible()

    const option = page.getByTestId(`activity-type-option-${activityId}-erstellen`)
    await option.hover()
    await expect(page.getByTestId(`activity-type-option-tooltip-${activityId}`)).toHaveText('Erstellen')

    await page.pause()
  })
})

