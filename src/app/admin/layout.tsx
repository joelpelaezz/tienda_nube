import AdminLayout from '@/components/admin/AdminLayout';
import './admin.css';

export const metadata = {
  title: 'Admin — Tendencia Shop',
  description: 'Panel de administración de Tendencia Shop',
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
