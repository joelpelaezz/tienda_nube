import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { variantTypes, variantOptions } from '@/drizzle/schema';
import { eq, asc } from 'drizzle-orm';
import { assertAdminRequest } from '@/lib/auth';

export async function GET() {
  const types = await db
    .select()
    .from(variantTypes)
    .orderBy(asc(variantTypes.position));

  const options = await db
    .select()
    .from(variantOptions)
    .orderBy(asc(variantOptions.position));

  const result = types.map((type) => ({
    ...type,
    options: options
      .filter((opt) => opt.variantTypeId === type.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  // C4-TRACE: Phase 1 — only authenticated admins can create variant types/values.
  const guard = await assertAdminRequest();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { name, optionValues } = body as { name: string; optionValues: string[] };

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    }

    // Create the variant type
    const [vt] = await db.insert(variantTypes).values({ name: name.trim() }).returning();

    // Create options if provided
    const createdOptions: typeof variantOptions.$inferSelect[] = [];
    if (optionValues && Array.isArray(optionValues) && optionValues.length > 0) {
      const optionRows = optionValues
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .map((value, idx) => ({
          variantTypeId: vt.id,
          value,
          position: idx,
        }));
      if (optionRows.length > 0) {
        const inserted = await db.insert(variantOptions).values(optionRows).returning();
        createdOptions.push(...inserted);
      }
    }

    return NextResponse.json({ ...vt, options: createdOptions }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/variant-types]', err);
    return NextResponse.json({ error: 'Error al crear tipo de variante' }, { status: 500 });
  }
}
