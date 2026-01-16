import { useEffect, useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
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

interface Config {
    TIME_ZONE: string;
    WORKDAYS: number[];
    WORKHOURS: { start: number; end: number };
    DAYS_IN_ADVANCE: number;
    TIMESLOT_DURATION: number;
    CALENDARS: string[];
}

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

function TimeDropdown({ value, onChange }: { value: number; onChange: (val: number) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                    {HOURS.find(h => h.value === value)?.label}
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tzOpen, setTzOpen] = useState(false);

    const timeZones = useMemo(() => {
        try {
            // @ts-ignore
            return Intl.supportedValuesOf('timeZone');
        } catch (e) {
            return ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (typeof google !== "undefined") {
                // @ts-ignore
                const fetchConfig = () => new Promise((resolve, reject) => {
                    google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .getConfig();
                });

                // @ts-ignore
                const fetchCalendars = () => new Promise((resolve, reject) => {
                    google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .listCalendars();
                });

                try {
                    const [configData, calendarData] = await Promise.all([
                        fetchConfig(),
                        fetchCalendars()
                    ]);
                    setConfig(configData as Config);
                    setAvailableCalendars(calendarData as CalendarInfo[]);
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
                        TIMESLOT_DURATION: 30,
                        CALENDARS: ["primary"],
                    });
                    setAvailableCalendars([
                        { id: "primary", name: "Primary Calendar" },
                        { id: "work", name: "Work Calendar" },
                        { id: "personal", name: "Personal Calendar" },
                    ]);
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
        if (config.TIMESLOT_DURATION > 1440) {
            alert("Timeslot duration cannot exceed 1440 minutes.");
            return;
        }

        setSaving(true);
        if (typeof google !== "undefined") {
            // @ts-ignore
            google.script.run
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

    const toggleCalendar = (calId: string) => {
        const newCalendars = config.CALENDARS.includes(calId)
            ? config.CALENDARS.filter(id => id !== calId)
            : [...config.CALENDARS, calId];
        setConfig({ ...config, CALENDARS: newCalendars });
    };

    return (
        <Card className="sm:w-[600px] mx-auto space-y-4 relative">
            <CardHeader className="max-w-full text-center">
                <CardTitle className="text-2xl">
                    Settings
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
                                        {timeZones.map((tz) => (
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between font-normal overflow-hidden">
                                    <span className="truncate">
                                        {config.CALENDARS.length === 0
                                            ? "Select calendars..."
                                            : config.CALENDARS.length === 1
                                                ? availableCalendars.find(c => c.id === config.CALENDARS[0])?.name || config.CALENDARS[0]
                                                : `${config.CALENDARS.length} calendars`}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
                                {availableCalendars.map((cal) => (
                                    <DropdownMenuCheckboxItem
                                        key={cal.id}
                                        checked={config.CALENDARS.includes(cal.id)}
                                        onCheckedChange={() => toggleCalendar(cal.id)}
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        {cal.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {/* Show calendars currently in config but not available in account */}
                                {config.CALENDARS.filter(id => !availableCalendars.some(ac => ac.id === id)).map(id => (
                                    <DropdownMenuCheckboxItem
                                        key={id}
                                        checked={true}
                                        onCheckedChange={() => toggleCalendar(id)}
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-muted-foreground italic"
                                    >
                                        {id} (unavailable)
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Slot Duration */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="timeslotDuration" className="text-sm font-medium">Timeslot Duration</Label>
                        <p className="text-xs text-muted-foreground">
                            The length of each individual appointment slot.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 relative">
                        <Input
                            id="timeslotDuration"
                            type="number"
                            step="5"
                            min="5"
                            max="1440"
                            className="w-full pr-20"
                            value={config.TIMESLOT_DURATION}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    setConfig({ ...config, TIMESLOT_DURATION: val });
                                }
                            }}
                        />
                        <span className="absolute right-3 text-sm text-muted-foreground pointer-events-none">minutes</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-6 border-t pb-6">
                <Button variant="outline" onClick={onBack}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="px-8">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </CardFooter>
        </Card>
    );
}
