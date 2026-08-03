export const isApplePlatform = () => {
  if (!import.meta.client) {
    return false;
  }

  return /Mac|iPhone|iPad|iPod/.test(
    `${navigator.platform} ${navigator.userAgent}`,
  );
};

/** Windows Ctrl / Mac Command */
export const hasPrimaryModifier = (event: KeyboardEvent) =>
  event.ctrlKey || event.metaKey;

/** Windows Alt / Mac Option */
export const hasAltModifier = (event: KeyboardEvent) => event.altKey;

export const hasPrimaryOnly = (event: KeyboardEvent) =>
  hasPrimaryModifier(event) && !event.altKey;

export const hasPrimaryAndAlt = (event: KeyboardEvent) =>
  hasPrimaryModifier(event) && event.altKey;

export const primaryModifierLabel = () => (isApplePlatform() ? "⌘" : "Ctrl");

export const altModifierLabel = () => (isApplePlatform() ? "⌥" : "Alt");

export const formatShortcut = (...keys: string[]) => {
  const primary = primaryModifierLabel();
  const alt = altModifierLabel();

  return keys
    .map((key) => {
      if (key === "Ctrl" || key === "Mod") return primary;
      if (key === "Alt" || key === "Option") return alt;
      return key;
    })
    .join("+");
};
