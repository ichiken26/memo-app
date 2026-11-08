type TimingName = "auth" | "db" | "map" | "total";

const now = () => performance.now();

export const beginApiTiming = (event: unknown) => {
  const started = now();
  const durations = new Map<TimingName, number>();
  const measure = async <T>(name: TimingName, work: () => Promise<T>) => {
    const mark = now();
    try {
      return await work();
    } finally {
      durations.set(name, now() - mark);
    }
  };
  const finish = () => {
    durations.set("total", now() - started);
    const value = [...durations]
      .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
      .join(", ");
    const setHeader = (globalThis as { setResponseHeader?: Function })
      .setResponseHeader;
    if (setHeader) {
      setHeader(event, "Cache-Control", "private, no-store");
      setHeader(event, "Server-Timing", value);
    }
  };
  return { measure, finish };
};
