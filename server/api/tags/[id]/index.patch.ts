import { getDb, updateTag } from "../../../utils/d1";
import { requireFirebaseUser } from "../../../utils/firebaseAuth";

type UpdateTagBody = {
  name?: string;
  color?: string;
};

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const body = await readBody<UpdateTagBody>(event);
  const { uid: ownerUid } = await requireFirebaseUser(event);

  const tag = await updateTag(getDb(event), id, ownerUid, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.color !== undefined ? { color: body.color } : {}),
  });

  if (!tag) {
    throw createError({ statusCode: 404, statusMessage: "Tag not found" });
  }

  return { tag };
});
