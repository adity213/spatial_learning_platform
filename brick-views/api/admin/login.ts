import { eq } from 'drizzle-orm';
import { db } from '../../src/db';
import { admins } from '../../src/db/schema';
import * as bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required" }, { status: 400 });
    }

    const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
    if (!secret) {
      return Response.json({ error: "Auth is not configured" }, { status: 503 });
    }

    // Master admin fallback (using Vercel environment variable)
    if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
      // Allow master admin to bypass database check
    } else {
      // Lookup user in database
      const [admin] = await db.select().from(admins).where(eq(admins.username, username));

      if (!admin) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, admin.passwordHash);

      if (!isValid) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    // Generate JWT
    const encoder = new TextEncoder();
    const token = await new SignJWT({ username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(encoder.encode(secret));

    // Return response with Set-Cookie header
    return Response.json(
      { success: true },
      {
        status: 200,
        headers: {
          'Set-Cookie': `admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`,
        },
      }
    );
  } catch (err) {
    console.error("Login error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const GET = () => Response.json({ error: "Method not allowed" }, { status: 405 });
