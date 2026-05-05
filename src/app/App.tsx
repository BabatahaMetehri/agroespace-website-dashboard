import { RouterProvider } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { router } from './routes';
import { I18nProvider } from './i18n/I18nProvider';

export default function App() {
  return (
    <I18nProvider>
      {/* Analytics + Speed Insights don't need router context — safe here */}
      <Analytics />
      <SpeedInsights />

      <RouterProvider router={router} />
    </I18nProvider>
  );
}
