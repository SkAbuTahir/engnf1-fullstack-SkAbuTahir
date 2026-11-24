import Resource from '@/models/Resource';
import User from '@/models/User';
import { toApi } from './serialize';

// Adds `resource: {id,name,type}` (and `user` for admins) to lean booking rows so the UI needs no extra calls.
export async function decorate(rows, { withUser = false } = {}) {
  const rIds = [...new Set(rows.map((b) => String(b.resourceId)))];
  const resources = await Resource.find({ _id: { $in: rIds } }).select('name type').lean();
  const rMap = new Map(resources.map((r) => [String(r._id), { id: String(r._id), name: r.name, type: r.type }]));
  let uMap = new Map();
  if (withUser) {
    const uIds = [...new Set(rows.map((b) => String(b.userId)))];
    const users = await User.find({ _id: { $in: uIds } }).select('name email').lean();
    uMap = new Map(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, email: u.email }]));
  }
  return rows.map((b) => ({
    ...toApi(b),
    resource: rMap.get(String(b.resourceId)) || null,
    ...(withUser ? { user: uMap.get(String(b.userId)) || null } : {}),
  }));
}
