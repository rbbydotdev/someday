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
    try {
      setStatus("pending");
      //@ts-expect-error google.script.run is not typed
      google.script.run
        .withSuccessHandler(function () {
          setStatus("success");
        })
        .withFailureHandler(function (err: Error) {
          setStatus("error");
          setError(
            new Error("Could not book timeslot, please try again - " + err)
          );
        })
        .bookTimeslot(timeslot.toISOString(), name, email, phone, note);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        setStatus("success");
      } else {
        console.error(err);
        setStatus("error");
        setError(
          new Error("Could not book timeslot, please try again - " + err)
        );
      }
    }
  },
  []);
  return [status, error, makeBooking, reset] as const;
}
