'use client';

import { FormEvent, useState } from 'react';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus('error');
        setError(result.error || 'No pudimos enviar tu mensaje.');
        return;
      }

      formElement.reset();
      setStatus('success');
    } catch {
      setStatus('error');
      setError('No pudimos enviar tu mensaje. Intentá nuevamente.');
    }
  }

  return (
    <form className="contacto-form" onSubmit={handleSubmit}>
      <div className="contacto-form-group">
        <label htmlFor="contact-name" className="contacto-form-label">Nombre:</label>
        <input type="text" id="contact-name" name="name" required maxLength={120} className="contacto-form-input" />
      </div>
      <div className="contacto-form-group">
        <label htmlFor="contact-email" className="contacto-form-label">Email:</label>
        <input type="email" id="contact-email" name="email" required maxLength={180} className="contacto-form-input" />
      </div>
      <div className="contacto-form-group">
        <label htmlFor="contact-phone" className="contacto-form-label">Teléfono (Opcional):</label>
        <input type="tel" id="contact-phone" name="phone" maxLength={40} className="contacto-form-input" />
      </div>
      <div className="contacto-form-group">
        <label htmlFor="contact-message" className="contacto-form-label">Mensaje:</label>
        <textarea id="contact-message" name="message" rows={6} required maxLength={4000} className="contacto-form-textarea" />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="contacto-honeypot" />
      {status === 'success' && <p className="contacto-form-success">Mensaje enviado. Te responderemos pronto.</p>}
      {status === 'error' && <p className="contacto-form-error">{error}</p>}
      <button type="submit" className="contacto-form-btn" disabled={status === 'sending'}>
        {status === 'sending' ? 'ENVIANDO...' : 'ENVIAR'}
      </button>
    </form>
  );
}
