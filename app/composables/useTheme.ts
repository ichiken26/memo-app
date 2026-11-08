export const useTheme = () => {
  const theme = useState<"light" | "dark">("color-theme", () => "light");
  const apply = () => {
    if (import.meta.client)
      document.documentElement.dataset.theme = theme.value;
  };
  const syncTheme = (event: StorageEvent) => {
    if (
      event.key === "memo-theme" &&
      (event.newValue === "light" || event.newValue === "dark")
    ) {
      theme.value = event.newValue;
      apply();
    }
  };
  onMounted(() => {
    const saved = localStorage.getItem("memo-theme");
    const bootTheme = document.documentElement.dataset.theme;
    theme.value =
      saved === "dark" || saved === "light"
        ? saved
        : bootTheme === "dark" || bootTheme === "light"
          ? bootTheme
          : matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    localStorage.setItem("memo-theme", theme.value);
    apply();
    window.addEventListener("storage", syncTheme);
  });
  onBeforeUnmount(() => window.removeEventListener("storage", syncTheme));
  const toggleTheme = () => {
    theme.value = theme.value === "dark" ? "light" : "dark";
    localStorage.setItem("memo-theme", theme.value);
    apply();
  };
  return { theme, toggleTheme };
};
