import { createRemoteJWKSet, jwtVerify } from "jose";

type AuthenticatedEvent = {
  context: {
    firebaseUser?: { uid: string };
    cloudflare?: { env?: { NUXT_PUBLIC_FIREBASE_PROJECT_ID?: string } };
  };
};

const googleKeys = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

const getProjectId = (event: AuthenticatedEvent) =>
  event.context.cloudflare?.env?.NUXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID;

export const requireFirebaseUser = async (rawEvent: unknown) => {
  const event = rawEvent as AuthenticatedEvent;
  if (event.context.firebaseUser?.uid) {
    return event.context.firebaseUser;
  }

  const authorization = getHeader(event as never, "authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Firebase ID token is required",
    });
  }

  const projectId = getProjectId(event);
  if (!projectId) {
    throw createError({
      statusCode: 503,
      statusMessage: "Firebase project is not configured",
    });
  }

  try {
    const { payload } = await jwtVerify(token, googleKeys, {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
    if (!payload.sub || payload.sub.length > 128) {
      throw new Error("Invalid Firebase subject");
    }
    const user = { uid: payload.sub };
    event.context.firebaseUser = user;
    return user;
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: "Firebase ID token is invalid or expired",
    });
  }
};
