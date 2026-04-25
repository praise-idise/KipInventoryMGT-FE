import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CrudResourcePage, type CrudColumn, type CrudField } from '@/components/app/CrudResourcePage'
import {
    createCustomer,
    deleteCustomer,
    fetchCustomers,
    type CustomerFormValues,
    type CustomerItem,
    updateCustomer,
} from '@/services/customers.service'

const optionalEmail = z.string().email('Enter a valid email.').or(z.literal(''))

const schema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: optionalEmail,
    phone: z.string(),
})

const fields: CrudField<CustomerFormValues>[] = [
    { name: 'name', label: 'Name', required: true, placeholder: 'Walk-in Customer' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'customer@example.com' },
    { name: 'phone', label: 'Phone', placeholder: '+2348012345678' },
]

const columns: CrudColumn<CustomerItem>[] = [
    { header: 'Name', render: (item) => item.name },
    { header: 'Email', render: (item) => item.email || '—' },
    { header: 'Phone', render: (item) => item.phone || '—' },
]

export function CustomersPage() {
    return (
        <CrudResourcePage<CustomerItem, CustomerFormValues>
            title="Customers"
            description="Manage customer records used in sales orders and fulfillment workflows."
            entityLabel="Customer"
            queryKey="customers"
            searchPlaceholder="Search customers by name, email, or phone"
            fields={fields}
            columns={columns}
            resolver={zodResolver(schema)}
            getItemId={(item) => item.customerId}
            getDefaultValues={(item) => ({
                name: item?.name ?? '',
                email: item?.email ?? '',
                phone: item?.phone ?? '',
            })}
            fetchItems={fetchCustomers}
            createItem={createCustomer}
            updateItem={(item, values) => updateCustomer(item.customerId, values)}
            deleteItem={(item) => deleteCustomer(item.customerId)}
            getDeleteLabel={(item) => item.name}
            getViewPath={(item) => `/app/customers/${item.customerId}`}
        />
    )
}
