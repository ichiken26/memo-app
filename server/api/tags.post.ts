import { createTag, getDb } from "../utils/d1";
import { requireFirebaseUser } from "../utils/firebaseAuth";

type CreateTagBody = {
  name: string;
};

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateTagBody>(event);
  const name = body.name?.trim();

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: "Tag name is required",
    });
  }

  const { uid: ownerUid } = await requireFirebaseUser(event);

  const { tag, created } = await createTag(getDb(event), ownerUid, name);

  if (created) {
    setResponseStatus(event, 201);
  }
  return { tag };
});
