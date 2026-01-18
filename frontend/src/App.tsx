import { useEffect, useState } from "react";
import { isDemoMode, isDev } from "@/clientEnv";
import { CalendarPicker } from "@/components/calendar-picker";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoBanner } from "@/DemoBanner";
import { ConfigScreen } from "@/components/ConfigScreen";
import { Config, EventType } from "@/models/EventType";
import { EventTypeSelector } from "@/components/EventTypeSelector";
import { Loader2 } from "lucide-react";
import "./App.css";
import "./index.css";

import { GoogleLib } from "@/lib/googlelib";

function App() {
  const [isOwner, setIsOwner] = useState(false);
  const [view, setView] = useState<"calendar" | "config" | "event-selector">("calendar");
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);

  const determineInitialView = (data: Config) => {
    const selectable = data.EVENT_TYPES.filter(et => et.selectable);
    if (selectable.length === 1) {
      setSelectedEventType(selectable[0]);
      setView("calendar");
    } else if (selectable.length > 1) {
      setView("event-selector");
    } else {
      // No selectable events? Show first one anyway or config?
      setSelectedEventType(data.EVENT_TYPES[0]);
      setView("calendar");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        let owner = false;
        let configData: Config | null = null;

        if (typeof google !== "undefined") {
          owner = await new Promise<boolean>((resolve) => {
            GoogleLib.google.script.run.withSuccessHandler(resolve).isOwner();
          });
          configData = await new Promise<Config>((resolve, reject) => {
            GoogleLib.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getConfig();
          });
        } else if (isDev) {
          owner = true;
          configData = {
            TIME_ZONE: "America/New_York",
            WORKDAYS: [1, 2, 3, 4, 5],
            WORKHOURS: { start: 9, end: 16 },
            DAYS_IN_ADVANCE: 28,
            EVENT_TYPES: [
              { id: "30min", name: "30 Minute Meeting", duration: 30, selectable: true },
              { id: "60min", name: "1 Hour Strategy", duration: 60, selectable: true },
              { id: "secret", name: "Secret Meeting", duration: 15, selectable: false },
            ],
            CALENDARS: ["primary"],
          };
        }

        setIsOwner(owner);
        setConfig(configData);

        let page: string | null = null;
        let eventTypeId: string | null = null;

        // @ts-expect-error: google object is provided by Apps Script at runtime
        if (typeof google !== "undefined" && google.script && google.script.url) {
          const location = await new Promise<any>((resolve) => {
            // @ts-expect-error: google object is provided by Apps Script at runtime
            google.script.url.getLocation(resolve);
          });
          page = location.parameter["page"];
          eventTypeId = location.parameter["event-type"];
        } else {
          const params = new URLSearchParams(window.location.search);
          page = params.get("page");
          eventTypeId = params.get("event-type");
        }

        if (page === "config" && owner) {
          setView("config");
        } else if (eventTypeId && configData) {
          const matched = configData.EVENT_TYPES.find(et => et.id === eventTypeId);
          if (matched) {
            setSelectedEventType(matched);
            setView("calendar");
          } else {
            // Fallback if not found
            determineInitialView(configData);
          }
        } else if (configData) {
          determineInitialView(configData);
        }
      } catch (err) {
        console.error("Failed to initialize app:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelectEventType = (et: EventType) => {
    setSelectedEventType(et);
    setView("calendar");
  };

  const handleBackToSelector = () => {
    const selectable = config?.EVENT_TYPES.filter(et => et.selectable) || [];
    if (selectable.length > 1) {
      setView("event-selector");
      setSelectedEventType(null);
    }
  };

  return (
    <ThemeProvider>
      <DemoBanner show={isDemoMode} />
      <div className="relative">
        {view === "config" ? (
          <ConfigScreen onBack={() => {
            if (selectedEventType) setView("calendar");
            else if (config) determineInitialView(config);
          }} />
        ) : view === "event-selector" ? (
          <EventTypeSelector
            eventTypes={config?.EVENT_TYPES.filter(et => et.selectable) || []}
            onSelect={handleSelectEventType}
            onOpenConfig={isOwner ? () => setView("config") : undefined}
          />
        ) : (
          <CalendarPicker
            onOpenConfig={isOwner ? () => setView("config") : undefined}
            eventType={selectedEventType!}
            onBack={config && config.EVENT_TYPES.filter(et => et.selectable).length > 1 ? handleBackToSelector : undefined}
          />
        )}
      </div>
      <div className="font-mono pt-4 text-accent-foreground text-sm">
        made by <a href="https://github.com/rbbydotdev/someday">@rbbydotdev</a>{" "}
        👋
      </div>
    </ThemeProvider>
  );
}

export default App;
