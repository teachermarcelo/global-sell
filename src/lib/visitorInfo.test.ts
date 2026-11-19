import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClickEventsCsv,
  detectBrowserAndOs,
  detectTrafficSource,
  formatClickedElementLabel,
  formatLocationSummary,
  shouldAutoRedirectPage,
} from './visitorInfo.ts';

test('detectBrowserAndOs identifies in-app browsers, mobile OS, and desktop browsers', () => {
  const ig = detectBrowserAndOs(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 Instagram 320.0.0'
  );
  assert.equal(ig.browser, 'Instagram App');
  assert.equal(ig.os, 'iOS');

  const chromeAndroid = detectBrowserAndOs(
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36'
  );
  assert.equal(chromeAndroid.browser, 'Chrome');
  assert.equal(chromeAndroid.os, 'Android');

  const edgeWin = detectBrowserAndOs(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
  );
  assert.equal(edgeWin.browser, 'Edge');
  assert.equal(edgeWin.os, 'Windows');
});

test('detectTrafficSource distinguishes Google Ads, Meta Ads, Instagram, and Direct', () => {
  assert.equal(
    detectTrafficSource('?gclid=EAIaIQobChMI', '').trafficSource,
    'Google Ads'
  );
  assert.equal(
    detectTrafficSource('?fbclid=IwAR123', 'https://l.instagram.com/').trafficSource,
    'Instagram Ads'
  );
  assert.equal(
    detectTrafficSource('?fbclid=IwAR123', 'https://m.facebook.com/').trafficSource,
    'Meta Ads'
  );
  assert.equal(
    detectTrafficSource('', 'https://www.google.com/search?q=kartori').trafficSource,
    'Google'
  );
  assert.equal(detectTrafficSource('', '').trafficSource, 'Direct');
});

test('formatLocationSummary formats city, region, and country gracefully including legacy rows', () => {
  assert.equal(
    formatLocationSummary({ city: 'São Paulo', region: 'SP', country: 'BR' }),
    'São Paulo, SP · BR'
  );
  assert.equal(
    formatLocationSummary({ city: 'Lisboa', region: 'Lisboa', country: 'PT' }),
    'Lisboa · PT'
  );
  assert.equal(formatLocationSummary({ country: 'us' }), 'US');
});

test('formatClickedElementLabel and CSV export escape quotes and commas properly', () => {
  assert.equal(formatClickedElementLabel('cookie_consent', true), 'Card de Cookies (CTA)');
  assert.equal(formatClickedElementLabel('redirect_link', true), 'Link Curto /go/');

  const csv = buildClickEventsCsv([
    {
      timestamp: '2026-11-19 10:00',
      eventType: 'affiliate_click',
      clickedElement: 'cookie_consent',
      clickedLabel: 'Aceitar, "Continuar"',
      clickedUrl: 'https://example.com/?a=1&b=2',
      productName: 'Kartori',
      pageTitle: 'Kartori Presell',
      pageSlug: 'kartori',
      city: 'São Paulo',
      region: 'SP',
      country: 'BR',
      language: 'pt',
      browserLanguage: 'pt-BR',
      device: 'mobile',
      browser: 'Instagram App',
      os: 'iOS',
      trafficSource: 'Instagram Ads',
      referrer: 'https://l.instagram.com/',
      utmSource: 'ig',
      utmMedium: 'cpc',
      utmCampaign: 'kartori_br',
      variant: 'A',
      gateway: '',
      revenue: 0,
      currency: 'BRL',
    },
  ]);

  assert.ok(csv.includes('"Aceitar, ""Continuar"""'));
  assert.ok(csv.includes('São Paulo'));
  assert.ok(csv.includes('Kartori'));
});

test('shouldAutoRedirectPage auto-enables existing cookie presells while honoring explicit overrides', () => {
  assert.equal(formatClickedElementLabel('auto_redirect', true), 'Redirecionamento Automático');

  // Legacy cookie presells without tracking.autoRedirect automatically pass through
  assert.equal(shouldAutoRedirectPage({ presellType: 'cookies_centered', tracking: {} }), true);
  assert.equal(shouldAutoRedirectPage({ presellType: 'cookies_premium' }), true);
  assert.equal(
    shouldAutoRedirectPage({
      presellType: 'review_page',
      blocks: [{ id: 'b1', type: 'cookie_consent' }],
    }),
    true
  );

  // Explicit false disables pass-through even on cookie presells
  assert.equal(
    shouldAutoRedirectPage({ presellType: 'cookies_centered', tracking: { autoRedirect: false } }),
    false
  );

  // Non-cookie pages stay manual unless explicitly enabled
  assert.equal(shouldAutoRedirectPage({ presellType: 'review_page', blocks: [] }), false);
  assert.equal(
    shouldAutoRedirectPage({ presellType: 'review_page', tracking: { autoRedirect: true } }),
    true
  );
});
