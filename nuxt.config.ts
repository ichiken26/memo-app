// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  typescript: {
    tsConfig: {
      compilerOptions: {
        allowImportingTsExtensions: true
      }
    }
  },
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      title: 'MEMO APP'
    }
  },
  devtools: { enabled: process.env.NUXT_DEVTOOLS === 'true' },
  nitro: {
    preset: 'cloudflare-module',
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },
  runtimeConfig: {
    public: {
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      firebaseAppId: '',
      firebaseStorageBucket: '',
      firebaseMessagingSenderId: '',
      firebaseMeasurementId: ''
    }
  }
})
