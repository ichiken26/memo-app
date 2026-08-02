<template>
  <div class="shortcut-help">
    <ThemeToggle />
    <AppTooltip label="ショートカット一覧">
      <strong>ショートカット</strong>
      <br />
      Ctrl+Alt+S: 検索
      <br />
      Ctrl+/: トップ
      <br />
      Ctrl+Alt+L: 検索欄
      <br />
      Ctrl+Alt+E / P: 編集 / 閲覧
      <br />
      Ctrl+B / I: 太字 / 斜体
      <br />
      Ctrl+Alt+R: 赤字
    </AppTooltip>
  </div>
</template>
<style scoped>
.shortcut-help {
  position: fixed;
  z-index: 40;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
