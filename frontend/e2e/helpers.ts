import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

export const email = process.env.E2E_EMAIL
export const password = process.env.E2E_PASSWORD
export const apiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000'
export const workflowSelectionHeading =
  /Arbeitsablauf ausw|Arbeitsablauf auswaehl|Choose a workflow|Choose a process workspace/i
export const workspacesButton = /Arbeitsabl(?:ae|\u00e4)ufe/i
let adminSupabase: SupabaseClient | null = null
const currentDir = fileURLToPath(new URL('.', import.meta.url))

export function requireCredentials() {
  return !email || !password
}

export function testSuffix(source: number = Date.now()) {
  return String(source).slice(-3)
}

function getAdminSupabase() {
  if (adminSupabase) {
    return adminSupabase
  }

  const envPath = resolve(currentDir, '../../backend/.env')
  const envContent = readFileSync(envPath, 'utf8')
  const values = Object.fromEntries(
    envContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=')
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )

  adminSupabase = createClient(values.SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return adminSupabase
}

async function listAllUsers() {
  const supabase = getAdminSupabase()
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (error) {
    throw error
  }

  return data.users
}

export async function login(page: Page) {
  await loginAs(page, email!, password!)
  await ensurePostLoginLanding(page, email!)
}

export async function loginAs(page: Page, userEmail: string, userPassword: string) {
  await page.context().clearCookies()
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.goto('/')
  const loginHeading = page.getByRole('heading', { name: /Anmelden|Sign in/i })
  await expect(loginHeading).toBeVisible({ timeout: 10_000 })

  await page.getByPlaceholder(/E-Mail|Email/i).fill(userEmail)
  await page.getByPlaceholder(/Passwort|Password/i).fill(userPassword)
  await page.getByRole('button', { name: /^anmelden$|^sign in$/i }).click()
}

export async function ensurePostLoginLanding(page: Page, userEmail: string) {
  const workflowHeading = page.getByText(workflowSelectionHeading)
  const organizationHeading = page.getByRole('heading', { name: /Firma anlegen|Firma ausw|Create organization|Select organization/i })
  const toolbarActivity = page.getByTestId('toolbar-activity')
  const organizationCards = page.locator('[data-testid^="organization-select-"]')
  const loginHeading = page.getByRole('heading', { name: /Anmelden|Sign in/i })
  const localPart = userEmail.split('@')[0]?.replace(/[^a-zA-Z0-9_-]/g, '-') || 'e2e-user'

  async function landOnWorkflowOverview() {
    await expect(workflowHeading.or(toolbarActivity)).toBeVisible({ timeout: 15_000 })
  }

  async function isWorkflowOverviewVisible() {
    return workflowHeading.or(toolbarActivity).isVisible({ timeout: 1_500 }).catch(() => false)
  }

  async function setActiveOrganizationAndReload(organizationId: string) {
    await page.evaluate((nextOrganizationId) => {
      window.localStorage.setItem('wow-active-organization-id', nextOrganizationId)
    }, organizationId)
    await page.reload()
    return workflowHeading.or(toolbarActivity).isVisible({ timeout: 8_000 }).catch(() => false)
  }

  async function activateOrganizationById(organizationId: string) {
    const organizationCard = page.getByTestId(`organization-select-${organizationId}`)
    if (await organizationCard.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await organizationCard.click()
      if (await isWorkflowOverviewVisible()) {
        return true
      }
    }

    return setActiveOrganizationAndReload(organizationId)
  }

  async function activateFirstOrganizationCard() {
    if ((await organizationCards.count()) === 0) {
      return false
    }

    const firstCard = organizationCards.first()
    const firstCardTestId = await firstCard.getAttribute('data-testid')
    const organizationIdFromCard = firstCardTestId?.replace('organization-select-', '') ?? null

    await firstCard.click()
    const reachedWorkflowOverview = await isWorkflowOverviewVisible()

    if (reachedWorkflowOverview) {
      return true
    }

    if (!organizationIdFromCard) {
      return false
    }

    return activateOrganizationById(organizationIdFromCard)
  }

  async function createOrganizationViaApi(name: string) {
    const accessToken = await page.evaluate(() => {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index)
        if (!key) continue
        const value = window.localStorage.getItem(key)
        if (!value) continue

        try {
          const parsed = JSON.parse(value)
          if (parsed?.access_token) return parsed.access_token as string
          if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token as string
          if (parsed?.session?.access_token) return parsed.session.access_token as string
        } catch {
          // ignore malformed localStorage entries
        }
      }

      return null
    })

    if (!accessToken) {
      return false
    }

    const response = await page.request.post(`${apiBaseUrl}/organizations`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name,
      },
      failOnStatusCode: false,
    })

    return response.ok()
  }

  async function listOrganizationsViaApi() {
    const accessToken = await getAccessToken(page)
    if (!accessToken) {
      return []
    }

    const response = await page.request.get(`${apiBaseUrl}/organizations`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      failOnStatusCode: false,
    })

    if (!response.ok()) {
      return []
    }

    return (await response.json()) as Array<{ id: string; name: string }>
  }

  if (await loginHeading.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await Promise.race([
      organizationHeading.waitFor({ state: 'visible', timeout: 20_000 }),
      workflowHeading.waitFor({ state: 'visible', timeout: 20_000 }),
      toolbarActivity.waitFor({ state: 'visible', timeout: 20_000 }),
    ]).catch(() => Promise.resolve())
  }

  if (await workflowHeading.isVisible({ timeout: 8_000 }).catch(() => false)) {
    return
  }

  if (await toolbarActivity.isVisible({ timeout: 1_500 }).catch(() => false)) {
    return
  }

  if (await organizationHeading.isVisible({ timeout: 8_000 }).catch(() => false)) {
    const createHeading = page.getByRole('heading', { name: /Firma anlegen|Create organization/i })
    if (await createHeading.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const organizationName = `E2E ${localPart} ${testSuffix()}`
      const createOrganizationResponse = page
        .waitForResponse(
          (response) =>
            response.url().includes('/organizations') &&
            response.request().method() === 'POST',
          { timeout: 20_000 },
        )
        .catch(() => null)
      await page.getByPlaceholder(/Name der Firma|Organization name/i).fill(organizationName)
      await page.getByTestId('organization-create-submit').click()
      const response = await createOrganizationResponse
      if (response?.ok()) {
        await page.reload()
      } else if (await createOrganizationViaApi(`${organizationName} API`)) {
        await page.reload()
      }
    } else {
      const organizations = await listOrganizationsViaApi()
      if (organizations[0]?.id) {
        const reachedWorkflowOverview = await activateOrganizationById(organizations[0].id)
        if (reachedWorkflowOverview) {
          return
        }
      }

      if (await workflowHeading.or(toolbarActivity).isVisible({ timeout: 8_000 }).catch(() => false)) {
        return
      }

      if (await activateFirstOrganizationCard()) {
        return
      }
    }
  }

  if (await organizationHeading.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const organizations = await listOrganizationsViaApi()
    if (organizations[0]?.id) {
      const reachedWorkflowOverview = await activateOrganizationById(organizations[0].id)
      if (reachedWorkflowOverview) {
        return
      }
    }

    if (await activateFirstOrganizationCard()) {
      return
    }
  }

  if (!(await workflowHeading.isVisible({ timeout: 1_000 }).catch(() => false)) && !(await toolbarActivity.isVisible({ timeout: 1_000 }).catch(() => false))) {
    if (await organizationHeading.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const createdByFallback = await createOrganizationViaApi(`E2E ${localPart} fallback ${testSuffix()}`)
      if (createdByFallback) {
        await page.reload()
      }
    }
  }

  await landOnWorkflowOverview()
}

export async function signupAndLogin(page: Page, userEmail: string, userPassword: string) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Anmelden|Sign in/i })).toBeVisible()
  await page.getByPlaceholder(/E-Mail|Email/i).fill(userEmail)
  await page.getByPlaceholder(/Passwort|Password/i).fill(userPassword)
  await page.getByRole('button', { name: /^registrieren$|^sign up$/i }).click()

  const organizationHeading = page.getByRole('heading', { name: /Firma anlegen|Firma ausw/i })
  const signupMessage = page.getByText(/Konto angelegt/i)
  const workflowHeading = page.getByRole('heading', { name: workflowSelectionHeading })
  const toolbarActivity = page.getByTestId('toolbar-activity')

  try {
    await Promise.race([
      organizationHeading.waitFor({ state: 'visible', timeout: 7_500 }),
      workflowHeading.waitFor({ state: 'visible', timeout: 7_500 }),
      toolbarActivity.waitFor({ state: 'visible', timeout: 7_500 }),
    ])
    return
  } catch {
    await signupMessage.waitFor({ state: 'visible', timeout: 7_500 }).catch(() => Promise.resolve())
    await confirmUserByEmail(userEmail).catch(async () => {
      await createTestUser(userEmail, userPassword)
    })
    await page.getByPlaceholder(/Passwort|Password/i).fill(userPassword)
    await page.getByRole('button', { name: /^anmelden$|^sign in$/i }).click()
    await Promise.race([
      organizationHeading.waitFor({ state: 'visible', timeout: 15_000 }),
      workflowHeading.waitFor({ state: 'visible', timeout: 15_000 }),
      toolbarActivity.waitFor({ state: 'visible', timeout: 15_000 }),
    ])
  }
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /Abmelden|Sign out/i }).click()
  await expect(page.getByRole('heading', { name: /Anmelden|Sign in/i })).toBeVisible()
}

export async function getAccessToken(page: Page) {
  return page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      const value = window.localStorage.getItem(key)
      if (!value) continue

      try {
        const parsed = JSON.parse(value)
        if (parsed?.access_token) return parsed.access_token as string
        if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token as string
        if (parsed?.session?.access_token) return parsed.session.access_token as string
      } catch {
        // ignore malformed localStorage entries
      }
    }

    return null
  })
}

export async function getActiveOrganizationId(page: Page) {
  return page.evaluate(() => window.localStorage.getItem('wow-active-organization-id'))
}

export async function createWorkflow(page: Page, name: string) {
  await page.getByPlaceholder(/Name des Arbeitsablaufs|New workspace name/i).fill(name)
  const createWorkspaceResponse = page.waitForResponse((response) => response.url().includes('/workspaces') && response.request().method() === 'POST')
  await page.getByRole('button', { name: /^anlegen$|^create$/i }).click()
  return (await createWorkspaceResponse).json() as Promise<{ id: string; name: string }>
}

export async function cleanupWorkspaces(request: APIRequestContext, workspaceIds: string[], token: string | null) {
  if (!token) {
    return
  }

  for (const workspaceId of [...new Set(workspaceIds)].reverse()) {
    try {
      await request.delete(`${apiBaseUrl}/workspaces/${workspaceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        failOnStatusCode: false,
      })
    } catch {
      // Ignore cleanup noise when the fixture already shut down after a timeout.
    }
  }
}

export async function cleanupITToolsByNames(toolNames: string[]) {
  const uniqueToolNames = [...new Set(toolNames.map((name) => name.trim()).filter(Boolean))]
  if (uniqueToolNames.length === 0) {
    return
  }

  const supabase = getAdminSupabase()
  await supabase.from('it_tools').delete().in('name', uniqueToolNames)
}

export async function cleanupTransportModesByLabels(labels: string[]) {
  const uniqueLabels = [...new Set(labels.map((label) => label.trim()).filter(Boolean))]
  if (uniqueLabels.length === 0) {
    return
  }

  const supabase = getAdminSupabase()
  await supabase.from('transport_modes').delete().in('label', uniqueLabels)
}

export async function cleanupOrganizationsByNames(organizationNames: string[]) {
  const uniqueNames = [...new Set(organizationNames.map((name) => name.trim()).filter(Boolean))]
  if (uniqueNames.length === 0) {
    return
  }

  const supabase = getAdminSupabase()
  await supabase.from('organizations').delete().in('name', uniqueNames)
}

export async function countITToolsByName(toolName: string) {
  const supabase = getAdminSupabase()
  const { count, error } = await supabase
    .from('it_tools')
    .select('id', { count: 'exact', head: true })
    .eq('name', toolName)

  if (error) {
    throw error
  }

  return count ?? 0
}

export async function deleteUserByEmail(userEmail: string) {
  const normalizedEmail = userEmail.trim().toLowerCase()
  const users = await listAllUsers()
  const user = users.find((entry) => entry.email?.toLowerCase() === normalizedEmail)

  if (!user) {
    return
  }

  const supabase = getAdminSupabase()
  const { error } = await supabase.auth.admin.deleteUser(user.id)
  if (error) {
    throw error
  }
}

export async function createTestUser(
  userEmail: string,
  userPassword: string,
  options?: {
    displayName?: string
    domainRoleLabel?: string
  },
) {
  await deleteUserByEmail(userEmail)

  const supabase = getAdminSupabase()
  const { data, error } = await supabase.auth.admin.createUser({
    email: userEmail,
    password: userPassword,
    email_confirm: true,
    user_metadata: {
      ...(options?.displayName ? { display_name: options.displayName } : {}),
      ...(options?.domainRoleLabel ? { domain_role_label: options.domainRoleLabel } : {}),
    },
  })

  if (error) {
    throw error
  }

  return data.user
}

export async function addUserToOrganization(
  organizationId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' = 'member',
) {
  const supabase = getAdminSupabase()
  const { error } = await supabase.from('organization_members').upsert({
    organization_id: organizationId,
    user_id: userId,
    role,
  })

  if (error) {
    throw error
  }
}

export async function removeUsersFromOrganization(organizationId: string, userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))]
  if (uniqueUserIds.length === 0) {
    return
  }

  const supabase = getAdminSupabase()
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .in('user_id', uniqueUserIds)

  if (error) {
    throw error
  }
}

export async function confirmUserByEmail(userEmail: string) {
  const normalizedEmail = userEmail.trim().toLowerCase()
  const users = await listAllUsers()
  const user = users.find((entry) => entry.email?.toLowerCase() === normalizedEmail)

  if (!user) {
    throw new Error(`User ${normalizedEmail} not found for confirmation`)
  }

  const supabase = getAdminSupabase()
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  })

  if (error) {
    throw error
  }
}

export async function getActivityNodeIds(page: Page) {
  return page.locator('[data-testid^="activity-node-"]').evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('data-testid'))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace('activity-node-', '')),
  )
}

export async function getGatewayNodeIds(page: Page) {
  return page.locator('[data-testid^="gateway-node-"]').evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('data-testid'))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace('gateway-node-', '')),
  )
}

export async function getStartNodeIds(page: Page) {
  return page.locator('[data-testid^="start-node-"]').evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('data-testid'))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace('start-node-', '')),
  )
}

export async function getActivityCenter(page: Page, activityId: string) {
  const box = await page.getByTestId(`activity-node-${activityId}`).boundingBox()
  if (!box) {
    throw new Error(`Activity node ${activityId} has no bounding box`)
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

export async function openActivityDetail(page: Page, activityId: string) {
  if (await page.getByTestId('edge-close').count()) {
    await page.getByTestId('edge-close').click()
    await expect(page.getByTestId('edge-close')).toHaveCount(0)
  }
  await page.getByTestId(`activity-node-${activityId}`).dblclick()
  await expect(page.getByTestId(`activity-detail-${activityId}`)).toBeVisible()
}

export async function closeActivityDetail(page: Page) {
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.locator('[data-testid^="activity-detail-"]')).toHaveCount(0)
}

export async function dragNodeBy(page: Page, testId: string, delta: { x: number; y: number }) {
  const locator = page.getByTestId(testId)
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error(`Node ${testId} has no bounding box`)
  }

  const start = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 10 })
  await page.mouse.up()
}

export async function getHandleCenter(page: Page, nodeTestId: string, handleId: string) {
  const handle = page.locator(`[data-testid="${nodeTestId}"] .react-flow__handle[data-handleid="${handleId}"]`)
  const box = await handle.boundingBox()
  if (!box) {
    throw new Error(`Handle ${handleId} on ${nodeTestId} has no bounding box`)
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

export async function getNodeSidePoint(page: Page, nodeTestId: string, side: 'top' | 'right' | 'bottom' | 'left') {
  const locator = page.getByTestId(nodeTestId)
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error(`Node ${nodeTestId} has no bounding box`)
  }

  switch (side) {
    case 'top':
      return { x: box.x + box.width / 2, y: box.y + 8 }
    case 'right':
      return { x: box.x + box.width - 8, y: box.y + box.height / 2 }
    case 'bottom':
      return { x: box.x + box.width / 2, y: box.y + box.height - 8 }
    case 'left':
    default:
      return { x: box.x + 8, y: box.y + box.height / 2 }
  }
}

export async function connectHandleToNodeSide(page: Page, sourceNodeTestId: string, sourceHandleId: string, targetNodeTestId: string, targetSide: 'top' | 'right' | 'bottom' | 'left') {
  const source = await getHandleCenter(page, sourceNodeTestId, sourceHandleId)
  const target = await getNodeSidePoint(page, targetNodeTestId, targetSide)

  await page.mouse.move(source.x, source.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 24 })
  await page.mouse.up()
}

export async function connectHandles(page: Page, sourceNodeTestId: string, sourceHandleId: string, targetNodeTestId: string, targetHandleId: string) {
  const source = await getHandleCenter(page, sourceNodeTestId, sourceHandleId)
  const target = await getHandleCenter(page, targetNodeTestId, targetHandleId)

  await page.mouse.move(source.x, source.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps: 24 })
  await page.mouse.up()
}

export async function getEdgeCount(page: Page) {
  return page.locator('.react-flow__edge').count()
}

export async function selectFirstEdge(page: Page) {
  await page.locator('.react-flow__edge-path').first().click({ force: true })
}

export async function selectEdgeByIndex(page: Page, index: number) {
  await page.locator('.react-flow__edge-path').nth(index).click({ force: true })
}

export async function selectEdgeByConnection(page: Page, sourceNodeId: string, targetNodeId: string) {
  const edgeLabel = `Edge from ${sourceNodeId} to ${targetNodeId}`
  const clicked = await page.evaluate((label) => {
    const candidate = Array.from(document.querySelectorAll<Element>('[aria-label]')).find(
      (element) => element.getAttribute('aria-label') === label,
    )
    if (!candidate) {
      return false
    }
    candidate.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
    return true
  }, edgeLabel)

  if (!clicked) {
    await page.locator(`.react-flow__edge[aria-label="${edgeLabel}"]`).dispatchEvent('click')
  }

  await expect(page.getByTestId(`edge-detail-${sourceNodeId}-${targetNodeId}`)).toBeVisible()
}

export async function getEdgeTargetsFromSource(page: Page, sourceNodeId: string) {
  const labels = await page.locator('.react-flow__edge[aria-label]').evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('aria-label'))
      .filter((value): value is string => Boolean(value)),
  )

  return labels
    .map((label) => label.match(new RegExp(`^Edge from ${sourceNodeId} to (.+)$`))?.[1] ?? null)
    .filter((value): value is string => Boolean(value))
}

export async function getEdgeSourcesToTarget(page: Page, targetNodeId: string) {
  const labels = await page.locator('.react-flow__edge[aria-label]').evaluateAll((elements) =>
    elements
      .map((element) => element.getAttribute('aria-label'))
      .filter((value): value is string => Boolean(value)),
  )

  return labels
    .map((label) => label.match(new RegExp(`^Edge from (.+) to ${targetNodeId}$`))?.[1] ?? null)
    .filter((value): value is string => Boolean(value))
}

export async function clickFirstEdgeNearStart(page: Page) {
  const box = await page.locator('.react-flow__edge-path').first().boundingBox()
  if (!box) {
    throw new Error('First edge has no bounding box')
  }

  await page.mouse.click(box.x + 16, box.y + 16)
}



