import { CalendarPicker } from "@/components/calendar-picker";
import "./App.css";
import "./index.css";

import { ThemeProvider } from "@/components/theme-provider";
function App() {
  return (
    <ThemeProvider>
      <CalendarPicker />
      <div className="font-mono pt-4 text-accent-foreground text-sm">
        made by <a href="https://github.com/rbbydotdev/someday">@rbbydotdev</a>{" "}
        👋
      </div>
    </ThemeProvider>
  );
}

export default App;
