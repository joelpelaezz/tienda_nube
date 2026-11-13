import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { getSettings } from '@/app/admin/configuracion/actions';
import { assertAdminRequest } from '@/lib/auth';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PIXELS = 40_000_000; // Includes all animation frames.
const MAX_FRAMES = 100;
const EXTENSIONS: Record<string, string> = { jpeg: 'jpg', png: 'png', gif: 'gif', webp: 'webp' };
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
};
const VERCEL_ENVIRONMENTS = new Set(['development', 'preview', 'production']);

function getBlobEnvironment(): string {
  const vercelEnvironment = process.env.VERCEL_ENV;
  if (vercelEnvironment) {
    if (!VERCEL_ENVIRONMENTS.has(vercelEnvironment)) {
      throw new Error('Unsupported VERCEL_ENV for Blob namespace.');
    }
    return vercelEnvironment;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export async function POST(req: NextRequest) {
  try {
    // C4-TRACE: image uploads are restricted to authenticated admins.
    const authorization = await assertAdminRequest();
    if (!authorization.ok) return authorization.response;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Formulario inválido.' }, { status: 400 });
    }
    const file = formData.get('file');
    const productId = formData.get('productId');

    if (!file || typeof file === 'string' || formData.getAll('file').length !== 1) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (typeof productId !== 'string' || formData.getAll('productId').length !== 1 ||
        !/^(0|[1-9][0-9]*)$/.test(productId) || !Number.isSafeInteger(Number(productId))) {
      return NextResponse.json(
        { error: 'Identificador de producto inválido.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo está vacío.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo es muy grande. Máximo 10MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    // Metadata only reads headers: decode every frame before accepting original bytes.
    const options = { animated: true, failOn: 'warning' as const, limitInputPixels: MAX_PIXELS };
    let format: string;
    try {
      const metadata = await sharp(originalBuffer, options).metadata();
      format = metadata.format || '';
      const pages = metadata.pages || 1;
      const width = metadata.width || 0;
      const height = metadata.pageHeight || metadata.height || 0;
      if (!Object.hasOwn(EXTENSIONS, format) || !width || !height ||
          pages > MAX_FRAMES || width * height * pages > MAX_PIXELS) {
        throw new Error('Unsupported image or image limits exceeded');
      }
      await sharp(originalBuffer, options).raw().toBuffer();
    } catch {
      return NextResponse.json(
        { error: 'Imagen inválida o no permitida. Usá JPEG, PNG, GIF o WebP dentro de los límites.' },
        { status: 400 }
      );
    }
    const storeSettings = await getSettings();
    const shouldConvert = storeSettings.imageConversionToWebp && format !== 'gif';
    let buffer: Buffer;
    try {
      buffer = shouldConvert
        ? await sharp(originalBuffer, { failOn: 'warning', limitInputPixels: MAX_PIXELS })
            .rotate()
            .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 84, effort: 4 })
            .toBuffer()
        : originalBuffer;
    } catch {
      return NextResponse.json({ error: 'Imagen inválida o no permitida.' }, { status: 400 });
    }

    const ext = shouldConvert ? 'webp' : EXTENSIONS[format];
    const pathname = `tienda-nube/${getBlobEnvironment()}/product-images/${randomUUID()}.${ext}`;
    // C4-TRACE: namespace validated uploads by deployment environment in the shared Blob store.
    const blob = await put(pathname, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: CONTENT_TYPES[ext],
    });

    return NextResponse.json({ url: blob.url, key: blob.pathname });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
