import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)
export const roles = {
  user: { label: 'User', login: '/login', dashboard: '/user' },
  employee: { label: 'Staff', login: '/staff/login', dashboard: '/staff' },
  admin: { label: 'Admin', login: '/admin/login', dashboard: '/admin' },
}

export function useAuth() {
  return useContext(AuthContext)
}
