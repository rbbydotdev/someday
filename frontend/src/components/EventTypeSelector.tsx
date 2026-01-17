import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { EventType } from "@/models/EventType";
import { Clock, Settings } from "lucide-react";

interface EventTypeSelectorProps {
    eventTypes: EventType[];
    onSelect: (et: EventType) => void;
    onOpenConfig?: () => void;
}

export function EventTypeSelector({ eventTypes, onSelect, onOpenConfig }: EventTypeSelectorProps) {
    return (
        <div className="sm:w-[600px] mx-auto space-y-4 relative">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Select Appointment Type</h1>
                {onOpenConfig && (
                    <Button variant="outline" size="icon" onClick={onOpenConfig}>
                        <Settings className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4">
                {eventTypes.map((et) => (
                    <Card key={et.id} className="hover:border-primary cursor-pointer transition-colors" onClick={() => onSelect(et)}>
                        <CardHeader>
                            <CardTitle>{et.name}</CardTitle>
                            {et.description && <CardDescription>{et.description}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="mr-2 h-4 w-4" />
                                {et.duration} minutes
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
