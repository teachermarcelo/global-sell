import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapRowToAffiliateLink,
  mapRowToCampaign,
  mapRowToCategory,
  mapRowToClickEvent,
  mapRowToPage,
  mapRowToPageVersion,
  mapRowToPaymentGateway,
  mapRowToProduct,
  mapRowToPublishedPage,
  mapRowToSettings,
  mapRowToUserProfile,
  mapRowToUserTemplate,
  mapRowToWhatsappWidget,
  toTimestampLike,
} from './supabaseMappers.ts';

test('toTimestampLike parses ISO string into working toMillis and toDate', () => {
  const iso = '2026-11-16T18:00:00.000Z';
  const ts = toTimestampLike(iso);
  assert.equal(ts.toMillis(), Date.parse(iso));
  assert.equal(ts.toDate().toISOString(), iso);
});

test('mapRowToUserProfile maps snake_case columns cleanly', () => {
  const profile = mapRowToUserProfile({
    uid: 'user_123',
    display_name: 'Maria Silva',
    photo_url: 'https://example.com/a.jpg',
    plan: 'enterprise',
    default_lang: 'en',
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T11:00:00Z',
  });
  assert.equal(profile.uid, 'user_123');
  assert.equal(profile.displayName, 'Maria Silva');
  assert.equal(profile.photoUrl, 'https://example.com/a.jpg');
  assert.equal(profile.plan, 'enterprise');
  assert.equal(profile.defaultLang, 'en');
  assert.equal(profile.createdAt.toMillis(), Date.parse('2026-11-16T10:00:00Z'));
});

test('mapRowToProduct preserves originCountry, language, price and currency', () => {
  const prod = mapRowToProduct({
    id: 'prod_1',
    owner_id: 'u1',
    name: 'Atividades Cognitivas',
    description: 'Curso infantil',
    image_url: '/images/test.jpg',
    category_id: 'cat_1',
    origin_country: 'BR',
    country: 'ES',
    language: 'es',
    network: 'Hotmart',
    affiliate_url: 'https://hotmart.com/xyz',
    price: '197.5',
    currency: 'BRL',
    commission_rate: '50',
    producer_email: 'contato@prod.com',
    status: 'active',
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T10:00:00Z',
  });
  assert.equal(prod.originCountry, 'BR');
  assert.equal(prod.country, 'ES');
  assert.equal(prod.price, 197.5);
  assert.equal(prod.commissionRate, 50);
  assert.equal(prod.producerEmail, 'contato@prod.com');
});

test('mapRowToPage & mapRowToPublishedPage map blocks, translations and abTest JSONB fields', () => {
  const blocks = [{ id: 'b1', type: 'cookie_consent', title: 'Aviso' }];
  const page = mapRowToPage({
    id: 'page_1',
    owner_id: 'u1',
    title: 'Katori',
    slug: 'katori',
    page_kind: 'presell',
    presell_type: 'cookies_centered',
    funnel_stage: 'bottom',
    language: 'auto',
    origin_country: 'US',
    target_country: 'BR',
    ghost_mode: true,
    status: 'published',
    public_key: 'katori_u1_1',
    blocks,
    ab_test: { enabled: true, splitPercent: 50 },
    translations: { es: { title: 'Katori ES', slug: 'katori', blocks } },
    published_at: '2026-11-16T12:00:00Z',
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T12:00:00Z',
  });
  assert.equal(page.originCountry, 'US');
  assert.equal(page.targetCountry, 'BR');
  assert.equal(page.ghostMode, true);
  assert.equal(page.blocks.length, 1);
  assert.equal(page.translations?.es?.title, 'Katori ES');
  assert.ok(page.publishedAt);

  const pub = mapRowToPublishedPage({
    public_key: 'katori_u1_1',
    owner_id: 'u1',
    page_id: 'page_1',
    slug: 'katori',
    title: 'Katori',
    status: 'published',
    blocks,
    created_at: '2026-11-16T10:00:00Z',
    updated_at: '2026-11-16T12:00:00Z',
  });
  assert.equal(pub.publicKey, 'katori_u1_1');
  assert.equal(pub.status, 'published');
});

test('remaining mappers handle defaults safely', () => {
  const cat = mapRowToCategory({ id: 'c1', owner_id: 'u1', name: 'Saúde', slug: 'saude' });
  assert.equal(cat.color, '#2563EB');

  const link = mapRowToAffiliateLink({
    id: 'l1',
    owner_id: 'u1',
    label: 'Link',
    short_code: 'katori',
    destination_url: 'https://example.com',
  });
  assert.equal(link.isActive, true);

  const ver = mapRowToPageVersion({
    id: 'v1',
    owner_id: 'u1',
    page_id: 'p1',
    version_number: 12345,
  });
  assert.equal(ver.versionNumber, 12345);

  const tpl = mapRowToUserTemplate({
    id: 't1',
    owner_id: 'u1',
    name: 'Tpl',
    presell_type: 'cookies_centered',
  });
  assert.equal(tpl.isFavorite, false);

  const cmp = mapRowToCampaign({
    id: 'cmp1',
    owner_id: 'u1',
    name: 'Search BR',
    daily_budget: '150',
  });
  assert.equal(cmp.dailyBudget, 150);

  const evt = mapRowToClickEvent({
    id: 'e1',
    owner_id: 'u1',
    public_key: 'pk1',
    event_type: 'conversion',
    revenue: '197',
  });
  assert.equal(evt.revenue, 197);

  const wa = mapRowToWhatsappWidget({
    id: 'wa1',
    owner_id: 'u1',
    name: 'Suporte',
    phone_number: '+5511999999999',
  });
  assert.equal(wa.position, 'bottom-right');

  const gw = mapRowToPaymentGateway({
    id: 'gw1',
    owner_id: 'u1',
    provider: 'mercadopago',
    display_name: 'MP',
  });
  assert.deepEqual(gw.supportedCurrencies, ['BRL']);

  const settings = mapRowToSettings({ owner_id: 'u1' });
  assert.equal(settings.autoDetectVisitorLang, true);
  assert.equal(settings.defaultVisitorLang, 'pt');
});
