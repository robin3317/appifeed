// Small, explicit JSON response helpers shared by every API route.
// Explicit over clever: routes call these directly instead of a magic wrapper.

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function badRequest(message: string, details?: unknown): Response {
  return Response.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Not authenticated"): Response {
  return Response.json({ error: message }, { status: 401 });
}

export function notFound(message = "Not found"): Response {
  return Response.json({ error: message }, { status: 404 });
}

export function conflict(message: string): Response {
  return Response.json({ error: message }, { status: 409 });
}

export function serverError(message = "Something went wrong"): Response {
  return Response.json({ error: message }, { status: 500 });
}
