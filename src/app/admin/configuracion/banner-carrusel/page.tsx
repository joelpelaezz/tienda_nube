'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  getHomeBanner,
  getHomeCarouselSlides,
  saveHomeBanner,
  saveHomeCarouselSlides,
  type HomeBannerData,
} from '../actions';
import { validateHomeCarouselSlides, type HomeCarouselSlide } from '@/lib/home-carousel';
import { uploadFile } from '@/lib/storage';
import ConfigSectionShell from '../components/ConfigSectionShell';
import CarouselSlidesEditor from './CarouselSlidesEditor';

const EMPTY_BANNER: HomeBannerData = {
  desktopUrl: '',
  mobileUrl: '',
  link: '',
  alt: '',
  isActive: false,
};

// C4-TRACE: banner override and carousel slides share one section and one save scope.
export default function BannerCarruselPage() {
  const [banner, setBanner] = useState<HomeBannerData>(EMPTY_BANNER);
  const [slides, setSlides] = useState<HomeCarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHomeBanner(), getHomeCarouselSlides()]).then(([bannerData, slideData]) => {
      setBanner(bannerData);
      setSlides(slideData);
      setLoading(false);
    });
  }, []);

  const uploadImage = async (target: 'banner' | string, field: 'imageUrl' | 'mobileImageUrl', file: File) => {
    const key = target === 'banner' ? `banner:${field}` : `${target}:${field}`;
    setUploadingField(key);
    try {
      const result = await uploadFile(file, 0);
      if (target === 'banner') {
        setBanner((current) => ({
          ...current,
          ...(field === 'imageUrl' ? { desktopUrl: result.url } : { mobileUrl: result.url }),
        }));
      } else {
        setSlides((current) => current.map((slide) => slide.id === target
          ? { ...slide, ...(field === 'imageUrl' ? { imageUrl: result.url } : { mobileImageUrl: result.url }) }
          : slide));
      }
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    const validationError = validateHomeCarouselSlides(slides);
    if (validationError) throw new Error(validationError);

    await saveHomeBanner(banner);
    await saveHomeCarouselSlides(slides);
  };

  if (loading) {
    return <div className="admin-page-loading">Cargando...</div>;
  }

  return (
    <ConfigSectionShell
      title="Banner y carrusel"
      description="Las imágenes grandes que se muestran al entrar a tu tienda."
      onSave={handleSave}
    >
      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">Banner del homepage</h2>
        </div>
        <div className="admin-card-body">
          <div className="admin-setting-row">
            <div className="admin-setting-info">
              <div className="admin-setting-label">Activar banner en el homepage</div>
              <div className="admin-setting-desc">
                Muestra un banner personalizado en lugar del carrusel en la página principal.
              </div>
            </div>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={banner.isActive}
                onChange={(event) => setBanner((current) => ({ ...current, isActive: event.target.checked }))}
              />
              <span className="admin-toggle-slider" />
            </label>
          </div>

          {banner.isActive && (
            <>
              <div className="admin-field-group" style={{ marginTop: '16px' }}>
                <label className="admin-label" htmlFor="banner-desktop">URL de imagen desktop</label>
                <div className="admin-carousel-image-controls">
                  <input
                    id="banner-desktop"
                    type="text"
                    className="admin-input"
                    value={banner.desktopUrl}
                    onChange={(event) => setBanner((current) => ({ ...current, desktopUrl: event.target.value }))}
                    placeholder="https://example.com/banner-desktop.jpg"
                  />
                  <label className="admin-btn admin-btn-secondary admin-btn-sm admin-carousel-upload-button">
                    {uploadingField === 'banner:imageUrl' ? 'Subiendo…' : 'Elegir archivo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={uploadingField !== null}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void uploadImage('banner', 'imageUrl', file);
                        event.currentTarget.value = '';
                      }}
                      hidden
                    />
                  </label>
                </div>
                <span className="admin-field-help">Imagen para pantallas de 768px en adelante. Recomendado: 1600×400px (relación 4:1).</span>
              </div>

              <div className="admin-field-group" style={{ marginTop: '12px' }}>
                <label className="admin-label" htmlFor="banner-mobile">URL de imagen mobile (opcional)</label>
                <div className="admin-carousel-image-controls">
                  <input
                    id="banner-mobile"
                    type="text"
                    className="admin-input"
                    value={banner.mobileUrl}
                    onChange={(event) => setBanner((current) => ({ ...current, mobileUrl: event.target.value }))}
                    placeholder="https://example.com/banner-mobile.jpg"
                  />
                  <label className="admin-btn admin-btn-secondary admin-btn-sm admin-carousel-upload-button">
                    {uploadingField === 'banner:mobileImageUrl' ? 'Subiendo…' : 'Elegir archivo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={uploadingField !== null}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) void uploadImage('banner', 'mobileImageUrl', file);
                        event.currentTarget.value = '';
                      }}
                      hidden
                    />
                  </label>
                </div>
                <span className="admin-field-help">Imagen para pantallas menores a 768px. Recomendado: 800×400px (relación 2:1). Si está vacío se usa la imagen desktop.</span>
              </div>

              <div className="admin-field-group" style={{ marginTop: '12px' }}>
                <label className="admin-label" htmlFor="banner-link">Link de destino (opcional)</label>
                <input
                  id="banner-link"
                  type="text"
                  className="admin-input"
                  value={banner.link}
                  onChange={(event) => setBanner((current) => ({ ...current, link: event.target.value }))}
                  placeholder="https://... o /productos"
                />
              </div>

              <div className="admin-field-group" style={{ marginTop: '12px' }}>
                <label className="admin-label" htmlFor="banner-alt">Texto alternativo (alt)</label>
                <input
                  id="banner-alt"
                  type="text"
                  className="admin-input"
                  value={banner.alt}
                  onChange={(event) => setBanner((current) => ({ ...current, alt: event.target.value }))}
                  placeholder="Banner de ofertas especiales"
                />
              </div>

              {banner.desktopUrl && (
                <div className="admin-field-group" style={{ marginTop: '16px' }}>
                  <label className="admin-label">Vista previa desktop</label>
                  <div className="admin-carousel-preview admin-carousel-preview--desktop">
                    <Image
                      src={banner.desktopUrl}
                      alt={banner.alt || 'Vista previa del banner'}
                      fill
                      unoptimized
                      sizes="(max-width: 600px) 100vw, 400px"
                      className="admin-carousel-preview-image"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <CarouselSlidesEditor
          slides={slides}
          onChange={setSlides}
          uploadingField={uploadingField}
          onUpload={(slideId, field, file) => void uploadImage(slideId, field, file)}
        />
      </div>
    </ConfigSectionShell>
  );
}
