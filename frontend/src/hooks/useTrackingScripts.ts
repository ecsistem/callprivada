import { useEffect } from 'react';
import type { TrackingConfig } from '../services/trackingService';

function injectScript(id: string, html: string) {
  if (document.getElementById(id)) return;
  const div = document.createElement('div');
  div.innerHTML = html;
  const scripts = Array.from(div.querySelectorAll('script'));
  scripts.forEach((orig) => {
    const s = document.createElement('script');
    if (orig.src) {
      s.src = orig.src;
      s.async = true;
    } else {
      s.textContent = orig.textContent;
    }
    s.id = id;
    document.head.appendChild(s);
  });
}

function injectInlineScript(id: string, code: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.textContent = code;
  document.head.appendChild(s);
}

function injectSrcScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

type PixelEvent = 'InitiateCheckout' | 'Purchase';

interface PixelWindow {
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

/**
 * Dispara um evento de conversão em todos os pixels carregados na página.
 * - InitiateCheckout: lead chegou na tela de pagamento.
 * - Purchase: pagamento confirmado.
 */
export function trackPixelEvent(event: PixelEvent, opts: { amountCents: number; currency?: string }) {
  const w = window as PixelWindow;
  const value = opts.amountCents / 100;
  const currency = opts.currency || 'BRL';

  try {
    // Meta Pixel
    w.fbq?.('track', event, { value, currency });
    // TikTok — Purchase equivale a CompletePayment
    w.ttq?.track(event === 'Purchase' ? 'CompletePayment' : 'InitiateCheckout', {
      value, currency, content_type: 'product',
    });
    // GA4
    w.gtag?.('event', event === 'Purchase' ? 'purchase' : 'begin_checkout', { value, currency });
    // GTM dataLayer (para triggers customizados)
    w.dataLayer?.push({ event: event === 'Purchase' ? 'purchase' : 'begin_checkout', value, currency });
  } catch { /* pixels nunca devem quebrar o checkout */ }
}

export function useTrackingScripts(tracking?: TrackingConfig | null) {
  useEffect(() => {
    if (!tracking) return;

    if (tracking.facebook_pixel_id) {
      injectInlineScript(
        '__fb_pixel',
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${tracking.facebook_pixel_id}');fbq('track','PageView');`
      );
    }

    if (tracking.tiktok_pixel_id) {
      injectInlineScript(
        '__tt_pixel',
        `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tracking.tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`
      );
    }

    if (tracking.google_analytics_id) {
      injectSrcScript(
        '__ga4_src',
        `https://www.googletagmanager.com/gtag/js?id=${tracking.google_analytics_id}`
      );
      injectInlineScript(
        '__ga4',
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tracking.google_analytics_id}');`
      );
    }

    if (tracking.gtm_container_id) {
      injectInlineScript(
        '__gtm',
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${tracking.gtm_container_id}');`
      );
    }

    if (tracking.utmify_token) {
      injectSrcScript(
        '__utmify',
        `https://cdn.utmify.com.br/scripts/utms/latest.js`
      );
      injectInlineScript(
        '__utmify_init',
        `window.utmify_token='${tracking.utmify_token}';`
      );
    }

    if (tracking.dracofy_token) {
      const s = document.createElement('script');
      s.id = '__dracofy';
      s.src = 'https://cdn.dracofy.com.br/v1/index.js';
      s.setAttribute('data-token', tracking.dracofy_token);
      s.async = true;
      s.defer = true;
      if (!document.getElementById('__dracofy')) document.head.appendChild(s);
    }

    if (tracking.clarity_project_id) {
      injectInlineScript(
        '__clarity',
        `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${tracking.clarity_project_id}");`
      );
    }

    if (tracking.custom_head_script) {
      injectScript('__custom_head', tracking.custom_head_script);
    }
  }, [tracking]);
}
