import { jwtVerify } from 'jose';

/** Shared guard for every /api/admin/* endpoint. Uses JWT Cookies.
 *  Returns a 401/503 Response if the caller is not authorized, or `null`
 *  when the request may proceed. */
export async function requireAdmin(req: Request): Promise<Response | null> {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;

  if (!secret) {
    // Fail closed on a misconfigured deployment, not open.
    return Response.json({ error: "Admin dashboard is not configured" }, { status: 503 });
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/admin_token=([^;]+)/);
  
  if (!match) {
    return new Response("Authentication required", { status: 401 });
  }

  const token = match[1];

  try {
    const encoder = new TextEncoder();
    await jwtVerify(token, encoder.encode(secret));
    return null; // Authorized
  } catch (err) {
    return new Response("Authentication invalid or expired", { status: 401 });
  }
}

