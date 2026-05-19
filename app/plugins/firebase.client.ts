import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    appId: config.public.firebaseAppId,
    storageBucket: config.public.firebaseStorageBucket || undefined,
    messagingSenderId: config.public.firebaseMessagingSenderId || undefined,
    measurementId: config.public.firebaseMeasurementId || undefined
  }

  const isConfigured = Boolean(
    firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
  )
  const firebaseApp: FirebaseApp | null = isConfigured
    ? getApps().length > 0
      ? getApps()[0]
      : initializeApp(firebaseConfig)
    : null
  const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null

  return {
    provide: {
      firebaseApp,
      firebaseAuth,
      firebaseAuthConfigured: isConfigured
    }
  }
})
