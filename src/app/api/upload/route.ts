import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getSettings } from '@/app/admin/configuracion/actions';
import { assertAdminRequest } from '@/lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    // C4-TRACE: image uploads are restricted to authenticated admins.
    const authorization = await assertAdminRequest();
    if (!authorization.ok) return authorization.response;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const productId = formData.get('productId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usá JPEG, PNG, GIF o WebP.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo es muy grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    const storeSettings = await getSettings();
    const shouldConvert = storeSettings.imageConversionToWebp && file.type !== 'image/gif';
    const buffer = shouldConvert
      ? await sharp(originalBuffer)
          .rotate()
          .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 84, effort: 4 })
          .toBuffer()
      : originalBuffer;

    const timestamp = Date.now();
    const ext = shouldConvert ? 'webp' : (file.name.split('.').pop()?.toLowerCase() || 'jpg');
    const filename = `${productId || 'temp'}-${timestamp}.${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'product-images');
    await mkdir(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = `/product-images/${filename}`;

    return NextResponse.json({ url, key: filename });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
