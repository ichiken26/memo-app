// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  typescript: {
    tsConfig: {
      compilerOptions: {
        allowImportingTsExtensions: true,
      },
    },
  },
  compatibilityDate: "2025-07-15",
  app: {
    head: {
      title: "MEMO APP",
      script: [
        {
          // iframe 内なら描画前に埋め込み用レイアウトにする（親オリジンの検証と連携は embed プラグインで行う）
          id: "memo-embed-init",
          innerHTML: `(function(){try{if(window.self!==window.top)document.documentElement.dataset.embedded='true'}catch(e){document.documentElement.dataset.embedded='true'}})()`,
        },
        {
          id: "memo-theme-init",
          innerHTML: `(function(){try{var t=localStorage.getItem('memo-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';localStorage.setItem('memo-theme',t)}document.documentElement.dataset.theme=t}catch(e){}})()`,
        },
      ],
    },
  },
  devtools: { enabled: process.env.NUXT_DEVTOOLS === "true" },
  nitro: {
    preset: "cloudflare-module",
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },
  runtimeConfig: {
    public: {
      firebaseApiKey: "",
      firebaseAuthDomain: "",
      firebaseProjectId: "",
      firebaseAppId: "",
      firebaseStorageBucket: "",
      firebaseMessagingSenderId: "",
      firebaseMeasurementId: "",
      // タスマネ等、埋め込みを許可する親オリジン（カンマ区切り）
      embedParentOrigins:
        "https://tasmane.kokage-studio.com,http://localhost:3000,http://localhost:3100",
    },
  },
});
