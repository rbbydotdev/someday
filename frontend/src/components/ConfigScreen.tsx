import { useEffect, useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import {
    Loader2,
    Check,
    ChevronsUpDown,
    ChevronDown,
    ChevronUp,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Switch } from "./ui/switch";
import { GoogleLib } from "@/lib/googlelib";
import { CalendarMultiSelect } from "./CalendarMultiSelect";

import { Config, EventType } from "@/models/EventType";

interface CalendarInfo {
    id: string;
    name: string;
}

const DAYS_OF_WEEK = [
    { label: "Sunday", value: 0 },
    { label: "Monday", value: 1 },
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 || 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    return {
        label: `${hour}:00 ${ampm}`,
        value: i
    };
});

function TimeDropdown({ value, onChange, placeholder }: { value?: number; onChange: (val: number) => void; placeholder?: string }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">
                        {value !== undefined
                            ? HOURS.find(h => h.value === value)?.label
                            : (placeholder || "Select time...")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                {HOURS.map((hour) => (
                    <DropdownMenuItem
                        key={hour.value}
                        onClick={() => onChange(hour.value)}
                        className="justify-between"
                    >
                        {hour.label}
                        {value === hour.value && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function ConfigScreen({ onBack }: { onBack: () => void }) {
    const [config, setConfig] = useState<Config | null>(null);
    const [availableCalendars, setAvailableCalendars] = useState<CalendarInfo[]>([]);
    const [scriptUrl, setScriptUrl] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tzOpen, setTzOpen] = useState(false);
    const [expandedEventTypes, setExpandedEventTypes] = useState<string[]>([]);

    const timeZones = useMemo(() => {
        try {
            // @ts-expect-error: Intl.supportedValuesOf is a modern API that may not be in all typings but exists in targeted browsers
            return Intl.supportedValuesOf('timeZone');
        } catch (_e) {
            return ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
        }
    }, []);

    const duplicateIds = useMemo(() => {
        if (!config?.EVENT_TYPES) return [];
        const ids = config.EVENT_TYPES.map(et => et.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        return [...new Set(duplicates)];
    }, [config?.EVENT_TYPES]);

    useEffect(() => {
        const fetchData = async () => {
            // @ts-expect-error: google object is provided by Apps Script at runtime
            if (typeof google !== "undefined") {
                const fetchConfig = () => new Promise((resolve, reject) => {
                    GoogleLib.google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .getConfig();
                });

                const fetchCalendars = () => new Promise((resolve, reject) => {
                    GoogleLib.google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .listCalendars();
                });

                const fetchScriptUrl = () => new Promise((resolve, reject) => {
                    GoogleLib.google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .getScriptUrl();
                });

                try {
                    const [configData, calendarData, url] = await Promise.all([
                        fetchConfig(),
                        fetchCalendars(),
                        fetchScriptUrl()
                    ]);
                    setConfig(configData as Config);
                    setAvailableCalendars(calendarData as CalendarInfo[]);
                    setScriptUrl(url as string);
                } catch (err: any) {
                    alert("Failed to load data: " + err.message);
                } finally {
                    setLoading(false);
                }
            } else {
                // Mock data for local testing
                setTimeout(() => {
                    setConfig({
                        TIME_ZONE: "America/New_York",
                        WORKDAYS: [1, 2, 3, 4, 5],
                        WORKHOURS: { start: 9, end: 16 },
                        DAYS_IN_ADVANCE: 28,
                        EVENT_TYPES: [
                            { id: "30min", name: "30 Minute Meeting", duration: 30, selectable: true },
                            { id: "60min", name: "1 Hour Strategy", duration: 60, selectable: true },
                        ],
                        CALENDARS: ["primary"],
                    });
                    setAvailableCalendars([
                        { id: "primary", name: "Primary Calendar" },
                        { id: "work", name: "Work Calendar" },
                        { id: "personal", name: "Personal Calendar" },
                    ]);
                    setScriptUrl(window.location.origin + window.location.pathname);
                    setLoading(false);
                }, 500);
            }
        };

        fetchData();
    }, []);

    const handleSave = () => {
        if (!config) return;

        // Enforce maximum 90 days for scheduling window
        // Higher numbers can make the system slow due to increased calendar fetching overhead
        if (config.DAYS_IN_ADVANCE > 90) {
            alert("Scheduling window cannot exceed 90 days.");
            return;
        }

        // Limit timeslot duration to 24 hours (1440 minutes)
        for (const et of config.EVENT_TYPES) {
            if (et.duration > 1440) {
                alert(`Duration for ${et.name} cannot exceed 1440 minutes.`);
                return;
            }
            if (!et.id) {
                alert("All event types must have a slug/id.");
                return;
            }
        }

        setSaving(true);
        // @ts-expect-error: google object is provided by Apps Script at runtime
        if (typeof google !== "undefined") {
            GoogleLib.google.script.run
                .withSuccessHandler(() => {
                    setSaving(false);
                    alert("Config saved successfully!");
                })
                .withFailureHandler((err: any) => {
                    alert("Failed to save config: " + err.message);
                    setSaving(false);
                })
                .setConfig(config);
        } else {
            setTimeout(() => {
                console.log("Mock Saving Config:", config);
                setSaving(false);
                alert("Config saved successfully (Mock)!");
            }, 500);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!config) return <div>Failed to load configuration.</div>;

    const toggleWorkday = (dayValue: number) => {
        const newWorkdays = config.WORKDAYS.includes(dayValue)
            ? config.WORKDAYS.filter(d => d !== dayValue)
            : [...config.WORKDAYS, dayValue].sort();
        setConfig({ ...config, WORKDAYS: newWorkdays });
    };

    const toggleEventTypeExpansion = (index: number) => {
        setExpandedEventTypes(prev =>
            prev.includes(index.toString())
                ? prev.filter(i => i !== index.toString())
                : [...prev, index.toString()]
        );
    };



    const addEventType = () => {
        const newEt: EventType = {
            id: `type-${Date.now()}`,
            name: "New Event Type",
            duration: 30,
            selectable: true,
            // Initialize with defaults if desired, or keep undefined to follow global
        };
        setConfig({ ...config, EVENT_TYPES: [...config.EVENT_TYPES, newEt] });
    };

    const updateEventType = (index: number, updates: Partial<EventType>) => {
        const newEventTypes = [...config.EVENT_TYPES];
        newEventTypes[index] = { ...newEventTypes[index], ...updates };
        setConfig({ ...config, EVENT_TYPES: newEventTypes });
    };

    const removeEventType = (index: number) => {
        if (config.EVENT_TYPES.length <= 1) {
            alert("You must have at least one event type.");
            return;
        }
        const newEventTypes = config.EVENT_TYPES.filter((_, i) => i !== index);
        // Also clean up expansion state if necessary, though index shifts make this tricky
        // For simplicity, we'll just clear expansion for now or let it be slightly off
        setExpandedEventTypes([]);
        setConfig({ ...config, EVENT_TYPES: newEventTypes });
    };

    return (
        <Card className="sm:w-[600px] mx-auto space-y-4 relative">
            <CardHeader className="max-w-full">
                <CardTitle className="text-2xl">
                    Global Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 sm:pt-2 space-y-6">
                {/* Time Zone */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-sm font-medium">Time Zone</Label>
                        <p className="text-xs text-muted-foreground">
                            The primary time zone used for calculating your availability.
                        </p>
                    </div>
                    <Popover open={tzOpen} onOpenChange={setTzOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={tzOpen}
                                className="w-full justify-between font-normal"
                            >
                                {config.TIME_ZONE || "Select timezone..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                                <CommandInput placeholder="Search timezone..." />
                                <CommandList>
                                    <CommandEmpty>No timezone found.</CommandEmpty>
                                    <CommandGroup>
                                        {timeZones.map((tz: string) => (
                                            <CommandItem
                                                key={tz}
                                                value={tz}
                                                onSelect={(currentValue) => {
                                                    setConfig({ ...config, TIME_ZONE: currentValue });
                                                    setTzOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        config.TIME_ZONE === tz ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {tz}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Scheduling Window */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="daysInAdvance" className="text-sm font-medium">Scheduling Window</Label>
                        <p className="text-xs text-muted-foreground">
                            How many days into the future users can see and book appointments.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 relative">
                        {/* High number of days can make the system slow as it fetches availability for each day */}
                        <Input
                            id="daysInAdvance"
                            type="number"
                            min="1"
                            max="90"
                            className="w-full pr-12"
                            value={config.DAYS_IN_ADVANCE}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    setConfig({ ...config, DAYS_IN_ADVANCE: Math.max(1, val) });
                                } else {
                                    setConfig({ ...config, DAYS_IN_ADVANCE: 1 });
                                }
                            }}
                        />
                        <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none">days</span>
                    </div>
                </div>

                {/* Work Hours Range */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-sm font-medium">
                            Work Hours
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            The daily window of time during which you are available for bookings.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <TimeDropdown
                            value={config.WORKHOURS.start}
                            onChange={(val) => setConfig({
                                ...config,
                                WORKHOURS: { ...config.WORKHOURS, start: val }
                            })}
                        />
                        <span className="text-muted-foreground">to</span>
                        <TimeDropdown
                            value={config.WORKHOURS.end}
                            onChange={(val) => setConfig({
                                ...config,
                                WORKHOURS: { ...config.WORKHOURS, end: val }
                            })}
                        />
                    </div>
                </div>

                {/* Workdays and Calendars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Workdays */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">
                                Available Days
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Specific days of the week you take bookings.
                            </p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between font-normal">
                                    {config.WORKDAYS.length === 0
                                        ? "Select days..."
                                        : config.WORKDAYS.length === 7
                                            ? "All days"
                                            : `${config.WORKDAYS.length} days selected`}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                {DAYS_OF_WEEK.map((day) => (
                                    <DropdownMenuCheckboxItem
                                        key={day.value}
                                        checked={config.WORKDAYS.includes(day.value)}
                                        onCheckedChange={() => toggleWorkday(day.value)}
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        {day.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Calendars */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">
                                Monitored Calendars
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Calendars to check for conflicts.
                            </p>
                        </div>
                        <CalendarMultiSelect
                            selected={config.CALENDARS}
                            available={availableCalendars}
                            onChange={(vals) => setConfig({ ...config, CALENDARS: vals })}
                        />
                    </div>
                </div>

                {/* Event Types */}
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <Label className="text-lg font-semibold">Event Types</Label>
                            <p className="text-xs text-muted-foreground">
                                Define the different types of appointments users can book.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={addEventType}>
                            Add Type
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {config.EVENT_TYPES.map((et, index) => (
                            <Card key={index} className="p-4 bg-muted/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor={`name-${index}`} className="text-sm font-medium">Name</Label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                The name shown to users when booking.
                                            </p>
                                        </div>
                                        <Input
                                            id={`name-${index}`}
                                            value={et.name}
                                            onChange={(e) => updateEventType(index, { name: e.target.value })}
                                            placeholder="e.g. 30 Min Meeting"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <Label htmlFor={`slug-${index}`} className="text-sm font-medium">Slug / ID</Label>
                                                {duplicateIds.includes(et.id) && (
                                                    <span className="text-[10px] text-destructive font-bold animate-pulse">DUPLICATE</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Unique identifier used in booking URLs.
                                            </p>
                                        </div>
                                        <Input
                                            id={`slug-${index}`}
                                            value={et.id}
                                            onChange={(e) => updateEventType(index, { id: e.target.value.replace(/\s+/g, '-').toLowerCase() })}
                                            placeholder="e.g. 30min"
                                            className={duplicateIds.includes(et.id) ? "border-destructive ring-destructive shadow-[0_0_0_1px_rgba(239,68,68,0.5)]" : ""}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`duration-${index}`} className="text-sm font-medium">Duration</Label>
                                            <p className="text-xs text-muted-foreground">
                                                How long this appointment type will last.
                                            </p>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id={`duration-${index}`}
                                                type="number"
                                                min="1"
                                                max="1440"
                                                className="pr-20"
                                                value={et.duration}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 1;
                                                    updateEventType(index, { duration: Math.min(1440, Math.max(1, val)) });
                                                }}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">minutes</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start gap-4">
                                            <Switch
                                                id={`selectable-${index}`}
                                                checked={et.selectable}
                                                onCheckedChange={(checked) => updateEventType(index, { selectable: checked })}
                                                className="mt-1"
                                            />
                                            <div className="space-y-1">
                                                <Label htmlFor={`selectable-${index}`} className="text-sm font-normal cursor-pointer">
                                                    Show on public selection page
                                                </Label>
                                                <span className="block text-[10px] text-muted-foreground">If disabled, this type can only be booked via direct links</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-full flex gap-2 items-center pt-4 border-t border-muted/30">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => toggleEventTypeExpansion(index)}
                                        >
                                            {expandedEventTypes.includes(index.toString()) ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                                            {expandedEventTypes.includes(index.toString()) ? "Hide Overrides" : "Settings Overrides"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => {
                                                const url = `${scriptUrl}?event-type=${et.id}`;
                                                navigator.clipboard.writeText(url);
                                            }}
                                        >
                                            Copy URL
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                                            onClick={() => removeEventType(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {expandedEventTypes.includes(index.toString()) && (
                                    <div className="mt-6 pt-6 border-t space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Scheduling Window Override */}
                                            <div className="space-y-2">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium">Scheduling Window</Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        Override the global scheduling window for this event type.
                                                    </p>
                                                </div>
                                                <Input
                                                    type="number"
                                                    placeholder={`Global: ${config.DAYS_IN_ADVANCE}`}
                                                    value={et.DAYS_IN_ADVANCE || ""}
                                                    onChange={(e) => updateEventType(index, { DAYS_IN_ADVANCE: parseInt(e.target.value) || undefined })}
                                                />
                                            </div>

                                            {/* Monitored Calendars Override */}
                                            <div className="space-y-2">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-medium">Monitored Calendars</Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        Override which calendars to check for conflicts.
                                                    </p>
                                                </div>
                                                <CalendarMultiSelect
                                                    selected={et.CALENDARS ?? config.CALENDARS}
                                                    available={availableCalendars}
                                                    placeholder={et.CALENDARS === undefined ? "Using global settings" : "Select calendars..."}
                                                    onChange={(vals) => updateEventType(index, { CALENDARS: vals })}
                                                />
                                                {et.CALENDARS !== undefined && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="h-auto p-0 text-destructive mt-1"
                                                        onClick={() => updateEventType(index, { CALENDARS: undefined })}
                                                    >
                                                        Reset to Global
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Work Hours Override */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-sm font-medium">Work Hours</Label>
                                                    {et.WORKHOURS && (
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-destructive" onClick={() => updateEventType(index, { WORKHOURS: undefined })}>
                                                            Reset to Global
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Override the global work hours for this event type.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <TimeDropdown
                                                    value={et.WORKHOURS?.start}
                                                    placeholder="Using global settings"
                                                    onChange={(val) => {
                                                        const current = et.WORKHOURS ?? config.WORKHOURS;
                                                        updateEventType(index, { WORKHOURS: { ...current, start: val } });
                                                    }}
                                                />
                                                <span className="text-muted-foreground text-xs">to</span>
                                                <TimeDropdown
                                                    value={et.WORKHOURS?.end}
                                                    placeholder="Using global settings"
                                                    onChange={(val) => {
                                                        const current = et.WORKHOURS ?? config.WORKHOURS;
                                                        updateEventType(index, { WORKHOURS: { ...current, end: val } });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Available Days Override */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-sm font-medium">Available Days</Label>
                                                    {et.WORKDAYS && (
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-destructive" onClick={() => updateEventType(index, { WORKDAYS: undefined })}>
                                                            Reset to Global
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Override which days are available for booking.
                                                </p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-between font-normal">
                                                        <span className="truncate">
                                                            {et.WORKDAYS === undefined
                                                                ? "Using global settings"
                                                                : et.WORKDAYS.length === 0
                                                                    ? "No days available"
                                                                    : et.WORKDAYS.length === 7
                                                                        ? "All days"
                                                                        : `${et.WORKDAYS.length} days selected`}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                                    <DropdownMenuItem
                                                        className="text-destructive font-semibold"
                                                        onClick={() => updateEventType(index, { WORKDAYS: undefined })}
                                                    >
                                                        Reset to Global
                                                    </DropdownMenuItem>
                                                    {DAYS_OF_WEEK.map((day) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={day.value}
                                                            checked={(et.WORKDAYS ?? config.WORKDAYS).includes(day.value)}
                                                            onCheckedChange={() => {
                                                                const current = et.WORKDAYS ?? config.WORKDAYS;
                                                                const next = current.includes(day.value)
                                                                    ? current.filter(d => d !== day.value)
                                                                    : [...current, day.value].sort();
                                                                updateEventType(index, { WORKDAYS: next });
                                                            }}
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            {day.label}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-6 border-t pb-6">
                <Button variant="outline" onClick={onBack}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving || duplicateIds.length > 0}
                    className="px-8"
                >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {duplicateIds.length > 0 ? "Fix Duplicate Slugs" : "Save Changes"}
                </Button>
            </CardFooter>
        </Card >
    );
}
