import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { useI18n } from '../i18n/I18nProvider';

export const MainLayout = () => {
  const { dir } = useI18n();
  // Float WhatsApp on the side closest to the user's reading direction
  const whatsappSide = dir === 'rtl' ? 'left-6' : 'right-6';

  return (
    <div
      className="bg-[#f4f7f5] min-h-screen font-sans selection:bg-[#87A922] selection:text-white"
      style={{ position: 'relative' }}
      dir={dir}
    >
      <Navigation />
      <main>
        <Outlet />
      </main>
      <Footer />

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/213661391012"
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 ${whatsappSide} z-50 w-14 h-14 bg-[#25D366] hover:bg-[#1fad53] rounded-full shadow-[0_4px_20px_rgba(37,211,102,0.4)] flex items-center justify-center hover:scale-110 transition-transform group`}
        aria-label="Contactez-nous sur WhatsApp"
      >
        <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M24 4C12.954 4 4 12.954 4 24C4 27.858 5.088 31.463 6.977 34.516L4.087 43.913L13.737 41.07C16.693 42.786 20.231 43.77 24 43.77C35.046 43.77 44 34.816 44 23.77C44 12.954 35.046 4 24 4Z" fill="white"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M24 7C14.611 7 7 14.611 7 24C7 27.544 8.048 30.843 9.847 33.601L7.5 41.5L15.647 39.196C18.306 40.779 21.047 41.77 24 41.77C33.389 41.77 41 34.159 41 24.77C41 14.611 33.389 7 24 7ZM17.5 14.5C17.1 13.5 16.6 13.481 16.2 13.465C15.867 13.45 15.483 13.45 15.1 13.45C14.717 13.45 14.1 13.6 13.567 14.183C13.033 14.767 11.5 16.2 11.5 19.117C11.5 22.033 13.617 24.85 13.9 25.233C14.183 25.617 17.883 31.617 23.733 34.05C28.65 36.083 29.583 35.7 30.583 35.617C31.583 35.533 33.817 34.183 34.3 32.783C34.783 31.383 34.783 30.183 34.633 29.933C34.483 29.683 34.1 29.533 33.533 29.25C32.967 28.967 30.05 27.533 29.533 27.35C29.017 27.167 28.633 27.083 28.25 27.65C27.867 28.217 26.717 29.533 26.383 29.917C26.05 30.3 25.717 30.35 25.15 30.067C24.583 29.783 22.733 29.183 20.55 27.233C18.85 25.717 17.667 23.833 17.333 23.267C17 22.7 17.3 22.4 17.583 22.117C17.833 21.867 18.15 21.467 18.433 21.133C18.717 20.8 18.8 20.567 18.983 20.183C19.167 19.8 19.083 19.467 18.933 19.183C18.783 18.9 17.617 15.967 17.5 14.5Z" fill="#25D366"/>
        </svg>
      </a>

      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
};
