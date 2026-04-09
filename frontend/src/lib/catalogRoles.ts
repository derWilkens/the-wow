import type { CatalogRole } from '../types'
import type { CustomChoiceOption } from '../components/ui/CustomChoiceList'

export function buildCatalogRoleChoiceOptions(roles: CatalogRole[]): CustomChoiceOption[] {
  return roles
    .slice()
    .sort((left, right) => left.label.localeCompare(right.label, 'de'))
    .map((role) => ({
      id: role.id,
      label: role.label,
      description: role.description,
      badges: role.acronym ? [role.acronym] : [],
      meta: role,
    }))
}
