import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Set VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX in your .env and Vercel env vars
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

/**
 * Injects the GA4 gtag.js script and tracks every client-side route change.
 * Only fires in production (skipped during `npm run dev` so your own visits
 * don't pollute analytics while building).
 * No npm package required — loads directly from Google's CDN.
 */
export const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    if (!GA_ID || import.meta.env.DEV) return;

    // Inject <script async src="...gtag/js?id=G-..."> once
    if (!document.getElementById('ga4-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);
    }

    // Initialise the dataLayer / gtag function
    (window as any).dataLayer = (window as any).dataLayer || [];
    if (!(window as any).gtag) {
      // eslint-disable-next-line prefer-rest-params
      (window as any).gtag = function gtag() {
        (window as any).dataLayer.push(arguments);
      };
      (window as any).gtag('js', new Date());
      (window as any).gtag('config', GA_ID, {
        send_page_view: false, // we send manually below to avoid a duplicate on first load
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Track every route change (including the first one)
  useEffect(() => {
    if (!GA_ID || import.meta.env.DEV) return;
    if (!(window as any).gtag) return;
    (window as any).gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  return null;
};

// ── Typed helper so you can track custom events anywhere in the app ───────
// Usage:  trackEvent('quote_requested', { product: 'Pivots Centraux' });
export const trackEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean>,
) => {
  if (!(window as any).gtag) return;
  (window as any).gtag('event', eventName, params);
};
