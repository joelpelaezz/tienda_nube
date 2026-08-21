'use client';

import { useState, useEffect } from 'react';

export default function CookieBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user already accepted
    const accepted = localStorage.getItem('cookies-accepted');
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookies-accepted', 'true');
    setVisible(false);
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
