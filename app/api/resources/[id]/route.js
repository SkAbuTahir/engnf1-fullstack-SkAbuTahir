import Resource from '@/models/Resource';
import C from '@/lib/constants';
import { route, json, readJson, badRequest, notFound, conflict } from '@/lib/http';
import { authenticate, requireAdmin } from '@/lib/auth';
import { isId, isObject, parseEnum, reqString, optString, parseCapacity } from '@/lib/validators';
export const dynamic = 'force-dynamic';

const CI = { locale: 'en', strength: 2 };

export const GET = route(async (req, { params }) => {
  const user = await authenticate(req);
  if (!isId(params.id)) throw notFound('Resource not found');
  const r = await Resource.findById(params.id);
  if (!r || (!r.isActive && user.role !== 'ADMIN')) throw notFound('Resource not found');
  return json(r);
});

export const PATCH = route(async (req, { params }) => {
  const user = await authenticate(req);
  requireAdmin(user);
  if (!isId(params.id)) throw notFound('Resource not found');
  const r = await Resource.findById(params.id);
  if (!r) throw notFound('Resource not found');
  const b = await readJson(req);
  if (!isObject(b)) throw badRequest('Body must be a JSON object');
  const keys = ['name', 'type', 'capacity', 'description', 'isActive'].filter((k) => k in b);
  if (!keys.length) throw badRequest('Provide at least one of: name, type, capacity, description, isActive');

  const upd = {};
  if ('name' in b) upd.name = reqString(b, 'name', 3, 60);
  if ('type' in b) upd.type = parseEnum(b.type, C.RESOURCE_TYPES, 'type');
  if ('capacity' in b) upd.capacity = parseCapacity(b.capacity);
  if ('description' in b) upd.description = optString(b, 'description', 300);
  if ('isActive' in b) {
    if (typeof b.isActive !== 'boolean') throw badRequest('isActive must be a boolean');
    upd.isActive = b.isActive;
  }
  if (upd.name) {
    const clash = await Resource.findOne({ name: upd.name, _id: { $ne: r._id } }).collation(CI).select('_id');
    if (clash) throw conflict('A resource with this name already exists');
  }
  r.set(upd);
  await r.save();
  return json(r);
});
