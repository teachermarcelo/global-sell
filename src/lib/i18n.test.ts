import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAffiliateRedirectUrl,
  formatCurrency,
  generatePixPayload,
  getPublicPagePath,
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
