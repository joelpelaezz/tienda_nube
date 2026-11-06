'use client';

import { useState, useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => !localStorage.getItem('cookies-accepted');
const getServerSnapshot = () => false;

export default function CookieBar() {
  const [accepted, setAccepted] = useState(false);
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) && !accepted;

  const handleAccept = () => {
    localStorage.setItem('cookies-accepted', 'true');
    setAccepted(true);
  };

  if (!visible) return null;

  return (
    <div className="cookie-bar">
      <div className="cookie-bar-content">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cookie-bar-icon">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <p className="cookie-bar-text">
          Al navegar por este sitio <strong>aceptás el uso de cookies</strong> para agilizar tu experiencia de compra.
        </p>
        <button onClick={handleAccept} className="cookie-bar-btn">
          Entendido
        </button>
      </div>
    </div>
  );
}
