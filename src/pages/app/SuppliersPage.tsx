import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui'
import { CrudResourcePage, type CrudColumn, type CrudField } from '@/components/app/CrudResourcePage'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import {
    createSupplier,
    deleteSupplier,
    fetchSuppliers,
    type SupplierFormValues,
    type SupplierItem,
    updateSupplier,
} from '@/services/suppliers.service'

const optionalEmail = z.email('Enter a valid email.').or(z.literal(''))

const schema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: optionalEmail,
    phone: z.string(),
    contactPerson: z.string(),
    leadTimeDays: z.coerce.number().min(0, 'Lead time must be zero or greater.'),
    isActive: z.boolean(),
})

const fields: CrudField<SupplierFormValues>[] = [
    { name: 'name', label: 'Name', required: true, placeholder: 'Kip Core Supplies Ltd' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'procurement@kipcore.com' },
    { name: 'phone', label: 'Phone', placeholder: '+2348012345678' },
    { name: 'contactPerson', label: 'Contact Person', placeholder: 'Amina Yusuf' },
    { name: 'leadTimeDays', label: 'Lead Time Days', required: true, type: 'number', placeholder: '7' },
    { name: 'isActive', label: 'Supplier is active', type: 'checkbox', modes: ['edit'] },
]

const columns: CrudColumn<SupplierItem>[] = [
    { header: 'Name', render: (item) => item.name },
    { header: 'Contact', render: (item) => item.contactPerson || '—' },
    { header: 'Email', render: (item) => item.email || '—' },
    { header: 'Phone', render: (item) => item.phone || '—' },
    { header: 'Lead Time', render: (item) => `${item.leadTimeDays} days` },
    {
        header: 'Status',
        truncate: false,
        render: (item) => (
            <Badge variant="outline" className={getStatusBadgeClassName(item.isActive ? 'Active' : 'Inactive')}>
                {item.isActive ? 'Active' : 'Inactive'}
            </Badge>
        ),
    },
]

export function SuppliersPage() {
    return (
        <CrudResourcePage<SupplierItem, SupplierFormValues>
            title="Suppliers"
            description="Maintain supplier records used across procurement and replenishment workflows."
            entityLabel="Supplier"
            queryKey="suppliers"
            searchPlaceholder="Search suppliers by name, email, phone, or contact person"
            fields={fields}
            columns={columns}
            resolver={zodResolver(schema)}
            getItemId={(item) => item.supplierId}
            getDefaultValues={(item) => ({
                name: item?.name ?? '',
                email: item?.email ?? '',
                phone: item?.phone ?? '',
                contactPerson: item?.contactPerson ?? '',
                leadTimeDays: item?.leadTimeDays ?? 7,
                isActive: item?.isActive ?? true,
            })}
            fetchItems={fetchSuppliers}
            createItem={createSupplier}
            updateItem={(item, values) => updateSupplier(item.supplierId, values)}
            deleteItem={(item) => deleteSupplier(item.supplierId)}
            getDeleteLabel={(item) => item.name}
            getViewPath={(item) => `/app/suppliers/${item.supplierId}`}
        />
    )
}
