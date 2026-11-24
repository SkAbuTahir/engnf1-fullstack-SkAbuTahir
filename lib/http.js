import { NextResponse } from 'next/server';
import { connectDB } from './mongodb';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const badRequest = (m) => new ApiError(400, 'VALIDATION_ERROR', m);
export const unauthenticated = (m = 'Authentication required') => new ApiError(401, 'UNAUTHENTICATED', m);
export const forbidden = (m = 'You do not have permission to do this') => new ApiError(403, 'FORBIDDEN', m);
export const notFound = (m = 'Not found') => new ApiError(404, 'NOT_FOUND', m);
export const conflict = (m) => new ApiError(409, 'CONFLICT', m);

export const json = (data, status = 200) => NextResponse.json(data, { status });

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw badRequest('Request body must be valid JSON');
  }
}

function errorResponse(e) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  // MongoDB WriteConflict / transient transaction errors -> 409 (never a 500)
  if (e?.code === 112 || e?.codeName === 'WriteConflict' || e?.errorLabels?.includes?.('TransientTransactionError')) {
    return NextResponse.json({ error: { code: 'CONFLICT', message: 'Concurrent update detected, please retry' } }, { status: 409 });
  }
  if (e?.code === 11000) {
    return NextResponse.json({ error: { code: 'CONFLICT', message: 'Duplicate value' } }, { status: 409 });
  }
  if (e?.name === 'ValidationError' || e?.name === 'CastError') {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: e.message } }, { status: 400 });
  }
  console.error('Unhandled API error:', e);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
}

// Wraps every route handler: DB connect + centralized error formatting.
export function route(fn) {
  return async (req, ctx) => {
    try {
      await connectDB();
      return await fn(req, ctx || {});
    } catch (e) {
      return errorResponse(e);
    }
  };
}
