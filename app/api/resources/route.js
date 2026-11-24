import Resource from '@/models/Resource';
import C from '@/lib/constants';
import { route, json, readJson, badRequest, conflict } from '@/lib/http';
import { authenticate, requireAdmin } from '@/lib/auth';
import { parseEnum, parsePaging, paginated, qp, escapeRegex, reqString, optString, isObject, parseCapacity } from '@/lib/validators';
export const dynamic = 'force-dynamic';

const CI = { locale: 'en', strength: 2 };

// GET /api/resources - USER sees active only, ADMIN sees all, name asc (case-insensitive)
export const GET = route(async (req) => {
  const user = await authenticate(req);
  const sp = new URL(req.url).searchParams;
  const { page, limit, skip } = parsePaging(sp, { defaultLimit: 10 });
  const filter = {};
  if (user.role !== 'ADMIN') filter.isActive = true;
  const search = qp(sp, 'search');
  const type = qp(sp, 'type');
  const minCap = qp(sp, 'minCapacity');
  if (search) {
    if (search.length > 100) throw badRequest('search must be at most 100 characters');
    filter.name = new RegExp(escapeRegex(search.trim()), 'i');
  }
  if (type) filter.type = parseEnum(type, C.RESOURCE_TYPES, 'type');
  if (minCap !== null) {
    if (!/^\d+$/.test(minCap) || Number(minCap) < 1 || Number(minCap) > 500) throw badRequest('minCapacity must be an integer between 1 and 500');
    filter.capacity = { $gte: Number(minCap) };
  }
  const [rows, total] = await Promise.all([
    Resource.find(filter).collation(CI).sort({ name: 1 }).skip(skip).limit(limit),
    Resource.countDocuments(filter),
  ]);
  return json(paginated(rows.map((r) => r.toJSON()), page, limit, total));
});

// POST /api/resources - ADMIN
export const POST = route(async (req) => {
  const user = await authenticate(req);
  requireAdmin(user);
  const b = await readJson(req);
  if (!isObject(b)) throw badRequest('Body must be a JSON object');
  const name = reqString(b, 'name', 3, 60);
  const type = parseEnum(b.type, C.RESOURCE_TYPES, 'type');
  const capacity = parseCapacity(b.capacity);
  const description = optString(b, 'description', 300);
  if (await Resource.exists({ name }).collation(CI)) throw conflict('A resource with this name already exists');
  const resource = await Resource.create({ name, type, capacity, description });
  return json(resource, 201);
});
