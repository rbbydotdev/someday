export interface EventType {
    id: string;
    name: string;
    duration: number; // in minutes
    selectable: boolean;
    description?: string;
    WORKDAYS?: number[];
    WORKHOURS?: { start: number; end: number };
    DAYS_IN_ADVANCE?: number;
    CALENDARS?: string[];
    schedulingStrategy?: 'collective' | 'round_robin';
}

export interface Config {
    TIME_ZONE: string;
    WORKDAYS: number[];
    WORKHOURS: { start: number; end: number };
    DAYS_IN_ADVANCE: number;
    EVENT_TYPES: EventType[];
    CALENDARS: string[];
    schedulingStrategy?: 'collective' | 'round_robin';
}
