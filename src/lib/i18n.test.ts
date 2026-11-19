import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAffiliateRedirectUrl,
  extractGoogleDriveFileId,
  formatCurrency,
  generatePixPayload,
  getAssetUrlFallbacks,
  getPublicBaseUrl,
  getPublicPagePath,
  normalizeAssetUrl,
  slugify,
} from './i18n.ts';

test('slugify normalizes accents, spaces, and special characters', () => {
  assert.equal(slugify('Katori — Oferta Oficial 2026!'), 'katori-oferta-oficial-2026');
  assert.equal(slugify('Avaliação Técnica & Prós'), 'avaliacao-tecnica-pros');
});

test('buildAffiliateRedirectUrl preserves essential affiliate params and merges UTMs', () => {
  const result = buildAffiliateRedirectUrl(
    'https://www.treejammer.com/N5P1G23/546X6MD/?uid=998&hop=aff123',
    { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'katori_us' },
    '?gclid=EAIaIQobChMI&utm_content=ad1'
  );
  const parsed = new URL(result);
  assert.equal(parsed.searchParams.get('uid'), '998');
  assert.equal(parsed.searchParams.get('hop'), 'aff123');
  assert.equal(parsed.searchParams.get('utm_source'), 'google');
  assert.equal(parsed.searchParams.get('gclid'), 'EAIaIQobChMI');
  assert.equal(parsed.searchParams.get('utm_content'), 'ad1');
});

test('getPublicPagePath generates language-specific routes', () => {
  assert.equal(getPublicPagePath('pt', 'katori'), '/pt/katori');
  assert.equal(getPublicPagePath('en', 'katori'), '/en/katori');
  assert.equal(getPublicPagePath('auto', 'katori'), '/p/katori');
});

test('getPublicBaseUrl normalizes custom domains with or without protocol/trailing slashes', () => {
  assert.equal(getPublicBaseUrl('https://global-sell-beta.vercel.app/'), 'https://global-sell-beta.vercel.app');
  assert.equal(getPublicBaseUrl('ofertas.seudominio.com/'), 'https://ofertas.seudominio.com');
  assert.equal(getPublicBaseUrl('http://localhost:3000///'), 'http://localhost:3000');
  assert.equal(getPublicBaseUrl(''), '');
});

test('normalizeAssetUrl rewrites legacy /src/assets/images/ paths to /images/', () => {
  assert.equal(
    normalizeAssetUrl('/src/assets/images/presell_hero_editorial_1794756577028.jpg'),
    '/images/presell_hero_editorial_1794756577028.jpg'
  );
  assert.equal(
    normalizeAssetUrl('/images/presell_hero_editorial_1794756577028.jpg'),
    '/images/presell_hero_editorial_1794756577028.jpg'
  );
});

test('normalizeAssetUrl and getAssetUrlFallbacks convert Google Drive, Dropbox, Imgur, and bare links', () => {
  const fileId = '1hpUEjAbCdEfGhIjKlMnOpQrStUv';
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/file/d/${fileId}/view?usp=sharing`),
    fileId
  );
  assert.equal(
    extractGoogleDriveFileId(`https://drive.google.com/open?id=${fileId}`),
    fileId
  );
  assert.equal(
    extractGoogleDriveFileId(`drive.google.com/uc?export=download&id=${fileId}`),
    fileId
  );
  assert.equal(
    normalizeAssetUrl(`https://drive.google.com/file/d/${fileId}/view?usp=drive_link`),
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`
  );
  assert.deepEqual(
    getAssetUrlFallbacks(`https://drive.google.com/file/d/${fileId}/view?usp=sharing`),
    [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
      `https://drive.google.com/uc?export=view&id=${fileId}`,
    ]
  );

  // Dropbox share link preserves rlkey and switches to raw=1
  assert.equal(
    normalizeAssetUrl('https://www.dropbox.com/scl/fi/abc123/photo.jpg?rlkey=xyz&dl=0'),
    'https://www.dropbox.com/scl/fi/abc123/photo.jpg?rlkey=xyz&raw=1'
  );

  // Imgur single page link
  assert.equal(normalizeAssetUrl('https://imgur.com/aBcDe12'), 'https://i.imgur.com/aBcDe12.jpg');

  // Bare direct URL without protocol
  assert.equal(
    normalizeAssetUrl('cdn.exemplo.com/uploads/produto.webp'),
    'https://cdn.exemplo.com/uploads/produto.webp'
  );

  // Data URL preserved untouched
  assert.equal(normalizeAssetUrl('data:image/png;base64,abc123'), 'data:image/png;base64,abc123');
});

test('formatCurrency formats BRL and USD cleanly', () => {
  assert.match(formatCurrency(197, 'BRL'), /197/);
  assert.match(formatCurrency(69, 'USD'), /69/);
});

test('generatePixPayload builds valid EMV BRCode string', () => {
  const payload = generatePixPayload('pix@globalpresell.com', 'Global Presell', 197);
  assert.ok(payload.startsWith('000201'));
  assert.ok(payload.includes('BR.GOV.BCB.PIX'));
  assert.ok(payload.includes('197.00'));
});
