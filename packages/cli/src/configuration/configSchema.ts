import { z } from "zod";

export const configSchema = z.object({
  scriptId: z.string().default("[UNKNOWN]"),
  calendar: z.string().default("primary"),
  time_zone: z.string().default("America/New_York"),
  workdays: z.array(z.number()).default([1, 2, 3, 4, 5]),
  workhours: z
    .object({
      start: z.number().default(9),
      end: z.number().default(13),
    })
    .default({ start: 9, end: 13 }),
  days_in_advance: z.number().default(28),
  timeslot_duration: z.number().default(30),
});

export type Configuration = z.infer<typeof configSchema>;
