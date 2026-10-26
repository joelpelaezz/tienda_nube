// C4-TRACE: single registry that drives the configuration sub-navigation.

export type ConfigSectionItem = {
  slug: string;
  label: string;
  description: string;
  /** Route inside /admin/configuracion, or an absolute admin route for cross-links. */
  href: string;
  /** Cross-links leave the configuration area. */
  external?: boolean;
};

export type ConfigSectionGroup = {
  group: string;
  items: ConfigSectionItem[];
};

export const CONFIG_SECTION_GROUPS: ConfigSectionGroup[] = [
  {
    group: 'Tienda',
    items: [
      {
        slug: 'datos-tienda',
        label: 'Datos de la tienda',
        description: 'Información de contacto que ven tus clientes en la tienda.',
        href: '/admin/configuracion/datos-tienda',
      },
      {
        slug: 'redes-compartir',
        label: 'Redes y compartir',
        description: 'Tus redes sociales y cómo se ven tus productos cuando los comparten.',
        href: '/admin/configuracion/redes-compartir',
      },
      {
        slug: 'banner-carrusel',
        label: 'Banner y carrusel',
        description: 'Las imágenes grandes que se muestran al entrar a tu tienda.',
        href: '/admin/configuracion/banner-carrusel',
      },
      {
        slug: 'franja-promocional',
        label: 'Franja promocional',
        description: 'El aviso rotativo que aparece arriba de todo en la tienda.',
        href: '/admin/configuracion/franja-promocional',
      },
      {
        slug: 'footer',
        label: 'Footer',
        description: 'Copyright, enlaces legales y textos del pie de la tienda.',
        href: '/admin/configuracion/footer',
      },
    ],
  },
  {
    group: 'Comunicación',
    items: [
      {
        slug: 'whatsapp',
        label: 'Botón de WhatsApp',
        description: 'El número de WhatsApp y dónde se muestra en tu tienda.',
        href: '/admin/configuracion/whatsapp',
      },
      {
        slug: 'comunicaciones',
        label: 'Comunicaciones',
        description: 'Mensajes, suscriptores y eventos de WhatsApp.',
        href: '/admin/comunicaciones',
        external: true,
      },
    ],
  },
  {
    group: 'Pagos y envíos',
    items: [
      {
        slug: 'medios-pago',
        label: 'Medios de pago',
        description: 'Las formas de pago disponibles en tu tienda.',
        href: '/admin/configuracion/medios-pago',
      },
      {
        slug: 'medios-envio',
        label: 'Medios de envío',
        description: 'Tus métodos de envío, costos y zonas de reparto.',
        href: '/admin/envios',
        external: true,
      },
    ],
  },
  {
    group: 'Checkout',
    items: [
      {
        slug: 'opciones-checkout',
        label: 'Opciones del checkout',
        description: 'Qué información le pedís a tu cliente durante la compra.',
        href: '/admin/configuracion/opciones-checkout',
      },
      {
        slug: 'cupones',
        label: 'Cupones',
        description: 'Códigos de descuento y sus límites de uso.',
        href: '/admin/descuentos',
        external: true,
      },
    ],
  },
  {
    group: 'Avanzado',
    items: [
      {
        slug: 'optimizacion-imagenes',
        label: 'Optimización de imágenes',
        description: 'Convertí tus imágenes a WebP para que la tienda cargue más rápido.',
        href: '/admin/configuracion/optimizacion-imagenes',
      },
    ],
  },
];

export const CONFIG_SECTIONS: ConfigSectionItem[] = CONFIG_SECTION_GROUPS.flatMap(
  (group) => group.items,
);

export function getConfigSection(slug: string): ConfigSectionItem | undefined {
  return CONFIG_SECTIONS.find((section) => section.slug === slug);
}
