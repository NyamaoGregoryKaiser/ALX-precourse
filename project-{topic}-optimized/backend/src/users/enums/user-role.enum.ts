/**
 * Defines the possible roles a user can have within the system.
 * These roles are used for role-based access control (RBAC).
 */
export enum UserRole {
  ADMIN = 'ADMIN',      // Full administrative privileges, can manage all users, projects, tasks.
  MANAGER = 'MANAGER',  // Can manage projects and tasks, typically within their owned projects.
  ANALYST = 'ANALYST',  // Can view reports and project data, but not create/edit.
  USER = 'USER',        // Standard user, can manage their own projects and assigned tasks.
  GUEST = 'GUEST',      // Limited read-only access, primarily for public content (if any).
}