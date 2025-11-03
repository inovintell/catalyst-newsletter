export type Role = 'super_admin' | 'admin' | 'editor' | 'viewer' | 'user';

export type Permission =
  | 'newsletter.create'
  | 'newsletter.edit'
  | 'newsletter.delete'
  | 'newsletter.view'
  | 'newsletter.publish'
  | 'source.create'
  | 'source.edit'
  | 'source.delete'
  | 'source.view'
  | 'user.create'
  | 'user.edit'
  | 'user.delete'
  | 'user.view'
  | 'settings.edit'
  | 'settings.view';

export const roleHierarchy: Record<Role, number> = {
  super_admin: 100,
  admin: 80,
  editor: 60,
  viewer: 40,
  user: 20,
};

export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: [
    'newsletter.create',
    'newsletter.edit',
    'newsletter.delete',
    'newsletter.view',
    'newsletter.publish',
    'source.create',
    'source.edit',
    'source.delete',
    'source.view',
    'user.create',
    'user.edit',
    'user.delete',
    'user.view',
    'settings.edit',
    'settings.view',
  ],
  admin: [
    'newsletter.create',
    'newsletter.edit',
    'newsletter.delete',
    'newsletter.view',
    'newsletter.publish',
    'source.create',
    'source.edit',
    'source.delete',
    'source.view',
    'user.create',
    'user.edit',
    'user.view',
    'settings.edit',
    'settings.view',
  ],
  editor: [
    'newsletter.create',
    'newsletter.edit',
    'newsletter.view',
    'newsletter.publish',
    'source.create',
    'source.edit',
    'source.view',
    'user.view',
    'settings.view',
  ],
  viewer: [
    'newsletter.view',
    'source.view',
    'user.view',
    'settings.view',
  ],
  user: [
    'newsletter.view',
    'source.view',
    'settings.view',
  ],
};

export function hasPermission(
  userRole: Role | undefined,
  requiredPermission: Permission
): boolean {
  if (!userRole) return false;

  const permissions = rolePermissions[userRole];
  return permissions.includes(requiredPermission);
}

export function hasRole(
  userRole: Role | undefined,
  requiredRole: Role
): boolean {
  if (!userRole) return false;

  const userLevel = roleHierarchy[userRole];
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

export function canAccessResource(
  userRole: Role | undefined,
  resourceType: 'newsletter' | 'source' | 'user' | 'settings',
  action: 'create' | 'edit' | 'delete' | 'view'
): boolean {
  const permission = `${resourceType}.${action}` as Permission;
  return hasPermission(userRole, permission);
}

export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    editor: 'Editor',
    viewer: 'Viewer',
    user: 'User',
  };

  return displayNames[role] || role;
}

export function getAvailableRoles(currentUserRole: Role): Role[] {
  if (!currentUserRole) return [];

  const currentLevel = roleHierarchy[currentUserRole];

  return (Object.entries(roleHierarchy) as [Role, number][])
    .filter(([_, level]) => level <= currentLevel)
    .map(([role]) => role);
}

export function validateRoleAssignment(
  assigningUserRole: Role | undefined,
  targetRole: Role
): boolean {
  if (!assigningUserRole) return false;

  const assigningLevel = roleHierarchy[assigningUserRole];
  const targetLevel = roleHierarchy[targetRole];

  return assigningLevel >= targetLevel;
}

export function mergePermissions(
  rolePermissions: Permission[],
  additionalPermissions: Permission[]
): Permission[] {
  const permissionSet = new Set([...rolePermissions, ...additionalPermissions]);
  return Array.from(permissionSet);
}

export function filterPermissionsByResource(
  permissions: Permission[],
  resourceType: 'newsletter' | 'source' | 'user' | 'settings'
): Permission[] {
  return permissions.filter(permission =>
    permission.startsWith(`${resourceType}.`)
  );
}

export function getResourceActions(
  userRole: Role | undefined,
  resourceType: 'newsletter' | 'source' | 'user' | 'settings'
): ('create' | 'edit' | 'delete' | 'view')[] {
  if (!userRole) return [];

  const permissions = rolePermissions[userRole];
  const resourcePermissions = filterPermissionsByResource(permissions, resourceType);

  return resourcePermissions
    .map(p => p.split('.')[1] as 'create' | 'edit' | 'delete' | 'view')
    .filter((action, index, self) => self.indexOf(action) === index);
}