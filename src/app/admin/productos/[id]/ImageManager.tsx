'use client';

import { useState } from 'react';
import { addProductImage, deleteProductImage } from '../actions';

interface ImageManagerProps {
  productId: number;
  images: Array<{
    id: number;
    url: string;
    alt: string | null;
    position: number | null;
  }>;
}

export default function ImageManager({ productId, images }: ImageManagerProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [localImages, setLocalImages] = useState(images);

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    setLoading(true);
    try {
      await addProductImage(productId, imageUrl.trim());
      setImageUrl('');
      // Optimistic update
      setLocalImages([
        ...localImages,
        {
          id: Date.now(),
          url: imageUrl.trim(),
          alt: null,
          position: localImages.length,
        },
      ]);
    } catch (error) {
      console.error('Error adding image:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteProductImage(imageId, productId);
      setLocalImages(localImages.filter((img) => img.id !== imageId));
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  return (
    <div className="admin-card">
      <h3 className="admin-card-title">Fotos del producto</h3>

      {/* Current images */}
      {localImages.length > 0 && (
        <div className="admin-edit-images" style={{ marginBottom: '1rem' }}>
          {localImages
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((img, i) => (
              <div
                key={img.id}
                className={`admin-edit-image ${i === 0 ? 'admin-edit-image--primary' : ''}`}
                style={{ position: 'relative' }}
              >
                <img
                  src={img.url}
                  alt={img.alt || 'Producto'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {i === 0 && (
                  <div className="admin-edit-image-label">Principal</div>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                  title="Eliminar imagen"
                >
                  ×
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Add image by URL */}
      <form onSubmit={handleAddImage} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div className="admin-form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="admin-form-label">Agregar imagen por URL</label>
          <input
            type="url"
            className="admin-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://dcdn-us.mitiendanube.com/stores/..."
          />
        </div>
        <button
          type="submit"
          className="admin-btn admin-btn-primary"
          disabled={loading || !imageUrl.trim()}
          style={{ flexShrink: 0, marginBottom: '1px' }}
        >
          {loading ? 'Agregando...' : 'Agregar'}
        </button>
      </form>
      <div className="admin-edit-image-hint">
        Pegá la URL de una imagen (ej: desde Mi Tienda Nube, Cloudinary, imgur, etc.)
      </div>
    </div>
  );
}
