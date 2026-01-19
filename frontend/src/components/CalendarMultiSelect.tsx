import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface CalendarInfo {
    id: string
    name: string
}

interface CalendarMultiSelectProps {
    selected: string[]
    onChange: (selected: string[]) => void
    available: CalendarInfo[]
    placeholder?: string
}

export function CalendarMultiSelect({
    selected,
    onChange,
    available,
    placeholder = "Select calendars...",
}: CalendarMultiSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")

    // specific calendars are those provided in available list
    // extra calendars are those in 'selected' but NOT in available (e.g. manually added previously)
    const availableIds = new Set(available.map((c) => c.id))
    const extraSelected = selected.filter((id) => !availableIds.has(id)).map(id => ({ id, name: id }))

    const allOptions = [...available, ...extraSelected]

    // Filter options based on search to show checkmarks correctly while searching
    // Command performs filtering automatically BUT we want to handle the "Add custom" logic
    // which requires knowing if there are matches.
    // Actually CommandEmpty only shows if CommandItem list is empty after filtering.

    const handleSelect = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter((s) => s !== id))
        } else {
            onChange([...selected, id])
        }
    }

    const handleAddCustom = () => {
        if (searchValue && !selected.includes(searchValue)) {
            onChange([...selected, searchValue])
            setSearchValue("")
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-10 py-2"
                >
                    <div className="flex flex-wrap gap-1 items-center text-left">
                        {selected.length === 0 && (
                            <span className="text-muted-foreground font-normal">{placeholder}</span>
                        )}
                        {selected.length > 0 && selected.length <= 3 && (
                            selected.map(id => {
                                const cal = allOptions.find(c => c.id === id)
                                return (
                                    <Badge variant="secondary" key={id} className="mr-1 mb-1">
                                        {cal?.name || id}
                                    </Badge>
                                )
                            })
                        )}
                        {selected.length > 3 && (
                            <span className="text-sm font-medium">{selected.length} calendars selected</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Search or add calendar email..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-2 flex flex-col items-center justify-center gap-2">
                                <span className="text-muted-foreground text-sm">No calendar found.</span>
                                {searchValue && searchValue.includes("@") && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full"
                                        onClick={handleAddCustom}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add "{searchValue}"
                                    </Button>
                                )}
                            </div>
                        </CommandEmpty>
                        <CommandGroup heading="Calendars">
                            {allOptions.map((calendar) => (
                                <CommandItem
                                    key={calendar.id}
                                    value={calendar.id + " " + calendar.name} // Include name in value for fuzzy search
                                    onSelect={() => handleSelect(calendar.id)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(calendar.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{calendar.name}</span>
                                        <span className="text-xs text-muted-foreground">{calendar.id}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
