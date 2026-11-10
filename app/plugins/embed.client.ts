// タスマネに埋め込まれたときの連携（firebase プラグインの後に初期化）
export default defineNuxtPlugin({
  name: "embed-bridge",
  dependsOn: ["firebase"],
  setup() {
    initEmbedBridge();
  },
});
