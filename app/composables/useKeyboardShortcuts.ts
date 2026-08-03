import {
  hasPrimaryAndAlt,
  hasPrimaryOnly,
} from "~~/shared/shortcutKeys";

export const useKeyboardShortcuts = () => {
  const router = useRouter();
  const handler = (event: KeyboardEvent) => {
    if (hasPrimaryAndAlt(event) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      router.push("/search");
      return;
    }

    if (hasPrimaryOnly(event) && event.key === "/") {
      event.preventDefault();
      router.push("/");
      return;
    }

    if (
      hasPrimaryAndAlt(event) &&
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
