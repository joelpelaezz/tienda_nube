'use client';

import { useEffect, useRef, useState } from 'react';
import NextImage from 'next/image';

const MAX_SOURCE_SIZE = 10 * 1024 * 1024;
const TARGET_SIZE = 1600;
const MIN_RECOMMENDED_SIZE = 800;

type ImageInfo = {
  file: File;
  sourceFile: File;
  preview: string;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  zoom: number;
  warning?: string;
};

interface ImageUploadAdvisorProps {
  multiple?: boolean;
  disabled?: boolean;
  onFilesReady: (files: File[]) => void;
  id?: string;
}

function readImage(file: File): Promise<{ image: HTMLImageElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No pudimos leer la imagen.'));
    };
    image.src = url;
  });
}

async function optimizeImage(file: File, cropX = 50, cropY = 50, zoom = 1) {
  if (!file.type.startsWith('image/') || file.size > MAX_SOURCE_SIZE) {
    throw new Error(file.size > MAX_SOURCE_SIZE ? 'Supera el máximo de 10MB.' : 'Usá un archivo de imagen.');
  }

  const { image, width, height } = await readImage(file);
  const cropSize = Math.min(width, height) / zoom;
  const maxOffsetX = Math.max(0, width - cropSize);
  const maxOffsetY = Math.max(0, height - cropSize);
  const canvas = document.createElement('canvas');
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No pudimos preparar la imagen.');

  context.drawImage(
    image,
    maxOffsetX * (cropX / 100),
    maxOffsetY * (cropY / 100),
    cropSize,
    cropSize,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE,
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
  if (!blob) throw new Error('No pudimos comprimir la imagen.');

  const optimized = new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
  return {
    file: optimized,
    width,
    height,
    warning: width < MIN_RECOMMENDED_SIZE || height < MIN_RECOMMENDED_SIZE
      ? 'La imagen original es menor a 800px y puede verse pixelada.'
      : undefined,
  };
}

export default function ImageUploadAdvisor({ multiple = true, disabled = false, onFilesReady, id = 'product-images' }: ImageUploadAdvisorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<ImageInfo[]>([]);

  useEffect(() => () => images.forEach((image) => URL.revokeObjectURL(image.preview)), [images]);

  const handleFiles = async (incoming: File[]) => {
    if (incoming.length === 0) return;
    setProcessing(true);
    setError('');
    try {
      const selected = multiple ? incoming : incoming.slice(0, 1);
      const processed = await Promise.all(selected.map(async (file) => {
        const result = await optimizeImage(file);
        return { ...result, sourceFile: file, cropX: 50, cropY: 50, zoom: 1, preview: URL.createObjectURL(result.file) };
      }));
      images.forEach((image) => URL.revokeObjectURL(image.preview));
      setImages(processed);
      onFilesReady(processed.map((image) => image.file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos preparar la imagen.');
      setImages([]);
      onFilesReady([]);
    } finally {
      setProcessing(false);
    }
  };

  const updateCrop = async (index: number, patch: Partial<Pick<ImageInfo, 'cropX' | 'cropY' | 'zoom'>>) => {
    const current = images[index];
    if (!current) return;
    const nextCrop = { cropX: current.cropX, cropY: current.cropY, zoom: current.zoom, ...patch };
    setProcessing(true);
    try {
      const result = await optimizeImage(current.sourceFile, nextCrop.cropX, nextCrop.cropY, nextCrop.zoom);
      const nextFile = { ...current, ...result, ...nextCrop, preview: URL.createObjectURL(result.file) };
      URL.revokeObjectURL(current.preview);
      const nextImages = images.map((image, imageIndex) => imageIndex === index ? nextFile : image);
      setImages(nextImages);
      onFilesReady(nextImages.map((image) => image.file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos actualizar el recorte.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="admin-image-advisor">
      <div className="admin-image-advisor-guide">
        <strong>Imagen recomendada: 1600 × 1600 px</strong>
        <span>Usamos un recorte cuadrado y la convertimos automáticamente a WebP para que cargue rápido en celular y computadora.</span>
        <span>Podés subir JPG, PNG, GIF o WebP de hasta 10MB.</span>
      </div>

      <button
        type="button"
        className={`admin-image-advisor-dropzone ${dragging ? 'admin-image-advisor-dropzone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles(Array.from(event.dataTransfer.files)); }}
        disabled={disabled || processing}
      >
        <span className="admin-image-advisor-icon">＋</span>
        <span>{processing ? 'Preparando imágenes…' : 'Arrastrá fotos aquí o seleccioná archivos'}</span>
         <small>Después podés ajustar zoom y posición del recorte</small>
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple={multiple}
        hidden
        onChange={(event) => { void handleFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = ''; }}
      />

      {error && <p className="admin-field-error">{error}</p>}
      {images.length > 0 && (
        <div className="admin-image-advisor-preview-list">
          {images.map((image, index) => (
            <div key={`${image.file.name}-${image.file.size}`} className="admin-image-advisor-preview">
              <NextImage src={image.preview} alt="Vista previa de la imagen" width={320} height={240} unoptimized />
              <div>
                <strong>{image.file.name}</strong>
                <span>{image.width} × {image.height}px · {(image.file.size / 1024).toFixed(0)}KB</span>
                {image.warning && <small className="admin-image-advisor-warning">⚠ {image.warning}</small>}
                {!image.warning && <small className="admin-image-advisor-success">✓ Calidad recomendada</small>}
                <label>
                  <span>Zoom: {image.zoom.toFixed(1)}×</span>
                  <input type="range" min="1" max="3" step="0.1" value={image.zoom} disabled={processing} onChange={(event) => void updateCrop(index, { zoom: Number(event.target.value) })} />
                </label>
                <label>
                  <span>Horizontal: {image.cropX}%</span>
                  <input type="range" min="0" max="100" value={image.cropX} disabled={processing} onChange={(event) => void updateCrop(index, { cropX: Number(event.target.value) })} />
                </label>
                <label>
                  <span>Vertical: {image.cropY}%</span>
                  <input type="range" min="0" max="100" value={image.cropY} disabled={processing} onChange={(event) => void updateCrop(index, { cropY: Number(event.target.value) })} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
