export default defineEventHandler((event) => {
  if (event.path.startsWith("/api/")) {
    setResponseHeader(event, "Cache-Control", "private, no-store");
  }
});
