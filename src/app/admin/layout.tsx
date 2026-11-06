import AdminLayout from '@/components/admin/AdminLayout';
import { requireAdminPage } from '@/lib/auth';
import './admin.css';

export const metadata = {
  title: 'Admin — Tendencia Shop',
  description: 'Panel de administración de Tendencia Shop',
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // C4-TRACE: defense in depth using the same verified session as actions/APIs.
  await requireAdminPage();
  return <AdminLayout>{children}</AdminLayout>;
}
