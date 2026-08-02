import {
  insertMediaNotation,
  mediaNotation,
  toggleMarkdown,
} from "~~/shared/markdown";

export const useMemoFormatting = (
  body: Ref<string>,
  textarea: Ref<HTMLTextAreaElement | null>,
) => {
  const replaceSelection = (
    before: string,
    after = before,
    placeholder = "テキスト",
  ) => {
    const el = textarea.value;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd,
      selection = body.value.slice(start, end) || placeholder;
    body.value =
      body.value.slice(0, start) +
      before +
      selection +
      after +
      body.value.slice(end);
    nextTick(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selection.length,
      );
    });
  };
  const format = (kind: "bold" | "italic" | "red") => {
    const el = textarea.value;
    if (!el) return;
    if (kind === "red") return replaceSelection("==", "=={red}");
    const result = toggleMarkdown(
      body.value,
      el.selectionStart,
      el.selectionEnd,
      kind === "bold" ? "**" : "*",
    );
    body.value = result.value;
    nextTick(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };
  const insertMedia = (type: "img" | "link", label: string, url: string) => {
    const el = textarea.value;
    if (!el) return;
    const start = el.selectionStart,
      notation = mediaNotation(type, label, url);
    body.value = insertMediaNotation(
      body.value,
      start,
      el.selectionEnd,
      notation,
    );
    nextTick(() => {
      const pos =
        body.value.indexOf(notation, Math.max(0, start - 2)) + notation.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };
  return { format, insertMedia, replaceSelection };
};
