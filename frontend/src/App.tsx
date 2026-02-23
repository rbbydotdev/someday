import { isDemoMode } from "@/clientEnv";
import { CalendarPicker } from "@/components/calendar-picker";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoBanner } from "@/DemoBanner";
import "./App.css";
import "./index.css";

function App() {
  return (
    <ThemeProvider>
      <DemoBanner show={isDemoMode} />
      <CalendarPicker />
      <div className="font-mono pt-4 text-accent-foreground text-sm">
        made by <a href="https://github.com/rbbydotdev/someday">@rbbydotdev</a>{" "}
        👋
      </div>
    </ThemeProvider>
  );
}

export default App;
