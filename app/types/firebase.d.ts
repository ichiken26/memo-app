import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'

declare module '#app' {
  interface NuxtApp {
    $firebaseApp: FirebaseApp | null
    $firebaseAuth: Auth | null
    $firebaseAuthConfigured: boolean
  }
}

export {}
