import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { isApiError } from '@/api/types'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, PasswordInput, toast } from '@/components/ui'
import { signup } from '@/services/auth.service'

const schema = z.object({
    firstName: z.string().trim().min(1, 'First name is required.'),
    lastName: z.string().trim().min(1, 'Last name is required.'),
    email: z.email('Enter a valid email address.'),
    phoneNumber: z
        .string()
        .trim()
        .optional()
        .or(z.literal(''))
        .refine((value) => !value || /^\+[1-9]\d{7,14}$/.test(value), {
            message: 'Phone number must be in international format (e.g. +2348012345678).',
        }),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
}).refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
})

type SignupFormValues = z.infer<typeof schema>

export function SignupPage() {
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        clearErrors,
        setError,
    } = useForm<SignupFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            password: '',
            confirmPassword: '',
        },
    })

    async function onSubmit(values: SignupFormValues) {
        clearErrors('root')

        try {
            const response = await signup({
                firstName: values.firstName.trim(),
                lastName: values.lastName.trim(),
                email: values.email.trim(),
                phoneNumber: values.phoneNumber?.trim() || undefined,
                password: values.password,
            })

            toast.success(response.message || 'Account created. Please check your email to verify your account.')
            navigate({ to: '/auth/login' })
        } catch (error) {
            if (isApiError(error)) {
                setError('root', { message: error.message || 'Unable to create account.' })
                return
            }

            setError('root', { message: 'Unexpected error occurred while creating your account.' })
        }
    }

    return (
        <Card className="border-primary/20 bg-surface/95 shadow-xl shadow-primary/5">
            <CardHeader>
                <CardTitle>Create account</CardTitle>
                <CardDescription>Sign up for KIP Inventory and verify your email to continue.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName" required>First name</Label>
                            <Input id="firstName" error={Boolean(errors.firstName)} {...register('firstName')} />
                            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="lastName" required>Last name</Label>
                            <Input id="lastName" error={Boolean(errors.lastName)} {...register('lastName')} />
                            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" required>Email</Label>
                        <Input id="email" type="email" placeholder="admin@example.com" error={Boolean(errors.email)} {...register('email')} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone number</Label>
                        <Input
                            id="phoneNumber"
                            type="tel"
                            placeholder="+2348012345678"
                            error={Boolean(errors.phoneNumber)}
                            {...register('phoneNumber')}
                        />
                        {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" required>Password</Label>
                        <PasswordInput id="password" error={Boolean(errors.password)} {...register('password')} />
                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" required>Confirm password</Label>
                        <PasswordInput id="confirmPassword" error={Boolean(errors.confirmPassword)} {...register('confirmPassword')} />
                        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                    </div>

                    {errors.root?.message && <p className="text-sm text-destructive">{errors.root.message}</p>}

                    <Button type="submit" className="w-full" loading={isSubmitting}>
                        Create account
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link to="/auth/login" className="text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
