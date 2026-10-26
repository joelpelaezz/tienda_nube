import { getManagedVariantTypes } from './actions';
import VariantManager from './VariantManager';

export const dynamic = 'force-dynamic';

export default async function VariacionesPage() {
  const variantTypes = await getManagedVariantTypes();
  return <VariantManager initialTypes={variantTypes} />;
}
