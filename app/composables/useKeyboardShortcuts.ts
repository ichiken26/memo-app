export const useKeyboardShortcuts = () => {
  const router = useRouter();
  const handler = (event: KeyboardEvent) => {
    if (!event.ctrlKey) return;
    if (event.altKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      router.push("/search");
    } else if (!event.altKey && event.key === "/") {
      event.preventDefault();
      router.push("/");
    } else if (
      event.altKey &&
      event.key.toLowerCase() === "l" &&
      router.currentRoute.value.path === "/search"
    ) {
      event.preventDefault();
      document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
    }
  };
  onMounted(() => window.addEventListener("keydown", handler));
  onBeforeUnmount(() => window.removeEventListener("keydown", handler));
};
