import { expect, test } from '@playwright/test'
import {
  cleanupOrganizationsByNames,
  createWorkflow,
  deleteUserByEmail,
  getEdgeCount,
  signupAndLogin,
  testSuffix,
} from './helpers'

test.describe('template regressions', () => {
  test('creates from template without a server error, opens the workflow, and keeps edges intact', async ({ page }) => {
    test.setTimeout(180_000)
    const suffix = testSuffix()
    const userEmail = `template-regression-${suffix}@mailinator.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Template Firma ${suffix}`
    const sourceWorkflowName = `Vorlage Quelle ${suffix}`
    const targetWorkflowName = `Vorlage Instanz ${suffix}`

    try {
      await deleteUserByEmail(userEmail)
      await signupAndLogin(page, userEmail, userPassword)
      await page.getByPlaceholder('Name der Firma').fill(organizationName)
      await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
      await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 15_000 })

      const sourceWorkflow = await createWorkflow(page, sourceWorkflowName)
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBe(1)

      await page.getByTestId('toolbar-back-to-workspaces').click()
      await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 15_000 })
      await page.getByTestId(`workspace-save-template-${sourceWorkflow.id}`).click()
      await page.getByTestId('workspace-template-name').fill(`${sourceWorkflowName} Vorlage`)
      await page.getByTestId('workspace-template-save').click()
      await expect(page.getByTestId('workspace-template-save')).toHaveCount(0)

      await page.getByTestId('workspace-create-mode-template').click()
      await page
        .getByTestId(/^workspace-template-option-/)
        .filter({ hasText: `${sourceWorkflowName} Vorlage` })
        .first()
        .click()
      await page.getByPlaceholder('Name des Arbeitsablaufs').fill(targetWorkflowName)
      const instantiateResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/workflow-templates/') &&
          response.url().includes('/instantiate') &&
          response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Aus Vorlage starten' }).click()
      const response = await instantiateResponse
      expect(response.status()).toBe(201)

      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('button', { name: new RegExp(targetWorkflowName, 'i') })).toBeVisible({
        timeout: 20_000,
      })
      await expect.poll(async () => getEdgeCount(page), { timeout: 20_000 }).toBe(1)
      await expect(page.getByText(/Internal server error/i)).toHaveCount(0)
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })

  test('allows editing a custom template from the template list', async ({ page }) => {
    test.setTimeout(180_000)
    const suffix = testSuffix()
    const userEmail = `template-edit-${suffix}@mailinator.com`
    const userPassword = 'CodexSaaS!2026'
    const organizationName = `Template Edit Firma ${suffix}`
    const sourceWorkflowName = `Editierbare Vorlage ${suffix}`
    const updatedTemplateName = `Editierbare Vorlage Bearbeitet ${suffix}`

    try {
      await deleteUserByEmail(userEmail)
      await signupAndLogin(page, userEmail, userPassword)
      await page.getByPlaceholder('Name der Firma').fill(organizationName)
      await page.getByRole('button', { name: /^Firma anlegen$/i }).click()
      await expect(page.getByRole('heading', { name: /Arbeitsablauf ausw/i })).toBeVisible({ timeout: 15_000 })

      const sourceWorkflow = await createWorkflow(page, sourceWorkflowName)
      await expect(page.getByTestId('toolbar-activity')).toBeVisible({ timeout: 15_000 })
      await page.getByTestId('toolbar-back-to-workspaces').click()
      await page.getByTestId(`workspace-save-template-${sourceWorkflow.id}`).click()
      await page.getByTestId('workspace-template-name').fill(`${sourceWorkflowName} Vorlage`)
      await page.getByTestId('workspace-template-description').fill('Vor der Bearbeitung')
      await page.getByTestId('workspace-template-save').click()
      await expect(page.getByTestId('workspace-template-save')).toHaveCount(0)

      await page.getByTestId('workspace-create-mode-template').click()
      const customTemplateCard = page.getByText(`${sourceWorkflowName} Vorlage`).locator('..').locator('..')
      const templateOption = page.getByTestId(/^workspace-template-option-/).filter({ hasText: `${sourceWorkflowName} Vorlage` }).first()
      await expect(templateOption).toBeVisible({ timeout: 15_000 })
      const templateId = (await templateOption.getAttribute('data-testid'))!.replace('workspace-template-option-', '')
      await page.getByTestId(`workspace-template-edit-${templateId}`).click()
      await page.getByTestId('workspace-template-edit-name').fill(updatedTemplateName)
      await page.getByTestId('workspace-template-edit-description').fill('Nach der Bearbeitung')
      await page.getByTestId('workspace-template-edit-save').click()

      await expect(page.getByTestId('workspace-template-edit-save')).toHaveCount(0)
      await expect(page.getByText(updatedTemplateName)).toBeVisible({ timeout: 15_000 })
      await expect(customTemplateCard).toHaveCount(0)
    } finally {
      await cleanupOrganizationsByNames([organizationName])
      await deleteUserByEmail(userEmail)
    }
  })
})


