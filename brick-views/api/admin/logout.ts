export async function POST() {
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

export const GET = () => Response.json({ error: "Method not allowed" }, { status: 405 });
