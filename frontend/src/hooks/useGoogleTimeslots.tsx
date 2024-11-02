import { useCallback, useEffect, useState } from "react";

import { dummyData } from "@/hooks/dummydata";
// const slotsByDayKey = (date: Date) => format(date, "yyyy-MM-dd");
export function useGoogleTimeslots() {
  const [availableGoogleSlots, setAvailableGoogleSlots] = useState<Date[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    setStatus("pending");
    setTimeout(() => {
      setStatus("success");
      setAvailableGoogleSlots(dummyData.map((d) => new Date(d)));
    }, 2000);
  }, []);

  return [availableGoogleSlots, durationMinutes, status, error, reset] as const;
}
