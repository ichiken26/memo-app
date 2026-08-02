export const useApiFetch = () => {
  const { $firebaseAuth } = useNuxtApp();

  return async <T>(request: string, options: Record<string, unknown> = {}) => {
    const currentUser = $firebaseAuth?.currentUser;
    if (!currentUser) {
      throw new Error("ログインが必要です");
    }

    const token = await currentUser.getIdToken();
    const headers = new Headers(options.headers as HeadersInit | undefined);
    headers.set("Authorization", `Bearer ${token}`);
    return await $fetch<T>(request, { ...options, headers } as never);
  };
};
