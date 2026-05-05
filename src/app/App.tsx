import { RouterProvider } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { router } from './routes';
import { I18nProvider } from './i18n/I18nProvider';
import { GoogleAnalytics } from './analytics/GoogleAnalytics';

export default function App() {
  return (
    <I18nProvider>
      {/* ── Analytics (all three are zero-render, no UI output) ── */}
      <GoogleAnalytics />
      <Analytics />
      <SpeedInsights />

      <RouterProvider router={router} />
    </I18nProvider>
  );
}
