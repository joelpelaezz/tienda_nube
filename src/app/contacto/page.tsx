import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import SocialIcons from '@/components/social/SocialIcons';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contacto - Tendencia Shop',
  description: 'Contactanos para consultas y pedidos.',
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <CartDrawer />

      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-primary">Inicio</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-primary">Contacto</span>
        </nav>

        {/* Titulo */}
        <h1 className="contacto-title text-center mb-8">CONTACTO</h1>

        {/* Contenido principal - dos columnas */}
        <div className="contacto-grid">
          {/* Columna izquierda - Info de contacto */}
          <div className="contacto-info">
            <h2 className="contacto-info-title">CONTACTANOS</h2>
            <p className="contacto-info-subtitle">Asesor de Ventas</p>

            <div className="contacto-info-items">
              <div className="contacto-info-item">
                <span className="contacto-info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <a href="tel:03883345437" className="contacto-info-link">03883345437</a>
              </div>

              <div className="contacto-info-item">
                <span className="contacto-info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <a href="mailto:joelpelaezz@gmail.com" className="contacto-info-link">joelpelaezz@gmail.com</a>
              </div>

              <div className="contacto-info-item">
                <span className="contacto-info-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="contacto-info-text">mina los adobes n 1194</span>
              </div>
            </div>

            {/* Mapa */}
            <div className="contacto-map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3516.123456789!2d-65.3456789!3d-24.7890123!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sMina+los+Adobes+n+1194!5e0!3m2!1ses!2sar!4v1234567890"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href="https://maps.google.com/?q=Mina+los+Adobes+n+1194"
                target="_blank"
                rel="noopener noreferrer"
                className="contacto-map-link"
              >
                Abrir en Maps ↗
              </a>
            </div>
          </div>

          {/* Columna derecha - Formulario */}
          <div className="contacto-form-container">
            <form className="contacto-form">
              <div className="contacto-form-group">
                <label htmlFor="contact-name" className="contacto-form-label">Nombre:</label>
                <input
                  type="text"
                  id="contact-name"
                  name="name"
                  required
                  className="contacto-form-input"
                />
              </div>

              <div className="contacto-form-group">
                <label htmlFor="contact-email" className="contacto-form-label">Email:</label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  required
                  className="contacto-form-input"
                />
              </div>

              <div className="contacto-form-group">
                <label htmlFor="contact-phone" className="contacto-form-label">Teléfono (Opcional):</label>
                <input
                  type="tel"
                  id="contact-phone"
                  name="phone"
                  className="contacto-form-input"
                />
              </div>

              <div className="contacto-form-group">
                <label htmlFor="contact-message" className="contacto-form-label">Mensaje (Opcional):</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  className="contacto-form-textarea"
                />
              </div>

              {/* reCAPTCHA simulado */}
              <div className="contacto-recaptcha">
                <div className="contacto-recaptcha-box">
                  <input type="checkbox" id="recaptcha" className="mr-2" />
                  <label htmlFor="recaptcha">No soy un robot</label>
                  <img
                    src="https://www.gstatic.com/recaptcha/api2/logo_48.png"
                    alt="reCAPTCHA"
                    className="ml-auto h-8"
                  />
                </div>
              </div>

              <button type="submit" className="contacto-form-btn">
                ENVIAR
              </button>
            </form>
          </div>
        </div>

        {/* Seguinos */}
        <div className="contacto-seguinos">
          <h2 className="contacto-seguinos-title">SEGUINOS</h2>
          <SocialIcons />
        </div>
      </main>

      <Footer />
    </>
  );
}
