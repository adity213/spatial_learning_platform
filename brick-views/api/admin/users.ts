import { eq } from 'drizzle-orm';
import { db } from '../../src/db';
import { admins } from '../../src/db/schema';
import * as bcrypt from 'bcryptjs';
import { requireAdmin } from './_auth';

export async function GET(req: Request) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const allAdmins = await db.select({
      id: admins.id,
      username: admins.username,
      createdAt: admins.createdAt,
    }).from(admins);

    return Response.json({ admins: allAdmins });
  } catch (err) {
    console.error("Fetch admins error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required" }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.select().from(admins).where(eq(admins.username, username));
    if (existing.length > 0) {
      return Response.json({ error: "Username already exists" }, { status: 409 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    await db.insert(admins).values({
      username,
      passwordHash,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Create admin error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
