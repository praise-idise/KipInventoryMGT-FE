import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/cn'

export type SelectOption = {
    label: string
    value: string
}

export type SearchableSelectProps = {
    options: SelectOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    onAddNew?: () => void
    addNewLabel?: string
    disabled?: boolean
    className?: string
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    onAddNew,
    addNewLabel = 'Add New',
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const selectedOption = options.find((opt) => opt.value === value)

    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options
        const term = searchTerm.toLowerCase()
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(term) ||
                opt.value.toLowerCase().includes(term),
        )
    }, [options, searchTerm])

    useEffect(() => {
        if (!isOpen) return

        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                setSearchTerm('')
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setIsOpen(false)
                setSearchTerm('')
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    function handleSelect(optValue: string) {
        onChange(optValue)
        setIsOpen(false)
        setSearchTerm('')
    }

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen)
                        if (!isOpen) {
                            setTimeout(() => inputRef.current?.focus(), 50)
                        }
                    }
                }}
                disabled={disabled}
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm',
                    disabled && 'cursor-not-allowed opacity-50',
                    !selectedOption && 'text-muted-foreground',
                )}
            >
                <span className="truncate">{selectedOption?.label ?? placeholder}</span>
                <ChevronDown className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-border bg-surface shadow-md">
                    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto p-1">
                        {filteredOptions.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted-foreground">No results found.</p>
                        )}
                        {filteredOptions.map((option) => {
                            const isSelected = option.value === value
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        'flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors',
                                        isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
                                    )}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && <Check className="size-4 shrink-0" />}
                                </button>
                            )
                        })}
                    </div>

                    {onAddNew && (
                        <div className="border-t border-border p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false)
                                    setSearchTerm('')
                                    onAddNew()
                                }}
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
                            >
                                <Plus className="size-4" />
                                {addNewLabel}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
