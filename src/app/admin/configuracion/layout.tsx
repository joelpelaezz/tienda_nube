import ConfigSubNav from './components/ConfigSubNav';
import './configuracion.css';

// C4-TRACE: configuration area renders a topic sub-navigation beside the page content.
export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-container config-layout">
      <ConfigSubNav />
      <div className="config-layout-content">{children}</div>
    </div>
  );
}
