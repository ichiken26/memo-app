export const useTheme = () => {
  const theme = useState<"light" | "dark">("color-theme", () => "light");
  const apply = () => {
    if (import.meta.client)
      document.documentElement.dataset.theme = theme.value;
  };
  onMounted(() => {
    const saved = localStorage.getItem("memo-theme");
    theme.value =
      saved === "dark" || saved === "light"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    apply();
  });
  const toggleTheme = () => {
    theme.value = theme.value === "dark" ? "light" : "dark";
    localStorage.setItem("memo-theme", theme.value);
    apply();
  };
  return { theme, toggleTheme };
};
