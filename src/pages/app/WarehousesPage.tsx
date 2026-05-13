import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui'
import { CrudResourcePage, type CrudColumn, type CrudField } from '@/components/app/CrudResourcePage'
import { getStatusBadgeClassName } from '@/lib/status-badge'
import {
    createWarehouse,
    deleteWarehouse,
    fetchWarehouses,
    type WarehouseFormValues,
    type WarehouseItem,
    updateWarehouse,
} from '@/services/warehouses.service'

const schema = z.object({
    name: z.string().min(1, 'Name is required.'),
    state: z.string().min(3, 'State must be at least 3 characters.'),
    location: z.string(),
    capacityUnits: z.coerce.number().min(0, 'Capacity must be zero or greater.'),
    isActive: z.boolean(),
})

const fields: CrudField<WarehouseFormValues>[] = [
    { name: 'name', label: 'Name', required: true, placeholder: 'Lagos Central Warehouse' },
    { name: 'state', label: 'State', required: true, placeholder: 'Lagos' },
    { name: 'location', label: 'Location', placeholder: 'Ikeja, Lagos' },
    { name: 'capacityUnits', label: 'Capacity Units', required: true, type: 'number', placeholder: '25000' },
    { name: 'isActive', label: 'Warehouse is active', type: 'checkbox', modes: ['edit'] },
]

const columns: CrudColumn<WarehouseItem>[] = [
    { header: 'Code', render: (item) => item.code },
    { header: 'Name', render: (item) => item.name },
    { header: 'State', render: (item) => item.state },
    { header: 'Location', render: (item) => item.location || '—' },
    { header: 'Capacity', render: (item) => item.capacityUnits.toLocaleString() },
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

export function WarehousesPage() {
    return (
        <CrudResourcePage<WarehouseItem, WarehouseFormValues>
            title="Warehouses"
            description="Manage warehouse locations, search them, and maintain active warehouse records."
            entityLabel="Warehouse"
            queryKey="warehouses"
            searchPlaceholder="Search warehouses by name, code, state, or location"
            fields={fields}
            columns={columns}
            resolver={zodResolver(schema)}
            getItemId={(item) => item.warehouseId}
            getDefaultValues={(item) => ({
                name: item?.name ?? '',
                state: item?.state ?? '',
                location: item?.location ?? '',
                capacityUnits: item?.capacityUnits ?? 0,
                isActive: item?.isActive ?? true,
            })}
            fetchItems={fetchWarehouses}
            createItem={createWarehouse}
            updateItem={(item, values) => updateWarehouse(item.warehouseId, values)}
            deleteItem={(item) => deleteWarehouse(item.warehouseId)}
            getDeleteLabel={(item) => item.name}
            getViewPath={(item) => `/app/warehouses/${item.warehouseId}`}
        />
    )
}
