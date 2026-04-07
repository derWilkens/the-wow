import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import {
  addUserToOrganization,
  cleanupITToolsByNames,
  cleanupOrganizationsByNames,
  cleanupWorkspaces,
  closeActivityDetail,
  countITToolsByName,
  createWorkflow,
  createTestUser,
  deleteUserByEmail,
  ensurePostLoginLanding,
  getAccessToken,
  getActivityNodeIds,
  getActiveOrganizationId,
  getEdgeCount,
  getGatewayNodeIds,
  getStartNodeIds,
  loginAs,
  openActivityDetail,
  removeUsersFromOrganization,
  requireCredentials,
  selectEdgeByConnection,
  workflowSelectionHeading,
  testSuffix,
} from './helpers'

type SeededBimUser = {
  email: string
  password: string
  userId: string
  displayName: string
  domainRoleLabel: string
}

type ActivitySemanticInput = {
  label?: string
  activity_type: 'erstellen' | 'transformieren_aktualisieren' | 'pruefen_freigeben' | 'weiterleiten_ablegen'
  description: string
  notes: string
  assignee_user_id: string
  duration_minutes: number
  status_icon?: 'unclear' | 'ok' | 'in_progress' | 'blocked' | null
}

async function seedBimUsersForOrganization(page: Page, organizationId: string, suffix: number, scenarioUserEmail: string) {
  const users: Record<string, SeededBimUser> = {}
  const definitions = [
    ['bimCoordinator', 'AG BIM-Koordinator', 'BIM-Koordination'],
    ['architect', 'AN Architekt', 'Architektur'],
    ['tgaPlanner', 'AN Fachplaner TGA', 'TGA'],
    ['structuralPlanner', 'AN Fachplaner Tragwerk', 'Tragwerk'],
    ['architectureReviewer', 'AG Fachspezialist Architektur', 'Fachpruefung'],
    ['tgaReviewer', 'AG Fachspezialist TGA', 'Fachpruefung'],
    ['structuralReviewer', 'AG Fachspezialist Tragwerk', 'Fachpruefung'],
  ] as const

  for (const [key, displayName, domainRoleLabel] of definitions) {
    const email = `${key}-${suffix}@mailinator.com`
    const password = 'CodexSaaS!2026'
    const user = await createTestUser(email, password, {
      displayName,
      domainRoleLabel,
    })
    await addUserToOrganization(organizationId, user.id, 'member')
    users[key] = {
      email,
      password,
      userId: user.id,
      displayName,
      domainRoleLabel,
    }
  }

  await page.reload()
  await ensurePostLoginLanding(page, scenarioUserEmail)
  await expect(page.getByText(workflowSelectionHeading).or(page.getByTestId('toolbar-activity'))).toBeVisible({ timeout: 20_000 })
  return users
}

async function cleanupSeededBimUsers(organizationId: string, users: Record<string, SeededBimUser>) {
  const seededUsers = Object.values(users)
  await removeUsersFromOrganization(
    organizationId,
    seededUsers.map((user) => user.userId),
  ).catch(() => Promise.resolve())

  for (const user of seededUsers) {
    await deleteUserByEmail(user.email).catch(() => Promise.resolve())
  }
}

async function listActivitiesViaApi(request: APIRequestContext, accessToken: string, workspaceId: string) {
  const response = await request.get(`http://127.0.0.1:3000/workspaces/${workspaceId}/activities`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as Array<Record<string, unknown>>
}

async function updateActivityViaApi(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  activityId: string,
  updates: ActivitySemanticInput,
) {
  const activities = await listActivitiesViaApi(request, accessToken, workspaceId)
  const existingActivity = activities.find((activity) => activity.id === activityId)
  expect(existingActivity).toBeTruthy()

  const response = await request.post(`http://127.0.0.1:3000/workspaces/${workspaceId}/activities/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      id: existingActivity!.id,
      parent_id: existingActivity!.parent_id,
      node_type: existingActivity!.node_type,
      label: updates.label ?? existingActivity!.label,
      trigger_type: existingActivity!.trigger_type ?? null,
      position_x: existingActivity!.position_x,
      position_y: existingActivity!.position_y,
      status: existingActivity!.status ?? 'draft',
      status_icon: updates.status_icon ?? existingActivity!.status_icon ?? null,
      activity_type: updates.activity_type,
      description: updates.description,
      notes: updates.notes,
      assignee_user_id: updates.assignee_user_id,
      duration_minutes: updates.duration_minutes,
      linked_workflow_id: existingActivity!.linked_workflow_id ?? null,
      linked_workflow_mode: existingActivity!.linked_workflow_mode ?? null,
      linked_workflow_purpose: existingActivity!.linked_workflow_purpose ?? null,
      linked_workflow_inputs: existingActivity!.linked_workflow_inputs ?? [],
      linked_workflow_outputs: existingActivity!.linked_workflow_outputs ?? [],
    },
  })

  expect(response.ok()).toBeTruthy()
}

async function assertActivitySemanticsComplete(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  expectedLabels: string[],
) {
  const activities = await listActivitiesViaApi(request, accessToken, workspaceId)
  for (const label of expectedLabels) {
    const activity = activities.find((entry) => entry.label === label)
    expect(activity, `Missing activity ${label}`).toBeTruthy()
    expect(activity?.activity_type, `Missing activity_type for ${label}`).toBeTruthy()
    expect(typeof activity?.description).toBe('string')
    expect(String(activity?.description ?? '').trim().length, `Missing description for ${label}`).toBeGreaterThan(10)
    expect(typeof activity?.notes).toBe('string')
    expect(String(activity?.notes ?? '').trim().length, `Missing notes for ${label}`).toBeGreaterThan(10)
    expect(activity?.assignee_user_id, `Missing assignee for ${label}`).toBeTruthy()
    expect(Number(activity?.duration_minutes ?? 0), `Missing duration for ${label}`).toBeGreaterThan(0)
  }
}

async function saveActivityLabel(page: Page, activityId: string, label: string) {
  await openActivityDetail(page, activityId)
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/activities/upsert') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
  )
  await page.getByTestId('activity-detail-label').fill(label)
  await page.getByTestId('activity-detail-save').click()
  await responsePromise
  await expect(page.getByTestId(`activity-detail-${activityId}`)).toHaveCount(0)
}

async function createConnectedActivity(page: Page, sourceTestId: string, label: string) {
  const existingIds = await getActivityNodeIds(page)
  await page.getByTestId(sourceTestId).click()
  await page.getByTestId('toolbar-activity').click()
  await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(existingIds.length + 1)
  const createdId = (await getActivityNodeIds(page)).find((id) => !existingIds.includes(id))
  expect(createdId).toBeTruthy()
  await saveActivityLabel(page, createdId!, label)
  return createdId!
}

async function createDecisionGateway(page: Page, sourceActivityId: string) {
  const existingIds = await getGatewayNodeIds(page)
  await page.getByTestId(`activity-node-${sourceActivityId}`).click()
  await page.getByTestId('toolbar-decision').click()
  await expect.poll(async () => (await getGatewayNodeIds(page)).length, { timeout: 15_000 }).toBe(existingIds.length + 1)
  const gatewayId = (await getGatewayNodeIds(page)).find((id) => !existingIds.includes(id))
  expect(gatewayId).toBeTruthy()
  return gatewayId!
}

async function createRootEdgeViaApi(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  sourceNodeId: string,
  targetNodeId: string,
) {
  const response = await request.post(`http://127.0.0.1:3000/workspaces/${workspaceId}/canvas-edges/upsert`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      parent_activity_id: null,
      from_node_type: 'activity',
      from_node_id: sourceNodeId,
      from_handle_id: 'source-right',
      to_node_type: 'activity',
      to_node_id: targetNodeId,
      to_handle_id: 'target-left',
      label: null,
      transport_mode_id: null,
      notes: null,
    },
  })

  expect(response.ok()).toBeTruthy()
}

async function saveEdgeLabel(page: Page, label: string) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/canvas-edges/upsert') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
  )
  await page.getByTestId('edge-path-label').fill(label)
  await page.getByTestId('edge-save').click()
  await responsePromise
  await page.getByTestId('workflow-canvas').click({ position: { x: 24, y: 24 } })
  await expect(page.getByTestId('edge-path-label')).toHaveCount(0)
}

async function addEdgeDataObject(
  page: Page,
  workspaceId: string,
  sourceNodeId: string,
  targetNodeId: string,
  objectName: string,
  transportModeLabel: string,
  notes?: string,
) {
  await selectEdgeByConnection(page, sourceNodeId, targetNodeId)
  await expect(page.getByTestId('edge-section-data-objects')).toBeVisible()
  await page.getByTestId('edge-add-new-data-object').click()
  const inlineInput = page.locator('[data-testid^="edge-inline-name-"]').first()
  await expect(inlineInput).toBeVisible({ timeout: 15_000 })
  const inputTestId = await inlineInput.getAttribute('data-testid')
  expect(inputTestId).toBeTruthy()
  const createdDataObjectId = inputTestId!.replace('edge-inline-name-', '')
  await inlineInput.fill(objectName)
  const objectSaveResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/workspaces/${workspaceId}/canvas-objects/upsert`) &&
      response.request().method() === 'POST' &&
      response.status() === 201,
  )
  await page.getByTestId(`edge-inline-save-${createdDataObjectId}`).click()
  await objectSaveResponse
  await page.getByTestId('edge-transport-mode-trigger').click()
  await page.getByTestId('edge-transport-mode-panel').getByRole('button', { name: new RegExp(transportModeLabel, 'i') }).click()
  if (notes) {
    await page.getByTestId('edge-notes').fill(notes)
  }
  const edgeSaveResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/canvas-edges/upsert') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
  )
  await page.getByTestId('edge-save').click()
  await edgeSaveResponse
  await expect(page.getByTitle(objectName, { exact: true }).first()).toBeVisible()
  return createdDataObjectId
}

async function linkActivityTool(page: Page, activityId: string, toolName: string, description?: string, mode: 'create' | 'link' = 'create') {
  await openActivityDetail(page, activityId)
  const trigger = page.getByTestId('activity-tool-select-trigger')
  await trigger.click()

  if (mode === 'create') {
    await page.getByTestId('activity-tool-select-create-toggle').click()
    await page.getByTestId('activity-tool-select-create-name').fill(toolName)
    if (description) {
      await page.getByTestId('activity-tool-select-create-description').fill(description)
    }
    await page.getByTestId('activity-tool-select-create-submit').click()
  } else {
    const panel = page.getByTestId('activity-tool-select-panel')
    await expect(panel).toBeVisible()
    await panel.getByRole('button', { name: new RegExp(toolName, 'i') }).click()
    await page.getByTestId('activity-tool-link-submit').click()
  }

  await expect(page.getByTestId(`activity-detail-${activityId}`)).toContainText(toolName)
  await closeActivityDetail(page)
}

async function createDetailedWorkflowFromActivity(
  page: Page,
  activityId: string,
  name: string,
  goal: string,
  inputs: string[],
  outputs: string[],
  steps: string[],
) {
  const trigger = page.getByTestId(`subprocess-trigger-${activityId}`)
  const menu = page.getByTestId('subprocess-menu')

  await page.getByTestId(`activity-node-${activityId}`).click({ force: true })
  await trigger.click({ force: true })

  if (!(await menu.isVisible({ timeout: 2_000 }).catch(() => false))) {
    await trigger.dispatchEvent('click')
  }

  await expect(menu).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('subprocess-menu-create').click()
  await expect(page.getByTestId('subprocess-wizard')).toBeVisible()

  await page.getByTestId('subprocess-name').fill(name)
  await page.getByTestId('subprocess-goal').fill(goal)
  await page.getByTestId('subprocess-next').click()
  await page.getByTestId('subprocess-inputs').fill(inputs.join('\n'))
  await page.getByTestId('subprocess-outputs').fill(outputs.join('\n'))
  await page.getByTestId('subprocess-next').click()
  await page.getByTestId('subprocess-steps').fill(steps.join('\n'))

  const createSubprocessResponse = page.waitForResponse(
    (response) => response.url().includes(`/activities/${activityId}/subprocess`) && response.request().method() === 'POST',
  )
  await page.getByTestId('subprocess-submit').click()
  const payload = (await (await createSubprocessResponse).json()) as { workspace: { id: string; name: string } }
  await expect(page.getByTestId(`workspace-trail-${payload.workspace.id}`)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(steps[0], { exact: true })).toBeVisible({ timeout: 20_000 })
  return payload.workspace
}

async function createScenarioUserAndLandOnWorkflowOverview(
  page: Page,
  suffix: number,
  scenarioLabel: string,
) {
  const scenarioUserEmail = `bim-scenario-${scenarioLabel}-${suffix}@mailinator.com`
  const scenarioUserPassword = 'CodexSaaS!2026'
  const organizationName = `BIM Scenario Org ${scenarioLabel} ${suffix}`

  await deleteUserByEmail(scenarioUserEmail).catch(() => Promise.resolve())
  await createTestUser(scenarioUserEmail, scenarioUserPassword)
  await loginAs(page, scenarioUserEmail, scenarioUserPassword)

  await expect(page.getByRole('heading', { name: /Firma anlegen|Create organization/i })).toBeVisible({ timeout: 20_000 })
  await page.getByPlaceholder(/Name der Firma|Organization name/i).fill(organizationName)
  const createOrganizationResponse = page.waitForResponse(
    (response) => response.url().includes('/organizations') && response.request().method() === 'POST',
    { timeout: 20_000 },
  )
  await page.getByTestId('organization-create-submit').click()
  const organizationResponse = await createOrganizationResponse
  expect(organizationResponse.ok()).toBeTruthy()
  const createdOrganization = (await organizationResponse.json()) as { id: string; name: string }

  const workflowHeading = page.getByText(workflowSelectionHeading)
  const toolbarActivity = page.getByTestId('toolbar-activity')
  if (!(await workflowHeading.or(toolbarActivity).isVisible({ timeout: 5_000 }).catch(() => false))) {
    await page.evaluate((organizationId) => {
      window.localStorage.setItem('wow-active-organization-id', organizationId)
    }, createdOrganization.id)
    await page.reload()
  }

  await ensurePostLoginLanding(page, scenarioUserEmail)

  return {
    scenarioUserEmail,
    scenarioUserPassword,
    organizationName,
  }
}

test.describe('bim cyclic coordination', () => {
  test.skip(requireCredentials(), 'E2E credentials are required')

  test('models a BIM cyclic coordination workflow with tools, data objects, gateways, and detailed subflows', async ({
    page,
    request,
  }) => {
    test.setTimeout(420_000)
    const suffix = testSuffix()
    const workflowName = `BIM zyklische Modellkoordination ${suffix}`
    const createdWorkspaceIds: string[] = []
    const createdUserOrganizationIds: string[] = []
    const createdOrganizationNames: string[] = []
    let seededUsers: Record<string, SeededBimUser> = {}
    const createdToolNames = [
      `Engineering-Tool Architektur ${suffix}`,
      `Engineering-Tool TGA ${suffix}`,
      `Engineering-Tool Tragwerk ${suffix}`,
      `AN-CDE ${suffix}`,
      `AG-CDE ${suffix}`,
      `Clash-Detection-Tool ${suffix}`,
    ]
    let accessToken: string | null = null
    let scenarioUserEmail: string | null = null

    try {
      const scenario = await createScenarioUserAndLandOnWorkflowOverview(page, suffix, 'main')
      scenarioUserEmail = scenario.scenarioUserEmail
      createdOrganizationNames.push(scenario.organizationName)
      accessToken = await getAccessToken(page)
      const organizationId = await getActiveOrganizationId(page)
      expect(organizationId).toBeTruthy()
      createdUserOrganizationIds.push(organizationId!)
      seededUsers = await seedBimUsersForOrganization(page, organizationId!, suffix, scenario.scenarioUserEmail)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const [step1Id] = await getActivityNodeIds(page)
      await saveActivityLabel(page, step1Id, 'Koordinationszyklus vorbereiten')

      const step2Id = await createConnectedActivity(page, `activity-node-${step1Id}`, 'Lieferanforderung und BCF-Rueckmeldungen bereitstellen')
      const step3Id = await createConnectedActivity(page, `activity-node-${step2Id}`, 'Fachmodelle disziplinweise bearbeiten')
      const step4Id = await createConnectedActivity(page, `activity-node-${step3Id}`, 'Modelle intern koordinieren und in AN-CDE konsolidieren')
      const step5Id = await createConnectedActivity(page, `activity-node-${step4Id}`, 'Synchrone Modelllieferung an AG-CDE durchfuehren')
      const step6Id = await createConnectedActivity(page, `activity-node-${step5Id}`, 'Koordinations- und Clash-Detection-Lauf durchfuehren')
      const step7Id = await createConnectedActivity(page, `activity-node-${step6Id}`, 'Fachliche Pruefung durchfuehren')
      const step8Id = await createConnectedActivity(page, `activity-node-${step7Id}`, 'Pruefergebnisse konsolidieren')

      const decisionId = await createDecisionGateway(page, step8Id)
      const step10Id = await createConnectedActivity(page, `gateway-node-${decisionId}`, 'Freigabe dokumentieren')
      const step11Id = await createConnectedActivity(page, `gateway-node-${decisionId}`, 'Korrekturen an Auftragnehmer zurueckgeben')
      await createRootEdgeViaApi(request, accessToken!, workflow.id, step11Id, step3Id)
      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect(page.getByTestId(`activity-node-${step11Id}`)).toBeVisible({ timeout: 20_000 })

      await selectEdgeByConnection(page, decisionId, step10Id)
      await saveEdgeLabel(page, 'Freigegeben')
      await selectEdgeByConnection(page, decisionId, step11Id)
      await saveEdgeLabel(page, 'Korrektur erforderlich')

      await updateActivityViaApi(request, accessToken!, workflow.id, step1Id, {
        activity_type: 'weiterleiten_ablegen',
        description: 'Der BIM-Koordinator definiert Zyklus, Stichtag, Lieferumfang und Randbedingungen fuer die anstehende Koordinationsrunde.',
        notes: 'Die Aktivitaet bereitet den Gesamtzyklus vor und macht die Erwartung fuer alle Beteiligten verbindlich.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 60,
        status_icon: 'in_progress',
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step2Id, {
        activity_type: 'weiterleiten_ablegen',
        description: 'Der Auftraggeber stellt Lieferanforderung und BCF-Rueckmeldungen fuer alle Disziplinen bereit.',
        notes: 'Die Rueckmeldungen sind so zu uebergeben, dass sie in den Engineering-Tools der Auftragnehmer importierbar sind.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 45,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step3Id, {
        activity_type: 'transformieren_aktualisieren',
        description: 'Architekt und Fachplaner arbeiten ihre Modelle parallel nach den BCF-Rueckmeldungen fort.',
        notes: 'Die disziplinspezifischen Modelle werden in den jeweiligen Engineering-Tools bearbeitet und fuer den Lieferstichtag vorbereitet.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 240,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step4Id, {
        activity_type: 'weiterleiten_ablegen',
        description: 'Die Auftragnehmerseite sammelt die fortgeschriebenen Fachmodelle und konsolidiert sie in der internen CDE.',
        notes: 'Vor der offiziellen Lieferung wird der Lieferstand auf Vollstaendigkeit und Konsistenz geprueft.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 90,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step5Id, {
        activity_type: 'weiterleiten_ablegen',
        description: 'Die freigegebenen Fachmodelle werden synchron aus der AN-CDE an die AG-CDE uebergeben.',
        notes: 'Der Versand muss fuer alle Disziplinen am abgestimmten Stichtag abgeschlossen sein.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 45,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step6Id, {
        activity_type: 'pruefen_freigeben',
        description: 'Der Auftraggeber uebernimmt die gelieferten Modelle aus der AG-CDE und fuehrt die Koordinations- und Clash-Pruefung aus.',
        notes: 'Das Clash-Detection-Tool greift direkt auf die AG-CDE zu und erzeugt einen konsolidierten Koordinationsbericht.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 120,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step7Id, {
        activity_type: 'pruefen_freigeben',
        description: 'Die Fachspezialisten des Auftraggebers pruefen die koordinierten Modelle und bewerten die Ergebnisse fachlich.',
        notes: 'Geprueft werden Vollstaendigkeit, Plausibilitaet und die Relevanz der erkannten Konflikte fuer die Fachsicht.',
        assignee_user_id: seededUsers.architectureReviewer.userId,
        duration_minutes: 180,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step8Id, {
        activity_type: 'pruefen_freigeben',
        description: 'Der BIM-Koordinator konsolidiert alle Rueckmeldungen der Fachpruefung zu einer belastbaren Gesamtbewertung.',
        notes: 'Am Ende steht die Entscheidung, ob freigegeben oder eine Korrekturschleife ausgeloest wird.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 60,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step10Id, {
        activity_type: 'weiterleiten_ablegen',
        description: 'Die freigegebene Koordinationsrunde wird dokumentiert und fuer nachfolgende Projektarbeit bereitgestellt.',
        notes: 'Das Freigabeergebnis wird nachvollziehbar protokolliert und in den relevanten Systemen abgelegt.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 30,
      })
      await updateActivityViaApi(request, accessToken!, workflow.id, step11Id, {
        activity_type: 'weiterleiten_ablegen',
        description: 'Die konsolidierten Beanstandungen gehen als Rueckmeldung an die Auftragnehmer in die naechste Runde.',
        notes: 'Die Rueckgabe muss klar zwischen steuernden Vorgaben und fachlichen Beanstandungen unterscheiden.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 45,
      })

      await linkActivityTool(page, step3Id, createdToolNames[0], 'BCF-faehiges Authoring fuer Architektur', 'create')
      await linkActivityTool(page, step3Id, createdToolNames[1], 'BCF-faehiges Authoring fuer TGA', 'create')
      await linkActivityTool(page, step3Id, createdToolNames[2], 'BCF-faehiges Authoring fuer Tragwerk', 'create')
      await linkActivityTool(page, step4Id, createdToolNames[3], 'Interne Common Data Environment des Auftragnehmers', 'create')
      await linkActivityTool(page, step5Id, createdToolNames[3], undefined, 'link')
      await linkActivityTool(page, step5Id, createdToolNames[4], 'Common Data Environment des Auftraggebers', 'create')
      await linkActivityTool(page, step6Id, createdToolNames[4], undefined, 'link')
      await linkActivityTool(page, step6Id, createdToolNames[5], 'Separates Tool fuer Clash Detection mit direkter Schnittstelle zur AG-CDE', 'create')

      const bcfObjectId = await addEdgeDataObject(
        page,
        workflow.id,
        step2Id,
        step3Id,
        'BCF-Rueckmeldungen',
        'Direkt',
        'Rueckmeldungen werden direkt an die disziplinspezifischen Engineering-Tools uebergeben.',
      )
      await addEdgeDataObject(
        page,
        workflow.id,
        step4Id,
        step5Id,
        'Lieferpaket',
        'Im Datenspeicher bereitgestellt',
        'Das freigegebene Lieferpaket wird aus der AN-CDE fuer den abgestimmten Termin bereitgestellt.',
      )
      await addEdgeDataObject(
        page,
        workflow.id,
        step5Id,
        step6Id,
        'Fachmodelle',
        'Im Datenspeicher bereitgestellt',
        'Die gelieferten Fachmodelle stehen in der AG-CDE fuer Koordination und Clash Detection bereit.',
      )
      const coordinationReportObjectId = await addEdgeDataObject(
        page,
        workflow.id,
        step6Id,
        step7Id,
        'Koordinationsbericht',
        'Direkt',
        'Der Koordinationsbericht wird direkt an die Fachpruefung fuer die inhaltliche Bewertung uebergeben.',
      )
      await addEdgeDataObject(
        page,
        workflow.id,
        step11Id,
        step3Id,
        'Pruefrueckmeldungen',
        'Direkt',
        'Die Rueckmeldungen starten die naechste Bearbeitungsrunde bei den Auftragnehmern.',
      )

      for (const objectId of [bcfObjectId, coordinationReportObjectId]) {
        const response = await request.post(`http://127.0.0.1:3000/workspaces/${workflow.id}/activities/${step7Id}/check-sources`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            canvas_object_id: objectId,
            notes: 'Dient als Sollzustand fuer die Fachpruefung.',
          },
        })
        expect(response.ok()).toBeTruthy()
      }

      const disciplineWorkflow = await createDetailedWorkflowFromActivity(
        page,
        step3Id,
        `Fachmodelle bearbeiten ${suffix}`,
        'Die Disziplinen arbeiten BCF-Rueckmeldungen ein und aktualisieren ihre Modelle synchron.',
        ['BCF-Rueckmeldungen', 'Abgabetermin'],
        ['Aktualisierte Fachmodelle'],
        [
          'Architekturmodell aktualisieren',
          'TGA-Modell aktualisieren',
          'Tragwerksmodell aktualisieren',
          'BCF-Rueckmeldungen einarbeiten',
          'Modelle intern pruefen',
        ],
      )
      createdWorkspaceIds.push(disciplineWorkflow.id)

      await page.getByTestId(`workspace-trail-${workflow.id}`).click({ force: true })
      await expect(page.getByTestId(`activity-node-${step3Id}`)).toBeVisible({ timeout: 15_000 })

      const contractorCdeWorkflow = await createDetailedWorkflowFromActivity(
        page,
        step4Id,
        `AN-CDE Konsolidierung ${suffix}`,
        'Die Auftragnehmerseite konsolidiert die Fachmodelle in ihrer internen CDE.',
        ['Aktualisierte Fachmodelle'],
        ['Freigegebenes Lieferpaket'],
        [
          'Fachmodelle in AN-CDE bereitstellen',
          'Interne Vollstaendigkeit pruefen',
          'Lieferstand intern freigeben',
        ],
      )
      createdWorkspaceIds.push(contractorCdeWorkflow.id)

      await page.getByTestId(`workspace-trail-${workflow.id}`).click({ force: true })
      await expect(page.getByTestId(`activity-node-${step4Id}`)).toBeVisible({ timeout: 15_000 })

      const clashWorkflow = await createDetailedWorkflowFromActivity(
        page,
        step6Id,
        `Koordination und Clash Detection ${suffix}`,
        'Der Auftraggeber uebernimmt Modelle aus der AG-CDE und fuehrt den Clash-Lauf aus.',
        ['Fachmodelle in AG-CDE'],
        ['Koordinationsbericht'],
        [
          'Modelle aus AG-CDE uebernehmen',
          'Clash-Detection-Lauf ausfuehren',
          'Konflikte klassifizieren',
          'Koordinationsbericht bereitstellen',
        ],
      )
      createdWorkspaceIds.push(clashWorkflow.id)

      await page.getByTestId(`workspace-trail-${workflow.id}`).click({ force: true })
      await expect(page.getByTestId(`activity-node-${step6Id}`)).toBeVisible({ timeout: 15_000 })

      const reviewWorkflow = await createDetailedWorkflowFromActivity(
        page,
        step7Id,
        `Fachliche Pruefung ${suffix}`,
        'Die Fachspezialisten pruefen die koordinierten Modelle und liefern Rueckmeldungen.',
        ['Koordinationsbericht', 'Fachmodelle'],
        ['Pruefrueckmeldungen'],
        [
          'Pruefpaket an Fachspezialisten verteilen',
          'Architektur pruefen',
          'TGA pruefen',
          'Tragwerk pruefen',
          'Rueckmeldungen an Koordinator uebergeben',
        ],
      )
      createdWorkspaceIds.push(reviewWorkflow.id)

      const disciplineActivities = await listActivitiesViaApi(request, accessToken!, disciplineWorkflow.id)
      await updateActivityViaApi(request, accessToken!, disciplineWorkflow.id, String(disciplineActivities.find((entry) => entry.label === 'Architekturmodell aktualisieren')?.id), {
        activity_type: 'transformieren_aktualisieren',
        description: 'Das Architekturmodell wird anhand der Rueckmeldungen und Koordinationsvorgaben aktualisiert.',
        notes: 'Dabei sind die BCF-Hinweise aus der letzten Runde nachzuverfolgen und sauber zu schliessen.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 120,
      })
      await updateActivityViaApi(request, accessToken!, disciplineWorkflow.id, String(disciplineActivities.find((entry) => entry.label === 'TGA-Modell aktualisieren')?.id), {
        activity_type: 'transformieren_aktualisieren',
        description: 'Das TGA-Modell wird gemaess Rueckmeldungen angepasst und erneut abgestimmt.',
        notes: 'Schnittstellen zum Architektur- und Tragwerksmodell sind vor der Freigabe intern zu pruefen.',
        assignee_user_id: seededUsers.tgaPlanner.userId,
        duration_minutes: 120,
      })
      await updateActivityViaApi(request, accessToken!, disciplineWorkflow.id, String(disciplineActivities.find((entry) => entry.label === 'Tragwerksmodell aktualisieren')?.id), {
        activity_type: 'transformieren_aktualisieren',
        description: 'Das Tragwerksmodell wird auf Basis der Rueckmeldungen fuer die naechste Lieferung aktualisiert.',
        notes: 'Geometrische und fachliche Konflikte mit Architektur und TGA muessen intern abgestimmt werden.',
        assignee_user_id: seededUsers.structuralPlanner.userId,
        duration_minutes: 120,
      })
      await updateActivityViaApi(request, accessToken!, disciplineWorkflow.id, String(disciplineActivities.find((entry) => entry.label === 'BCF-Rueckmeldungen einarbeiten')?.id), {
        activity_type: 'transformieren_aktualisieren',
        description: 'Die Rueckmeldungen aus der letzten Koordinationsrunde werden in die jeweiligen Modelle uebernommen.',
        notes: 'Nicht erledigte Punkte muessen nachvollziehbar dokumentiert und fuer die naechste Runde gekennzeichnet werden.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 90,
      })
      await updateActivityViaApi(request, accessToken!, disciplineWorkflow.id, String(disciplineActivities.find((entry) => entry.label === 'Modelle intern pruefen')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Vor der Lieferung werden die disziplinspezifischen Modelle intern auf Plausibilitaet und Vollstaendigkeit geprueft.',
        notes: 'Nur intern gepruefte Modelle duerfen an die AN-CDE uebergeben werden.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 60,
      })

      const contractorActivities = await listActivitiesViaApi(request, accessToken!, contractorCdeWorkflow.id)
      await updateActivityViaApi(request, accessToken!, contractorCdeWorkflow.id, String(contractorActivities.find((entry) => entry.label === 'Fachmodelle in AN-CDE bereitstellen')?.id), {
        activity_type: 'weiterleiten_ablegen',
        description: 'Die disziplinspezifischen Modelle werden in der internen AN-CDE gesammelt und versioniert bereitgestellt.',
        notes: 'Es ist sicherzustellen, dass nur der freigegebene interne Lieferstand in die CDE gelangt.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 45,
      })
      await updateActivityViaApi(request, accessToken!, contractorCdeWorkflow.id, String(contractorActivities.find((entry) => entry.label === 'Interne Vollstaendigkeit pruefen')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Die AN-Seite prueft Vollstaendigkeit, Dateistand und Lieferfaehigkeit der Modelle.',
        notes: 'Fehlende oder veraltete Disziplinbeitraege muessen vor der offiziellen Lieferung nachgezogen werden.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 45,
      })
      await updateActivityViaApi(request, accessToken!, contractorCdeWorkflow.id, String(contractorActivities.find((entry) => entry.label === 'Lieferstand intern freigeben')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Die Auftragnehmerseite gibt den finalen Lieferstand fuer die synchrone Uebergabe frei.',
        notes: 'Mit dieser Freigabe darf das Lieferpaket an die AG-CDE uebergeben werden.',
        assignee_user_id: seededUsers.architect.userId,
        duration_minutes: 30,
      })

      const clashActivities = await listActivitiesViaApi(request, accessToken!, clashWorkflow.id)
      await updateActivityViaApi(request, accessToken!, clashWorkflow.id, String(clashActivities.find((entry) => entry.label === 'Modelle aus AG-CDE uebernehmen')?.id), {
        activity_type: 'weiterleiten_ablegen',
        description: 'Die gelieferten Modelle werden aus der AG-CDE fuer die Koordination uebernommen.',
        notes: 'Es ist sicherzustellen, dass der freigegebene Lieferstand der aktuellen Runde verwendet wird.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 30,
      })
      await updateActivityViaApi(request, accessToken!, clashWorkflow.id, String(clashActivities.find((entry) => entry.label === 'Clash-Detection-Lauf ausfuehren')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Das separate Clash-Detection-Tool prueft die aktuellen Modelle auf Kollisionen und Koordinationsprobleme.',
        notes: 'Die Pruefung nutzt die direkte Schnittstelle zwischen Clash-Tool und AG-CDE.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 60,
      })
      await updateActivityViaApi(request, accessToken!, clashWorkflow.id, String(clashActivities.find((entry) => entry.label === 'Konflikte klassifizieren')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Die gefundenen Konflikte werden nach Relevanz, Dringlichkeit und Fachbetroffenheit eingeordnet.',
        notes: 'Nur fachlich relevante Treffer sollen in den Koordinationsbericht uebernommen werden.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 45,
      })
      await updateActivityViaApi(request, accessToken!, clashWorkflow.id, String(clashActivities.find((entry) => entry.label === 'Koordinationsbericht bereitstellen')?.id), {
        activity_type: 'weiterleiten_ablegen',
        description: 'Der Koordinationsbericht wird fuer die fachliche Pruefung bereitgestellt.',
        notes: 'Die Dokumentation muss nachvollziehbar zeigen, welche Disziplin von welchen Konflikten betroffen ist.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 30,
      })

      const reviewActivities = await listActivitiesViaApi(request, accessToken!, reviewWorkflow.id)
      await updateActivityViaApi(request, accessToken!, reviewWorkflow.id, String(reviewActivities.find((entry) => entry.label === 'Pruefpaket an Fachspezialisten verteilen')?.id), {
        activity_type: 'weiterleiten_ablegen',
        description: 'Der BIM-Koordinator verteilt die pruefrelevanten Unterlagen an die zustÃ¤ndigen Fachspezialisten.',
        notes: 'Jeder Fachspezialist muss genau die Unterlagen erhalten, die fuer sein Fachgebiet relevant sind.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 30,
      })
      await updateActivityViaApi(request, accessToken!, reviewWorkflow.id, String(reviewActivities.find((entry) => entry.label === 'Architektur pruefen')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Die Architekturpruefung bewertet die fachliche Plausibilitaet und Konfliktfreiheit aus architektonischer Sicht.',
        notes: 'Der Sollzustand ergibt sich aus Koordinationsbericht und Rueckmeldungen der Architektur.',
        assignee_user_id: seededUsers.architectureReviewer.userId,
        duration_minutes: 60,
      })
      await updateActivityViaApi(request, accessToken!, reviewWorkflow.id, String(reviewActivities.find((entry) => entry.label === 'TGA pruefen')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Die TGA-Pruefung bewertet die gelieferten Modelle aus Sicht der technischen Gebaeudeausruestung.',
        notes: 'Besonderes Augenmerk liegt auf Kollisionen und fehlenden Informationen an fachlichen Schnittstellen.',
        assignee_user_id: seededUsers.tgaReviewer.userId,
        duration_minutes: 60,
      })
      await updateActivityViaApi(request, accessToken!, reviewWorkflow.id, String(reviewActivities.find((entry) => entry.label === 'Tragwerk pruefen')?.id), {
        activity_type: 'pruefen_freigeben',
        description: 'Die Tragwerkspruefung bewertet die Modelle hinsichtlich statisch relevanter Konflikte und Vollstaendigkeit.',
        notes: 'Kritische Konflikte muessen mit klarer Priorisierung an die Koordination zurueckgegeben werden.',
        assignee_user_id: seededUsers.structuralReviewer.userId,
        duration_minutes: 60,
      })
      await updateActivityViaApi(request, accessToken!, reviewWorkflow.id, String(reviewActivities.find((entry) => entry.label === 'Rueckmeldungen an Koordinator uebergeben')?.id), {
        activity_type: 'weiterleiten_ablegen',
        description: 'Die Fachspezialisten uebergeben ihre konsolidierten Rueckmeldungen an den BIM-Koordinator.',
        notes: 'Rueckmeldungen muessen so uebergeben werden, dass sie in die naechste Koordinations- und BCF-Runde uebernommen werden koennen.',
        assignee_user_id: seededUsers.bimCoordinator.userId,
        duration_minutes: 30,
      })

      await assertActivitySemanticsComplete(request, accessToken!, workflow.id, [
        'Koordinationszyklus vorbereiten',
        'Lieferanforderung und BCF-Rueckmeldungen bereitstellen',
        'Fachmodelle disziplinweise bearbeiten',
        'Modelle intern koordinieren und in AN-CDE konsolidieren',
        'Synchrone Modelllieferung an AG-CDE durchfuehren',
        'Koordinations- und Clash-Detection-Lauf durchfuehren',
        'Fachliche Pruefung durchfuehren',
        'Pruefergebnisse konsolidieren',
        'Freigabe dokumentieren',
        'Korrekturen an Auftragnehmer zurueckgeben',
      ])
      await assertActivitySemanticsComplete(request, accessToken!, disciplineWorkflow.id, [
        'Architekturmodell aktualisieren',
        'TGA-Modell aktualisieren',
        'Tragwerksmodell aktualisieren',
        'BCF-Rueckmeldungen einarbeiten',
        'Modelle intern pruefen',
      ])
      await assertActivitySemanticsComplete(request, accessToken!, contractorCdeWorkflow.id, [
        'Fachmodelle in AN-CDE bereitstellen',
        'Interne Vollstaendigkeit pruefen',
        'Lieferstand intern freigeben',
      ])
      await assertActivitySemanticsComplete(request, accessToken!, clashWorkflow.id, [
        'Modelle aus AG-CDE uebernehmen',
        'Clash-Detection-Lauf ausfuehren',
        'Konflikte klassifizieren',
        'Koordinationsbericht bereitstellen',
      ])
      await assertActivitySemanticsComplete(request, accessToken!, reviewWorkflow.id, [
        'Pruefpaket an Fachspezialisten verteilen',
        'Architektur pruefen',
        'TGA pruefen',
        'Tragwerk pruefen',
        'Rueckmeldungen an Koordinator uebergeben',
      ])

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await page.getByTestId(`workspace-trail-${workflow.id}`).click({ force: true })
      await expect(page.getByTestId(`activity-node-${step7Id}`)).toBeVisible({ timeout: 15_000 })

      await expect(page.getByTestId(`activity-role-${step6Id}`)).toContainText('BIM-Koordination')
      await expect(page.getByTestId(`activity-assignee-${step6Id}`)).toContainText('AG BIM-Koordinator')
      await expect(page.getByTestId(`activity-role-${step7Id}`)).toContainText('Fachpruefung')
      await expect(page.getByTestId(`activity-assignee-${step7Id}`)).toContainText('AG Fachspezialist Architektur')

      await expect(page.getByText('Freigegeben', { exact: true })).toBeVisible()
      await expect(page.getByText('Korrektur erforderlich', { exact: true })).toBeVisible()
      await expect(page.getByTitle('BCF-Rueckmeldungen', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Lieferpaket', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Fachmodelle', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Koordinationsbericht', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Pruefrueckmeldungen', { exact: true }).first()).toBeVisible()
      await expect(page.getByTestId(`subprocess-badge-${step3Id}`)).toBeVisible()
      await expect(page.getByTestId(`subprocess-badge-${step4Id}`)).toBeVisible()
      await expect(page.getByTestId(`subprocess-badge-${step6Id}`)).toBeVisible()
      await expect(page.getByTestId(`subprocess-badge-${step7Id}`)).toBeVisible()
      await expect(page.getByText(/Internal server error/i)).toHaveCount(0)
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBeGreaterThan(10)

      await expect.poll(() => countITToolsByName(createdToolNames[3]), { timeout: 15_000 }).toBe(1)
      await expect.poll(() => countITToolsByName(createdToolNames[4]), { timeout: 15_000 }).toBe(1)
      await expect.poll(() => countITToolsByName(createdToolNames[5]), { timeout: 15_000 }).toBe(1)

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()

      await expect(page.getByTestId(`activity-node-${step1Id}`)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId(`gateway-node-${decisionId}`)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText('Freigegeben', { exact: true })).toBeVisible()
      await expect(page.getByText('Korrektur erforderlich', { exact: true })).toBeVisible()
      await expect(page.getByTitle('BCF-Rueckmeldungen', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Lieferpaket', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Fachmodelle', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Koordinationsbericht', { exact: true }).first()).toBeVisible()
      await expect(page.getByTitle('Pruefrueckmeldungen', { exact: true }).first()).toBeVisible()
      await expect(page.getByTestId(`subprocess-badge-${step3Id}`)).toBeVisible()

      await page.getByTestId(`subprocess-badge-${step6Id}`).click()
      await expect(page.getByText('Clash-Detection-Lauf ausfuehren', { exact: true })).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText('Koordinationsbericht bereitstellen', { exact: true })).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-trail-${workflow.id}`).click({ force: true })

      await openActivityDetail(page, step6Id)
      await expect(page.getByTestId('activity-detail-label')).toHaveValue('Koordinations- und Clash-Detection-Lauf durchfuehren')
      await expect(page.locator('input[type="number"]').first()).toHaveValue('120')
      await expect(page.getByTestId('activity-assignee-select-trigger')).toContainText('BIM-Koordination')
      await expect(page.locator('[data-testid^="activity-tool-chip-"]')).toContainText([createdToolNames[4], createdToolNames[5]])
      await closeActivityDetail(page)

      await openActivityDetail(page, step7Id)
      const reviewDetail = page.getByTestId(`activity-detail-${step7Id}`)
      await expect(reviewDetail.getByText('Koordinationsbericht', { exact: true })).toBeVisible()
      await expect(reviewDetail.getByText('BCF-Rueckmeldungen', { exact: true })).toBeVisible()
      await closeActivityDetail(page)

      await page.getByTestId('toolbar-grouping-toggle').click()
      await expect(page.getByTestId('role-lane-BIM-Koordination')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('role-lane-Architektur')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('role-lane-Fachpruefung')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByTestId('role-lane-TGA')).toHaveCount(0)
      await expect(page.getByTestId('role-lane-Tragwerk')).toHaveCount(0)
      await expect(page.getByTestId(`activity-role-${step6Id}`)).toHaveCount(0)
      await expect(page.getByTestId(`activity-assignee-${step6Id}`)).toHaveCount(0)
      await expect(page.getByTestId(`activity-owner-${step6Id}`)).toHaveCount(0)
      await expect(page.getByTestId(`activity-node-${step6Id}`)).toContainText('Koordinations- und Clash-Detection-Lauf durchfuehren')
      await expect(page.getByTestId(`activity-node-${step7Id}`)).toContainText('Fachliche Pruefung durchfuehren')

      await page.getByTestId('toolbar-grouping-toggle').click()
      await expect(page.getByTestId(`activity-role-${step6Id}`)).toContainText('BIM-Koordination')
      await expect(page.getByTestId(`activity-assignee-${step6Id}`)).toContainText('AG BIM-Koordinator')
      await expect(page.getByText(/Internal server error/i)).toHaveCount(0)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupITToolsByNames(createdToolNames)
      if (createdUserOrganizationIds[0]) {
        await cleanupSeededBimUsers(createdUserOrganizationIds[0], seededUsers)
      }
      await cleanupOrganizationsByNames(createdOrganizationNames)
      if (scenarioUserEmail) {
        await deleteUserByEmail(scenarioUserEmail).catch(() => Promise.resolve())
      }
    }
  })

  test('models an explicit merge gateway after parallel BIM review branches', async ({ page, request }) => {
    test.setTimeout(180_000)
    const suffix = testSuffix()
    const workflowName = `BIM Merge Koordination ${suffix}`
    const createdWorkspaceIds: string[] = []
    const createdOrganizationNames: string[] = []
    let accessToken: string | null = null
    let scenarioUserEmail: string | null = null

    try {
      const scenario = await createScenarioUserAndLandOnWorkflowOverview(page, suffix, 'merge')
      scenarioUserEmail = scenario.scenarioUserEmail
      createdOrganizationNames.push(scenario.organizationName)
      accessToken = await getAccessToken(page)
      const workflow = await createWorkflow(page, workflowName)
      createdWorkspaceIds.push(workflow.id)

      await expect.poll(async () => (await getStartNodeIds(page)).length, { timeout: 15_000 }).toBe(1)
      await expect.poll(async () => (await getActivityNodeIds(page)).length, { timeout: 15_000 }).toBe(1)

      const [step1Id] = await getActivityNodeIds(page)
      await saveActivityLabel(page, step1Id, 'Koordinationsbericht bereitstellen')
      const decisionId = await createDecisionGateway(page, step1Id)
      const architectureReviewId = await createConnectedActivity(page, `gateway-node-${decisionId}`, 'Architektur pruefen')
      const tgaReviewId = await createConnectedActivity(page, `gateway-node-${decisionId}`, 'TGA pruefen')

      await selectEdgeByConnection(page, decisionId, architectureReviewId)
      await saveEdgeLabel(page, 'Architektur')
      await selectEdgeByConnection(page, decisionId, tgaReviewId)
      await saveEdgeLabel(page, 'TGA')

      const existingGatewayIds = await getGatewayNodeIds(page)
      await page.getByTestId(`activity-node-${architectureReviewId}`).click()
      await page.getByTestId('toolbar-merge').click()
      await expect.poll(async () => (await getGatewayNodeIds(page)).length, { timeout: 15_000 }).toBe(existingGatewayIds.length + 1)
      const mergeId = (await getGatewayNodeIds(page)).find((id) => !existingGatewayIds.includes(id))
      expect(mergeId).toBeTruthy()

      await createRootEdgeViaApi(request, accessToken!, workflow.id, tgaReviewId, mergeId!)
      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect(page.getByTestId(`gateway-node-${mergeId!}`)).toBeVisible({ timeout: 20_000 })

      const finalStepId = await createConnectedActivity(page, `gateway-node-${mergeId!}`, 'Pruefrueckmeldungen konsolidieren')

      await expect(page.getByText('Architektur', { exact: true })).toBeVisible()
      await expect(page.getByText('TGA', { exact: true })).toBeVisible()
      await expect(page.getByTestId(`gateway-node-${decisionId}`)).toBeVisible()
      await expect(page.getByTestId(`gateway-node-${mergeId!}`)).toBeVisible()
      await expect(page.getByTestId(`activity-node-${finalStepId}`)).toBeVisible()
      await expect.poll(async () => getEdgeCount(page), { timeout: 15_000 }).toBeGreaterThanOrEqual(5)

      await page.reload()
      await expect(page.getByText(workflowSelectionHeading)).toBeVisible({ timeout: 20_000 })
      await page.getByTestId(`workspace-open-${workflow.id}`).click()
      await expect(page.getByTestId(`gateway-node-${decisionId}`)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByTestId(`gateway-node-${mergeId!}`)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText('Architektur', { exact: true })).toBeVisible()
      await expect(page.getByText('TGA', { exact: true })).toBeVisible()
      await expect(page.getByTestId(`activity-node-${finalStepId}`)).toBeVisible()
      await expect(page.getByText(/Internal server error/i)).toHaveCount(0)
    } finally {
      await cleanupWorkspaces(request, createdWorkspaceIds, accessToken)
      await cleanupOrganizationsByNames(createdOrganizationNames)
      if (scenarioUserEmail) {
        await deleteUserByEmail(scenarioUserEmail).catch(() => Promise.resolve())
      }
    }
  })
})


