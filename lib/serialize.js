// For .lean() results (plain objects bypass the schema toJSON transform).
export function toApi(o) {
  if (!o) return o;
  const { _id, __v, passwordHash, ...rest } = o;
  return { id: String(_id), ...rest };
}
