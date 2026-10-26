'use client';

import Image from 'next/image';
import { uploadFile } from '@/lib/storage';
import { MAX_HOME_CAROUSEL_SLIDES, type HomeCarouselSlide } from '@/lib/home-carousel';

type CarouselSlidesEditorProps = {
  slides: HomeCarouselSlide[];
  onChange: (slides: HomeCarouselSlide[]) => void;
  uploadingField: string | null;
  onUpload: (slideId: string, field: 'imageUrl' | 'mobileImageUrl', file: File) => void;
};

// C4-TRACE: slide editor with file pickers, ordering controls and compact previews.
export default function CarouselSlidesEditor({
  slides,
  onChange,
  uploadingField,
  onUpload,
}: CarouselSlidesEditorProps) {
  const updateSlide = (id: string, updates: Partial<HomeCarouselSlide>) => {
    onChange(slides.map((slide) => slide.id === id ? { ...slide, ...updates } : slide));
  };

  const moveSlide = (index: number, offset: -1 | 1) => {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    onChange(reordered);
  };

  const addSlide = () => {
    if (slides.length >= MAX_HOME_CAROUSEL_SLIDES) return;
    onChange([
      ...slides,
      { id: crypto.randomUUID(), imageUrl: '', mobileImageUrl: '', link: '', alt: '', isActive: true },
    ]);
  };

  const removeSlide = (slide: HomeCarouselSlide) => {
    if (!window.confirm(`¿Eliminar el slide “${slide.alt || 'sin título'}”?`)) return;
    onChange(slides.filter((item) => item.id !== slide.id));
  };

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <h2 className="admin-card-title">Carrusel del homepage</h2>
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          onClick={addSlide}
          disabled={slides.length >= MAX_HOME_CAROUSEL_SLIDES}
        >
          Agregar slide
        </button>
      </div>
      <div className="admin-card-body">
        <p className="admin-field-help" style={{ marginBottom: '16px' }}>
          Administrá hasta {MAX_HOME_CAROUSEL_SLIDES} imágenes, su orden, versión mobile y destino.
          Los slides inactivos no aparecen en la tienda.
        </p>

        {slides.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-title">No hay slides configurados</div>
            <div className="admin-empty-text">Agregá un slide para mostrar imágenes en el inicio.</div>
          </div>
        ) : (
          <div className="admin-carousel-slides">
            {slides.map((slide, index) => (
              <div className="admin-card admin-carousel-slide" key={slide.id}>
                <div className="admin-card-header admin-carousel-slide-header">
                  <div>
                    <h3 className="admin-card-title">Slide {index + 1}</h3>
                    <span className="admin-field-help">{slide.isActive ? 'Visible en el carrusel' : 'Inactivo'}</span>
                  </div>
                  <div className="admin-carousel-slide-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => moveSlide(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover slide ${index + 1} arriba`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => moveSlide(index, 1)}
                      disabled={index === slides.length - 1}
                      aria-label={`Mover slide ${index + 1} abajo`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm admin-btn-remove"
                      onClick={() => removeSlide(slide)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="admin-card-body">
                  <label className="admin-checkbox-label" style={{ marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      checked={slide.isActive}
                      onChange={(event) => updateSlide(slide.id, { isActive: event.target.checked })}
                    />
                    <span>Mostrar este slide</span>
                  </label>

                  <div className="admin-field-group">
                    <label className="admin-label" htmlFor={`carousel-image-${index}`}>Imagen desktop</label>
                    <div className="admin-carousel-image-controls">
                      <input
                        id={`carousel-image-${index}`}
                        type="text"
                        className="admin-input"
                        value={slide.imageUrl}
                        onChange={(event) => updateSlide(slide.id, { imageUrl: event.target.value })}
                        placeholder="https://... o /images/banner.jpg"
                        required={slide.isActive}
                      />
                      <label className="admin-btn admin-btn-secondary admin-btn-sm admin-carousel-upload-button">
                        {uploadingField === `${slide.id}:imageUrl` ? 'Subiendo…' : 'Elegir archivo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          disabled={uploadingField !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) onUpload(slide.id, 'imageUrl', file);
                            event.currentTarget.value = '';
                          }}
                          hidden
                        />
                      </label>
                    </div>
                    <span className="admin-field-help">Recomendado: 1600 × 500 px. Una imagen es necesaria para activar el slide.</span>
                  </div>

                  <div className="admin-field-group" style={{ marginTop: '12px' }}>
                    <label className="admin-label" htmlFor={`carousel-mobile-${index}`}>Imagen mobile (opcional)</label>
                    <div className="admin-carousel-image-controls">
                      <input
                        id={`carousel-mobile-${index}`}
                        type="text"
                        className="admin-input"
                        value={slide.mobileImageUrl}
                        onChange={(event) => updateSlide(slide.id, { mobileImageUrl: event.target.value })}
                        placeholder="https://... o /images/banner-mobile.jpg"
                      />
                      <label className="admin-btn admin-btn-secondary admin-btn-sm admin-carousel-upload-button">
                        {uploadingField === `${slide.id}:mobileImageUrl` ? 'Subiendo…' : 'Elegir archivo'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          disabled={uploadingField !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) onUpload(slide.id, 'mobileImageUrl', file);
                            event.currentTarget.value = '';
                          }}
                          hidden
                        />
                      </label>
                    </div>
                    <span className="admin-field-help">Recomendado: 800 × 400 px. Si no cargás una imagen mobile, se usa la desktop.</span>
                  </div>

                  <div className="admin-carousel-previews">
                    {slide.imageUrl && (
                      <div className="admin-field-group">
                        <label className="admin-label">Vista previa desktop</label>
                        <div className="admin-carousel-preview admin-carousel-preview--desktop">
                          <Image
                            src={slide.imageUrl}
                            alt={slide.alt || `Vista previa desktop del slide ${index + 1}`}
                            fill
                            unoptimized
                            sizes="(max-width: 600px) 100vw, 400px"
                            className="admin-carousel-preview-image"
                          />
                        </div>
                      </div>
                    )}
                    {slide.mobileImageUrl && (
                      <div className="admin-field-group">
                        <label className="admin-label">Vista previa mobile</label>
                        <div className="admin-carousel-preview admin-carousel-preview--mobile">
                          <Image
                            src={slide.mobileImageUrl}
                            alt={slide.alt || `Vista previa mobile del slide ${index + 1}`}
                            fill
                            unoptimized
                            sizes="240px"
                            className="admin-carousel-preview-image"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="admin-field-group" style={{ marginTop: '12px' }}>
                    <label className="admin-label" htmlFor={`carousel-link-${index}`}>Link de destino (opcional)</label>
                    <input
                      id={`carousel-link-${index}`}
                      type="text"
                      className="admin-input"
                      value={slide.link}
                      onChange={(event) => updateSlide(slide.id, { link: event.target.value })}
                      placeholder="/productos o https://..."
                    />
                  </div>

                  <div className="admin-field-group" style={{ marginTop: '12px' }}>
                    <label className="admin-label" htmlFor={`carousel-alt-${index}`}>Texto alternativo</label>
                    <input
                      id={`carousel-alt-${index}`}
                      type="text"
                      maxLength={250}
                      className="admin-input"
                      value={slide.alt}
                      onChange={(event) => updateSlide(slide.id, { alt: event.target.value })}
                      placeholder="Describí la imagen"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
