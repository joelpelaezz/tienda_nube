import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import bcrypt from 'bcryptjs';

const email = process.argv[2] || 'admin@tienda.com';
const password = process.argv[3] || 'admin123';
const name = process.argv[4] || 'Admin';

async function main() {
  const hashed = await bcrypt.hash(password, 10);
  
  const [user] = await db.insert(users).values({
    name,
    email,
    password: hashed,
    role: 'admin',
  }).onConflictDoUpdate({
    target: users.email,
    set: { password: hashed, role: 'admin' },
  }).returning();

  console.log(`Admin user: ${email} / ${password} (id: ${user.id})`);
}

main().catch(console.error);
