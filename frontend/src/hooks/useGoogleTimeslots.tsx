import { useCallback, useEffect, useState } from "react";

import { generateDummyData } from "@/hooks/dummydata";
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
    async function fetchData() {
      setStatus("pending");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setStatus("success");
      const dummyData = generateDummyData();
      setAvailableGoogleSlots(dummyData.map((d) => new Date(d)));
      console.log("Using dummy data", dummyData);
    }
    fetchData();
  }, []);

  return [availableGoogleSlots, durationMinutes, status, error, reset] as const;
}
