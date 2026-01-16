import { useEffect, useState } from "react";
import { isDemoMode, isDev } from "@/clientEnv";
import { CalendarPicker } from "@/components/calendar-picker";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoBanner } from "@/DemoBanner";
import { ConfigScreen } from "@/components/ConfigScreen";
import "./App.css";
import "./index.css";

function App() {
  const [isOwner, setIsOwner] = useState(false);
  const [view, setView] = useState<"calendar" | "config">("calendar");

  useEffect(() => {
    // Check if the user is the owner
    if (typeof google !== "undefined") {
      // @ts-ignore
      google.script.run
        .withSuccessHandler((owner: boolean) => {
          setIsOwner(owner);

          // Check for URL parameter to open config directly
          const params = new URLSearchParams(window.location.search);
          if (params.get("page") === "config" && owner) {
            setView("config");
          }
        })
        .isOwner();
    } else if (isDev) {
      // Allow access in local development
      setIsOwner(true);
      const params = new URLSearchParams(window.location.search);
      if (params.get("page") === "config") {
        setView("config");
      }
    }
  }, []);

  return (
    <ThemeProvider>
      <DemoBanner show={isDemoMode} />
      <div className="relative">
        {view === "calendar" ? (
          <CalendarPicker onOpenConfig={isOwner ? () => setView("config") : undefined} />
        ) : (
          <ConfigScreen onBack={() => setView("calendar")} />
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
