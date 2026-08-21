'use client';

import QuickShopModal from './QuickShopModal';
import { useQuickShopStore } from '@/lib/store';

export default function QuickShopProvider() {
  const { isOpen, product, closeQuickShop } = useQuickShopStore();

  return (
    <QuickShopModal
      product={isOpen ? product : null}
      onClose={closeQuickShop}
    />
  );
}
