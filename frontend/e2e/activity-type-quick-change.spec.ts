import { expect, test } from '@playwright/test'
import {
  cleanupWorkspaces,
  createWorkflow,
  getAccessToken,
  getActivityNodeIds,
  login,
  openActivityDetail,
  requireCredentials,
  testSuffix,
} from './helpers'

test.describe('activity type quick change', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('changes the activity type directly from the node icon and persists it across a fresh session', async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000)
    const createdWorkspaceIds: string[] = []
    let accessToken: string | null = null
    const workflowName = `Type Quick ${testSuffix()}`

    try {
      await login(page)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      const [activityId] = await getActivityNodeIds(page)

      const trigger = page.getByTestId(`activity-type-trigger-${activityId}`)

      await trigger.hover()
      await expect(page.getByTestId(`activity-type-trigger-tooltip-${activityId}`)).toHaveText('Typ aendern')

      await trigger.click()
      await expect(page.getByTestId(`activity-type-popover-${activityId}`)).toBeVisible()

      await page.getByTestId(`activity-type-option-${activityId}-erstellen`).hover()
      await expect(page.getByTestId(`activity-type-option-tooltip-${activityId}`)).toHaveText('Erstellen')

      await page.mouse.click(8, 8)
      await expect(page.getByTestId(`activity-type-popover-${activityId}`)).toHaveCount(0)

      await trigger.click()
      const saveResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/workspaces/${workflow.id}/activities/upsert`) &&
          response.request().method() === 'POST',
      )
      await page.getByTestId(`activity-type-option-${activityId}-erstellen`).click()
      expect((await saveResponse).ok()).toBeTruthy()

      await expect(page.getByTestId(`activity-type-popover-${activityId}`)).toHaveCount(0)

      await expect
        .poll(async () => {
          const response = await request.get(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          })

          if (!response.ok()) {
            return null
          }

          const activities = (await response.json()) as Array<{ id: string; activity_type: string | null }>
          return activities.find((entry) => entry.id === activityId)?.activity_type ?? null
        })
        .toBe('erstellen')

      await login(page)
      const workspaceReopenButton = page.getByTestId(`workspace-open-${workflow.id}`)
      await expect(workspaceReopenButton).toBeVisible({ timeout: 15_000 })
      await workspaceReopenButton.click()
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBeGreaterThan(0)
      await openActivityDetail(page, activityId)
      await expect(page.getByTestId('activity-type-erstellen')).toBeChecked()
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
    }
  })
})

