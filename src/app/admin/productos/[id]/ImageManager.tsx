'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { uploadProductImage, deleteProductImage, setImagePosition, setImageAsPrimary, deleteMultipleImages } from '../actions';
import { validateImageUrl } from '@/lib/image-validation';
import { uploadFile } from '@/lib/storage';
import ImageUploadAdvisor from '@/components/admin/ImageUploadAdvisor';

interface ImageManagerProps {
  productId: number;
  images: Array<{
    id: number;
    url: string;
    alt: string | null;
    position: number | null;
  }>;
}

interface SortableImageProps {
  image: {
    id: number;
    url: string;
    alt: string | null;
    position: number | null;
  };
  index: number;
  isSelected: boolean;
  isPrimary: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onSetPrimary: (id: number) => void;
}

function SortableImage({ image, index, isSelected, isPrimary, onSelect, onDelete, onSetPrimary }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-edit-image ${isSelected ? 'admin-edit-image--selected' : ''} ${index === 0 ? 'admin-edit-image--primary' : ''}`}
      {...attributes}
    >
      <div className="admin-edit-image-inner" {...listeners}>
        {image.url ? (
          <Image
            src={image.url}
            alt={image.alt || 'Producto'}
            width={300}
            height={300}
            unoptimized
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = 'none';
            }}
          />
        ) : (
          <div className="admin-edit-image-no-url">📷</div>
        )}
        {index === 0 && (
          <div className="admin-edit-image-label">Principal</div>
        )}
      </div>
      <div className="admin-edit-image-actions">
        {!isPrimary && (
          <button
            type="button"
            className="admin-edit-image-primary"
            onClick={(e) => {
              e.stopPropagation();
              onSetPrimary(image.id);
            }}
            title="Marcar como principal"
          >
            ★
          </button>
        )}
        <label className="admin-edit-image-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(image.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
        <button
          type="button"
          className="admin-edit-image-delete"
          onClick={() => onDelete(image.id)}
          title="Eliminar imagen"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function ImageManager({ productId, images }: ImageManagerProps) {
  const [localImages, setLocalImages] = useState(images);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Temporary negative ID counter for optimistic updates (avoids integer overflow)
  const tempIdRef = useRef(-1);
  const nextTempId = () => tempIdRef.current--;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalImages((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);

      const imagePositions = newItems.map((img, idx) => ({
        id: img.id,
        position: idx,
      }));
      setImagePosition(productId, imagePositions);

      return newItems;
    });
  }, [productId]);

  const handleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteProductImage(id, productId);
      setLocalImages((prev) => prev.filter((img) => img.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }, [productId]);

  const handleSetPrimary = useCallback(async (id: number) => {
    console.log('[ImageManager] handleSetPrimary called with id:', id);
    try {
      await setImageAsPrimary(productId, id);
      // Optimistically update local state to reflect new primary
      setLocalImages((prev) => {
        const updated = prev.map((img) => ({
          ...img,
          position: img.id === id ? 0 : (img.position ?? 0) + 1,
        }));
        return updated;
      });
    } catch (error) {
      console.error('Error setting primary image:', error);
    }
  }, [productId]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      await deleteMultipleImages(Array.from(selectedIds), productId);
      setLocalImages((prev) => prev.filter((img) => !selectedIds.has(img.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting images:', error);
    }
  }, [selectedIds, productId]);

  const handleFileUpload = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);

    setUploading(true);
    setUploadProgress('');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`${i + 1}/${files.length}`);
        const result = await uploadFile(file, productId);
        const inserted = await uploadProductImage(productId, result.url, 'file', file.name);
        setLocalImages((prev) => [
          ...prev,
          {
            id: inserted.id,
            url: result.url,
            alt: file.name,
            position: prev.length + i,
          },
        ]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  }, [productId]);

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    const validation = validateImageUrl(imageUrl.trim());
    if (!validation.valid) {
      setUrlError(validation.reason || 'URL no permitida');
      return;
    }
    setUrlError('');

    try {
      const inserted = await uploadProductImage(productId, imageUrl.trim(), 'url');
      setLocalImages((prev) => [
        ...prev,
        {
          id: inserted.id,
          url: imageUrl.trim(),
          alt: null,
          position: prev.length,
        },
      ]);
      setImageUrl('');
      setShowUrlInput(false);
    } catch (error) {
      console.error('Error adding image:', error);
      setUrlError('Error al agregar la imagen');
    }
  };

  const sortedImages = [...localImages].sort((a, b) => (a.position || 0) - (b.position || 0));

  return (
    <div className="admin-card">
      <div className="admin-card-title-row">
        <h3 className="admin-card-title">Fotos del producto</h3>
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          {showUrlInput ? 'Cerrar' : '+ Agregar por URL'}
        </button>
      </div>

      <p className="admin-edit-image-hint">
        Arrastrá las fotos para cambiar el orden. La primera foto será la principal.
      </p>

      {/* URL Input Form */}
      {showUrlInput && (
        <form onSubmit={handleAddUrl} className="admin-url-form">
          <input
            type="url"
            className={`admin-input ${urlError ? 'admin-input--error' : ''}`}
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (urlError) setUrlError('');
            }}
            placeholder="https://dcdn-us.mitiendanube.com/stores/..."
          />
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={!imageUrl.trim()}
          >
            Agregar
          </button>
          {urlError && <span className="admin-field-error">{urlError}</span>}
        </form>
      )}

      {/* Upload Zone */}
      <ImageUploadAdvisor
        disabled={uploading}
        onFilesReady={(files) => { if (files.length > 0) void handleFileUpload(files); }}
        id="file-upload"
      />

      {/* Image Grid */}
      {sortedImages.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedImages.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="admin-edit-images">
              {sortedImages.map((img, index) => (
                <SortableImage
                  key={img.id}
                  image={img}
                  index={index}
                  isSelected={selectedIds.has(img.id)}
                  isPrimary={index === 0}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onSetPrimary={handleSetPrimary}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Bulk Delete Button */}
      {selectedIds.size > 0 && (
        <div className="admin-bulk-actions">
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={handleBulkDelete}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Eliminar seleccionadas ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
}
