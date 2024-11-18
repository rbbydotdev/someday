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
  const makeBooking = useCallback(async function ({
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setStatus("success");
  },
  []);
  return [status, error, makeBooking, reset] as const;
}
