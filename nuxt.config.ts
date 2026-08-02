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
    },
  },
});
