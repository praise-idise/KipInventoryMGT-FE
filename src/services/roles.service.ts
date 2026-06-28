import { apiClient } from '@/api/client'

export type RoleItem = {
    id: string
    name: string
    description?: string | null
}

export async function fetchRoles(): Promise<RoleItem[]> {
    const response = await apiClient.get<RoleItem[]>('/Roles')
    return response.data ?? []
}

export async function createRole(values: { name: string; description?: string }): Promise<RoleItem> {
    const response = await apiClient.post<RoleItem>('/Roles', values)
    return response.data!
}

export async function updateRole(roleId: string, values: { name?: string; description?: string }): Promise<RoleItem> {
    const response = await apiClient.patch<RoleItem>(`/Roles/${roleId}`, values)
    return response.data!
}

export async function deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`/Roles/${roleId}`)
}
