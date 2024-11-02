const start = new Date();
start.setUTCHours(13, 0, 0, 0); // Set hours to 13:00:00 UTC, keeping the current date

export const dummyData = Array.from({ length: 16 }, (_, i) => {
  const date = new Date(start);
  date.setUTCHours(start.getUTCHours() + i);
  return date.toISOString();
});
