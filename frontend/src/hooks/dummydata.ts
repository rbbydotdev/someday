export function generateDummyData(): string[] {
  const now = new Date();
  const dummyData = Array.from({ length: 24 }, (_, i) => {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        13 + i
      )
    );
    return date.toISOString();
  });
  return dummyData;
}
