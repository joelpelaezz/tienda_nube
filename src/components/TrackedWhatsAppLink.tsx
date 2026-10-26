'use client';

interface TrackedWhatsAppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  source: string;
  children: React.ReactNode;
  name?: string;
  phone?: string;
  productId?: number;
  orderId?: number;
}

export default function TrackedWhatsAppLink({ source, children, onClick, name, phone, productId, orderId, ...props }: TrackedWhatsAppLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    void fetch('/api/communications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, href: props.href, name, phone, productId, orderId }),
      keepalive: true,
    }).catch(() => undefined);
    onClick?.(event);
  };

  return <a {...props} onClick={handleClick}>{children}</a>;
}
