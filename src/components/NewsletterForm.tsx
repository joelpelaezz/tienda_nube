'use client';

import { FormEvent, useState } from 'react';

export default function NewsletterForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setStatus('sending');
    setError('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const result = await response.json();

      if (!response.ok) {
        setStatus('error');
        setError(result.error || 'No pudimos completar la suscripción.');
        return;
      }

      formElement.reset();
      setStatus('success');
    } catch {
      setStatus('error');
      setError('No pudimos completar la suscripción. Intentá nuevamente.');
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <input type="text" name="name" placeholder="Nombre" maxLength={120} className="newsletter-input" />
      <input type="email" name="email" placeholder="Tu E-Mail" maxLength={180} required className="newsletter-input" />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="contacto-honeypot" />
      {status === 'success' && <p className="newsletter-form-success">¡Listo! Te suscribimos al newsletter.</p>}
      {status === 'error' && <p className="newsletter-form-error">{error}</p>}
      <button type="submit" className="home-newsletter-btn" disabled={status === 'sending'}>
        {status === 'sending' ? 'ENVIANDO...' : 'INSCRIBIRSE'}
      </button>
    </form>
  );
}
