import { useCallback, useState } from "react";

export function useBookGoogleTimeslot() {
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const reset = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);
  const makeBooking = useCallback(function ({
    timeslot,
    name,
    email,
    phone,
    note,
  }: {
    timeslot: Date;
    name: string;
    email: string;
    phone: string;
    note?: string;
  }) {
    setStatus("pending");
    setTimeout(() => setStatus("success"), 2000);
  },
  []);
  return [status, error, makeBooking, reset] as const;
}
