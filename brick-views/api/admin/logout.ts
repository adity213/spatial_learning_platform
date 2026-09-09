async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        'Set-Cookie': 'admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict',
      },
    }
  );
}

export default { fetch: handler };
