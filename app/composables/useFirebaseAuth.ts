import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth'

let unsubscribeAuthState: null | (() => void) = null

type AuthUser = {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

const toAuthUser = (firebaseUser: User | null): AuthUser | null =>
  firebaseUser
    ? {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL
      }
    : null

export const useFirebaseAuth = () => {
  const config = useRuntimeConfig()
  const { $firebaseAuth, $firebaseAuthConfigured } = useNuxtApp()
  const hasRuntimeConfig = Boolean(
    config.public.firebaseApiKey &&
      config.public.firebaseAuthDomain &&
      config.public.firebaseProjectId &&
      config.public.firebaseAppId
  )

  const user = useState<AuthUser | null>('firebase-auth-user', () => null)
  const isReady = useState('firebase-auth-ready', () => !hasRuntimeConfig)
  const authError = useState<string | null>('firebase-auth-error', () => null)
  const isConfigured = computed(() => Boolean(hasRuntimeConfig && $firebaseAuthConfigured !== false && $firebaseAuth))

  if (import.meta.client && $firebaseAuth && !unsubscribeAuthState) {
    unsubscribeAuthState = onAuthStateChanged(
      $firebaseAuth,
      (currentUser) => {
        user.value = toAuthUser(currentUser)
        isReady.value = true
        authError.value = null
      },
      (error) => {
        user.value = null
        isReady.value = true
        authError.value = error.message
      }
    )
  }

  const signInWithGoogle = async () => {
    if (!$firebaseAuth) {
      authError.value = 'Firebase Auth設定が未設定です。.env の NUXT_PUBLIC_FIREBASE_* を確認してください。'
      return
    }

    authError.value = null
    const provider = new GoogleAuthProvider()

    try {
      const credential = await signInWithPopup($firebaseAuth, provider)
      user.value = toAuthUser(credential.user)
      isReady.value = true
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'Googleログインに失敗しました'
      throw error
    }
  }

  const signOut = async () => {
    if (!$firebaseAuth) {
      user.value = null
      return
    }

    authError.value = null

    try {
      await firebaseSignOut($firebaseAuth)
    } catch (error) {
      authError.value = error instanceof Error ? error.message : 'ログアウトに失敗しました'
      throw error
    }
  }

  return {
    user,
    isReady,
    isConfigured,
    isAuthenticated: computed(() => Boolean(user.value)),
    displayName: computed(() => user.value?.displayName ?? user.value?.email ?? ''),
    authError,
    signInWithGoogle,
    signOut
  }
}
