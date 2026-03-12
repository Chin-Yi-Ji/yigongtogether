/**
 * 管理員權限：ADMIN_EMAIL 或 User.role === "admin"
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "allen82218@gmail.com"

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin"
}

/** 是否為管理員（email 或 role 任一符合即可） */
export function isAdmin(params: {
  email?: string | null
  role?: string | null
}): boolean {
  return isAdminEmail(params.email) || isAdminRole(params.role)
}
