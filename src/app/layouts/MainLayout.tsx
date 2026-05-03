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
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.012 2C6.506 2 2.023 6.474 2.015 11.97C2.011 13.722 2.474 15.42 3.336 16.92L2.006 21.758L6.963 20.457C8.423 21.246 10.16 21.666 11.996 21.666H12.012C17.514 21.666 22.002 17.191 22.008 11.696C22.011 9.027 20.975 6.52 19.088 4.63C17.201 2.739 14.686 1.705 12.012 2ZM17.473 15.698C17.246 16.335 16.35 16.892 15.656 17.03C15.176 17.126 14.502 17.202 11.585 15.992C7.854 14.444 5.438 10.638 5.253 10.395C5.074 10.155 3.75 8.396 3.75 6.574C3.75 4.752 4.673 3.864 5.048 3.486C5.352 3.182 5.86 3.018 6.337 3.018C6.488 3.018 6.626 3.024 6.744 3.031C7.093 3.048 7.268 3.069 7.498 3.62C7.785 4.307 8.483 6.012 8.566 6.182C8.652 6.352 8.766 6.578 8.653 6.805C8.543 7.034 8.435 7.153 8.243 7.382C8.048 7.611 7.868 7.781 7.661 8.033C7.45 8.283 7.221 8.552 7.483 9.006C7.739 9.455 8.473 10.655 9.408 11.488C10.615 12.564 11.758 12.915 12.26 13.119C12.635 13.27 13.082 13.238 13.353 12.946C13.7 12.57 14.12 11.91 14.558 11.164C14.887 10.605 15.342 10.534 15.86 10.726C16.386 10.92 19.146 12.28 19.7 12.56C20.252 12.84 20.618 12.982 20.76 13.208C20.902 13.435 20.902 14.547 20.448 15.333L17.473 15.698Z" />
        </svg>
      </a>

      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
};
