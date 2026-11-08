import { hasPrimaryAndAlt, isLetterShortcutKey } from "~~/shared/shortcutKeys";

export const useMemoViewMode = () => {
  const route = useRoute();
  const router = useRouter();
  const viewMode = computed<"edit" | "preview">(() =>
    route.query.mode === "preview" ? "preview" : "edit",
  );

  const setMode = async (mode: "edit" | "preview") => {
    await router.replace({ query: { ...route.query, mode } });
  };

  const modeShortcut = (event: KeyboardEvent) => {
    if (!hasPrimaryAndAlt(event)) return;
    if (isLetterShortcutKey(event, "E")) {
      event.preventDefault();
      void setMode("edit");
    }
    if (isLetterShortcutKey(event, "P")) {
      event.preventDefault();
      void setMode("preview");
    }
  };

  onMounted(() => {
    if (!route.query.mode) {
      void setMode("edit");
    }
    window.addEventListener("keydown", modeShortcut);
  });
  onBeforeUnmount(() => window.removeEventListener("keydown", modeShortcut));

  return { viewMode, setMode };
};
