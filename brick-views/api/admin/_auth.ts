/** Shared guard for every /api/admin/* endpoint. Uses HTTP Basic Auth so the
 *  browser's native credential prompt handles login — no custom form, no
 *  token or cookie to manage, nothing for XSS to steal from localStorage.
 *
 *  Password only (username is ignored) against `process.env.ADMIN_PASSWORD`.
 *  A plain `===` compare is used, not a timing-safe one: the threat model
 *  here is a single internal password behind HTTPS, not a remote attacker
 *  with the precision to exploit microsecond string-compare timing.
 *
 *  Returns a 401/503 Response if the caller is not authorized, or `null`
 *  when the request may proceed. */
export function requireAdmin(req: Request): Response | null {
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    // Fail closed on a misconfigured deployment, not open.
    return Response.json({ error: "Admin dashboard is not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice("Basic ".length));
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (password === expected) return null;
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin"' },
  });
}
