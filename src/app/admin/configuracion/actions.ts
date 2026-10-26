'use server';

import { db } from '@/lib/db';
import { settings, paymentMethods } from '@/drizzle/schema';
import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import {
  DEFAULT_HOME_CAROUSEL_SLIDES,
  normalizeHomeCarouselSlides,
  type HomeCarouselSlide,
} from '@/lib/home-carousel';

export interface StoreSettings {
  // Contact info
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  showPhoneInHeader: boolean;
  showSocialInFooter: boolean;
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  // Payment
  paymentMpEnabled: boolean;
  paymentWhatsappEnabled: boolean;
  whatsappFloatingEnabled: boolean;
  whatsappCheckoutEnabled: boolean;
  whatsappOrderMode: 'quick' | 'formal' | 'both';
  whatsappButtonText: string;
  whatsappNumber: string;
  whatsappMessageTemplate: string;
  footerCopyrightText: string;
  footerConsumerEnabled: boolean;
  footerConsumerText: string;
  footerConsumerUrl: string;
  footerMadeInEnabled: boolean;
  footerMadeWithText: string;
  footerMadeInText: string;
  imageConversionToWebp: boolean;
  publicSiteUrl: string;
  socialShareText: string;
  socialShareImageUrl: string;
  promoBarEnabled: boolean;
  promoBarText: string;
  promoBarLink: string;
  // Checkout options
  checkoutRequirePhone: boolean;
  checkoutNoteEnabled: boolean;
  checkoutNoteLabel: string;
  checkoutNoteRequired: boolean;
  checkoutTrackingMessage: string;
}

export async function getSettings(): Promise<StoreSettings> {
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    // Contact info
    storeName: map['store_name'] || '',
    storeEmail: map['store_email'] || '',
    storePhone: map['store_phone'] || '',
    storeAddress: map['store_address'] || '',
    showPhoneInHeader: map['show_phone_in_header'] === 'true',
    showSocialInFooter: map['show_social_in_footer'] === 'true',
    instagramUrl: map['instagram_url'] || '',
    facebookUrl: map['facebook_url'] || '',
    twitterUrl: map['twitter_url'] || '',
    // Payment
    paymentMpEnabled: map['payment_mp_enabled'] !== 'false',
    paymentWhatsappEnabled: map['payment_whatsapp_enabled'] !== 'false',
    whatsappFloatingEnabled: map['whatsapp_floating_enabled'] === 'true',
    whatsappCheckoutEnabled: map['whatsapp_checkout_enabled'] !== 'false',
    whatsappOrderMode: (map['whatsapp_order_mode'] === 'formal' || map['whatsapp_order_mode'] === 'both' ? map['whatsapp_order_mode'] : 'quick') as 'quick' | 'formal' | 'both',
    whatsappButtonText: map['whatsapp_button_text'] || 'Consultar por WhatsApp',
    whatsappNumber: map['whatsapp_number'] || '',
    whatsappMessageTemplate: map['whatsapp_message_template'] || '¡Hola! Quiero consultar sobre mi pedido:',
    footerCopyrightText: map['footer_copyright_text'] || 'Copyright Tendencia Shop - 20323692352 - 2026.',
    footerConsumerEnabled: map['footer_consumer_enabled'] !== 'false',
    footerConsumerText: map['footer_consumer_text'] || 'Defensa del consumidor',
    footerConsumerUrl: map['footer_consumer_url'] || 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
    footerMadeInEnabled: map['footer_made_in_enabled'] !== 'false',
    footerMadeWithText: map['footer_made_with_text'] || 'Hecho con',
    footerMadeInText: map['footer_made_in_text'] || 'en Tucumán',
    imageConversionToWebp: map['image_conversion_to_webp'] === 'true',
    publicSiteUrl: map['public_site_url'] || 'https://www.tendenciashop.com.ar',
    socialShareText: map['social_share_text'] || 'Mirá este producto: {product}',
    socialShareImageUrl: map['social_share_image_url'] || '',
    promoBarEnabled: map['promo_bar_enabled'] !== 'false',
    promoBarText: map['promo_bar_text'] || 'Descuentos exclusivos para comprar al por mayor - ¡contactanos!',
    promoBarLink: map['promo_bar_link'] || '',
    // Checkout options
    checkoutRequirePhone: map['checkout_require_phone'] === 'true',
    checkoutNoteEnabled: map['checkout_note_enabled'] !== 'false',
    checkoutNoteLabel: map['checkout_note_label'] || 'Notas del pedido',
    checkoutNoteRequired: map['checkout_note_required'] === 'true',
    checkoutTrackingMessage: map['checkout_tracking_message'] || 'Te enviamos la confirmación a tu email. Preparamos tu pedido y te notificaremos cuando esté listo para enviar.',
  };
}

export async function saveSettings(data: Partial<StoreSettings>): Promise<void> {
  // C4-TRACE: configuration mutations are restricted to authenticated admins.
  await requireAdmin();
  const entries = Object.entries(data).filter(([, v]) => v !== undefined);
  for (const [rawKey, value] of entries) {
    const key = rawKey
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase();
    const dbKey = key === 'store_name' ? 'store_name'
      : key === 'store_email' ? 'store_email'
      : key === 'store_phone' ? 'store_phone'
      : key === 'store_address' ? 'store_address'
      : key === 'show_phone_in_header' ? 'show_phone_in_header'
      : key === 'show_social_in_footer' ? 'show_social_in_footer'
      : key === 'instagram_url' ? 'instagram_url'
      : key === 'facebook_url' ? 'facebook_url'
      : key === 'twitter_url' ? 'twitter_url'
      : key === 'payment_mp_enabled' ? 'payment_mp_enabled'
      : key === 'payment_whatsapp_enabled' ? 'payment_whatsapp_enabled'
      : key === 'whatsapp_floating_enabled' ? 'whatsapp_floating_enabled'
      : key === 'whatsapp_checkout_enabled' ? 'whatsapp_checkout_enabled'
      : key === 'whatsapp_order_mode' ? 'whatsapp_order_mode'
      : key === 'whatsapp_button_text' ? 'whatsapp_button_text'
      : key === 'whatsapp_number' ? 'whatsapp_number'
      : key === 'whatsapp_message_template' ? 'whatsapp_message_template'
      : key === 'footer_copyright_text' ? 'footer_copyright_text'
      : key === 'footer_consumer_enabled' ? 'footer_consumer_enabled'
      : key === 'footer_consumer_text' ? 'footer_consumer_text'
      : key === 'footer_consumer_url' ? 'footer_consumer_url'
      : key === 'footer_made_in_enabled' ? 'footer_made_in_enabled'
      : key === 'footer_made_with_text' ? 'footer_made_with_text'
       : key === 'footer_made_in_text' ? 'footer_made_in_text'
       : key === 'image_conversion_to_webp' ? 'image_conversion_to_webp'
       : key === 'public_site_url' ? 'public_site_url'
       : key === 'social_share_text' ? 'social_share_text'
        : key === 'social_share_image_url' ? 'social_share_image_url'
        : key === 'promo_bar_enabled' ? 'promo_bar_enabled'
        : key === 'promo_bar_text' ? 'promo_bar_text'
        : key === 'promo_bar_link' ? 'promo_bar_link'
        : key;

    await db
      .insert(settings)
      .values({ key: dbKey, value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });
  }
}

// ─── Home Banner ───

const BANNER_KEYS = {
  DESKTOP: 'home_banner_desktop',
  MOBILE:  'home_banner_mobile',
  LINK:    'home_banner_link',
  ALT:     'home_banner_alt',
  ACTIVE:  'home_banner_active',
};

export type HomeBannerData = {
  desktopUrl: string;
  mobileUrl: string;
  link: string;
  alt: string;
  isActive: boolean;
};

export async function getHomeBanner(): Promise<HomeBannerData> {
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    desktopUrl: map[BANNER_KEYS.DESKTOP] || '',
    mobileUrl:  map[BANNER_KEYS.MOBILE]  || '',
    link:       map[BANNER_KEYS.LINK]     || '',
    alt:        map[BANNER_KEYS.ALT]      || '',
    isActive:   map[BANNER_KEYS.ACTIVE] === 'true',
  };
}

export async function saveHomeBanner(data: HomeBannerData): Promise<void> {
  // C4-TRACE: only admins may publish the homepage banner.
  await requireAdmin();
  const entries = [
    [BANNER_KEYS.DESKTOP, data.desktopUrl],
    [BANNER_KEYS.MOBILE,  data.mobileUrl],
    [BANNER_KEYS.LINK,    data.link],
    [BANNER_KEYS.ALT,     data.alt],
    [BANNER_KEYS.ACTIVE,  String(data.isActive)],
  ] as const;
  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  revalidatePath('/');
}

// C4-TRACE: persist ordered carousel slides as a single settings value without a schema migration.
const HOME_CAROUSEL_SLIDES_KEY = 'home_carousel_slides';

export async function getHomeCarouselSlides(): Promise<HomeCarouselSlide[]> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, HOME_CAROUSEL_SLIDES_KEY))
    .limit(1);

  if (!row) return DEFAULT_HOME_CAROUSEL_SLIDES;

  try {
    const parsed: unknown = JSON.parse(row.value);
    return normalizeHomeCarouselSlides(parsed);
  } catch {
    return DEFAULT_HOME_CAROUSEL_SLIDES;
  }
}

export async function saveHomeCarouselSlides(slides: HomeCarouselSlide[]): Promise<void> {
  await requireAdmin();
  // C4-TRACE: validate the admin payload before persisting carousel configuration.
  const normalizedSlides = normalizeHomeCarouselSlides(slides);

  await db
    .insert(settings)
    .values({ key: HOME_CAROUSEL_SLIDES_KEY, value: JSON.stringify(normalizedSlides) })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(normalizedSlides) },
    });
  revalidatePath('/');
}

// ─── Payment Methods ───

export type PaymentMethodRow = typeof paymentMethods.$inferSelect;

export async function getPaymentMethods(): Promise<PaymentMethodRow[]> {
  try {
    return await db
      .select()
      .from(paymentMethods)
      .orderBy(asc(paymentMethods.position));
  } catch {
    return [];
  }
}

export async function savePaymentMethods(
  methods: Array<{ id: string; name: string; type: string; isActive: boolean; discountPercent: number | null; position: number; logoUrl: string | null }>
): Promise<void> {
  // C4-TRACE: payment-method settings mutations require admin authorization.
  await requireAdmin();
  for (const method of methods) {
    if (method.discountPercent != null && (!Number.isInteger(method.discountPercent) || method.discountPercent < 0 || method.discountPercent > 100)) {
      throw new Error(`El descuento de ${method.name} debe ser un porcentaje entero entre 0 y 100.`);
    }
    await db
      .insert(paymentMethods)
      .values({
        id: method.id,
        name: method.name,
        type: method.type,
        isActive: method.isActive,
        discountPercent: method.discountPercent,
        logoUrl: method.logoUrl,
        position: method.position,
      })
      .onConflictDoUpdate({
        target: paymentMethods.id,
        set: {
          isActive: method.isActive,
          discountPercent: method.discountPercent,
          position: method.position,
        },
      });
  }
}
