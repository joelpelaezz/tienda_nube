'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONFIG_SECTION_GROUPS } from '../sections';

// C4-TRACE: grouped sub-navigation that mirrors the configuration topics.
export default function ConfigSubNav() {
  const pathname = usePathname();

  return (
    <nav className="config-subnav" aria-label="Secciones de configuración">
      {CONFIG_SECTION_GROUPS.map((group) => (
        <div className="config-subnav-group" key={group.group}>
          <div className="config-subnav-group-title">{group.group}</div>
          {group.items.map((item) => {
            const isActive = !item.external && pathname === item.href;
            return (
              <Link
                key={item.slug}
                href={item.href}
                className={`config-subnav-item ${isActive ? 'config-subnav-item--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
