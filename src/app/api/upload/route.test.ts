import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn() }));
vi.mock('@/lib/auth', () => ({ assertAdminRequest: vi.fn() }));
vi.mock('@/app/admin/configuracion/actions', () => ({ getSettings: vi.fn() }));

import { mkdir, writeFile } from 'fs/promises';
import { assertAdminRequest } from '@/lib/auth';
import { getSettings } from '@/app/admin/configuracion/actions';
import { POST } from './route';

const image = async (format: 'jpeg' | 'png' | 'webp' | 'gif') =>
  sharp({ create: { width: 2, height: 2, channels: 3, background: '#f00' } })
    .toFormat(format).toBuffer();

function request(data: Buffer, name = 'image.png', type = 'image/png', productId = '0') {
  const form = new FormData();
  form.append('file', new File([new Uint8Array(data)], name, { type }));
  form.append('productId', productId);
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: form });
}

describe('secure image upload', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assertAdminRequest).mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof assertAdminRequest>>);
    vi.mocked(getSettings).mockResolvedValue({ imageConversionToWebp: false } as Awaited<ReturnType<typeof getSettings>>);
  });

  it('checks authorization before parsing the body or touching storage', async () => {
    vi.mocked(assertAdminRequest).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) });
    const req = new NextRequest('http://localhost/api/upload', { method: 'POST' });
    const parse = vi.spyOn(req, 'formData');
    expect((await POST(req)).status).toBe(401);
    expect(parse).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
    expect(getSettings).not.toHaveBeenCalled();
  });

  it.each(['', '../1', '-1', '01', '1.0', '1e3', '9007199254740992'])('rejects invalid productId %s', async (id) => {
    expect((await POST(request(await image('png'), 'a.png', 'image/png', id))).status).toBe(400);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it.each(['jpeg', 'png', 'webp', 'gif'] as const)('uses the decoded %s format and an opaque contained name', async (format) => {
    const original = await image(format);
    const response = await POST(request(original, '../../danger.svg', 'image/svg+xml', '123'));
    expect(response.status).toBe(200);
    const result = await response.json();
    const ext = format === 'jpeg' ? 'jpg' : format;
    expect(result.key).toMatch(new RegExp(`^[0-9a-f-]{36}\\.${ext}$`));
    expect(result.url).toBe(`/product-images/${result.key}`);
    expect(writeFile).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/public/product-images/${result.key}$`)), original, { flag: 'wx' });
  });

  it('converts non-GIF images to WebP when enabled, but keeps GIF bytes', async () => {
    vi.mocked(getSettings).mockResolvedValue({ imageConversionToWebp: true } as Awaited<ReturnType<typeof getSettings>>);
    const png = await image('png');
    const converted = await POST(request(png, 'wrong.gif', 'image/gif'));
    expect((await converted.json()).key).toMatch(/\.webp$/);
    const convertedBytes = vi.mocked(writeFile).mock.calls[0][1] as Buffer;
    expect((await sharp(convertedBytes).metadata()).format).toBe('webp');
    const gif = await image('gif');
    const kept = await POST(request(gif, 'wrong.png', 'image/png'));
    expect((await kept.json()).key).toMatch(/\.gif$/);
    expect(vi.mocked(writeFile).mock.calls[1][1]).toEqual(gif);
  });

  it('rejects spoofed, truncated, unsupported, empty, and oversized input', async () => {
    const png = await image('png');
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
    for (const data of [Buffer.from('not an image'), png.subarray(0, 32), svg, Buffer.alloc(0), Buffer.alloc(10 * 1024 * 1024 + 1)]) {
      expect((await POST(request(data))).status).toBe(400);
    }
    expect(writeFile).not.toHaveBeenCalled();
    expect(getSettings).not.toHaveBeenCalled();
  });
});
