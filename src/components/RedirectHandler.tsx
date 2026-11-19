import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ExternalLink } from 'lucide-react';
import { db } from '../lib/firebase';
import { GPC_TABLES, getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { buildAffiliateRedirectUrl, detectVisitorLanguage, sanitizeId } from '../lib/i18n';
import { recordVisitorEvent, waitWithTimeout } from '../lib/clickLogger';

interface RedirectHandlerProps {
  shortCode: string;
}

export const RedirectHandler: React.FC<RedirectHandlerProps> = ({ shortCode }) => {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [targetUrl, setTargetUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    async function resolve() {
      try {
        const rawCode = decodeURIComponent(shortCode || '').split('/')[0].trim();
        const cleanCode = sanitizeId(rawCode);

        if (isSupabaseConfigured) {
          const supabase = getSupabaseClient();
          let { data } = await supabase
            .from(GPC_TABLES.redirectLinks)
            .select('*')
            .eq('short_code', cleanCode)
            .eq('is_active', true)
            .maybeSingle();

          if (!data && cleanCode.toLowerCase() !== cleanCode) {
            const lowerRes = await supabase
              .from(GPC_TABLES.redirectLinks)
              .select('*')
              .eq('short_code', cleanCode.toLowerCase())
              .eq('is_active', true)
              .maybeSingle();
            data = lowerRes.data;
          }

          if (!data) {
            if (active) setStatus('error');
            return;
          }

          const url = buildAffiliateRedirectUrl(
            String(data.destination_url || ''),
            {
              utm_source: data.utm_source ? String(data.utm_source) : undefined,
              utm_medium: data.utm_medium ? String(data.utm_medium) : undefined,
              utm_campaign: data.utm_campaign ? String(data.utm_campaign) : undefined,
            },
            window.location.search
          );

          const resolvedCode = String(data.short_code || cleanCode);
          if (active) setTargetUrl(url);

          await waitWithTimeout(
            recordVisitorEvent({
              ownerId: String(data.owner_id || ''),
              pageId: String(data.link_id || ''),
              publicKey: `go_${resolvedCode}`,
              productId: data.product_id ? String(data.product_id) : '',
              eventType: 'affiliate_click',
              variant: 'A',
              language: detectVisitorLanguage('pt'),
              defaultUtmSource: data.utm_source ? String(data.utm_source) : undefined,
              defaultUtmMedium: data.utm_medium ? String(data.utm_medium) : undefined,
              defaultUtmCampaign: data.utm_campaign ? String(data.utm_campaign) : undefined,
              clickedElement: 'redirect_link',
              clickedLabel: `/go/${resolvedCode}`,
              clickedUrl: url,
              pageTitle: `Link /go/${resolvedCode}`,
              pageSlug: `go/${resolvedCode}`,
              awaitGeoMs: 350,
            }),
            500
          );

          if (active) {
            window.location.replace(url);
          }
          return;
        }

        let snap = await getDoc(doc(db, 'redirectLinks', cleanCode));
        if (!snap.exists() && cleanCode.toLowerCase() !== cleanCode) {
          snap = await getDoc(doc(db, 'redirectLinks', cleanCode.toLowerCase()));
        }
        if (!snap.exists() || snap.data()?.isActive !== true) {
          if (active) setStatus('error');
          return;
        }
        const data = snap.data();
        const url = buildAffiliateRedirectUrl(
          data.destinationUrl,
          {
            utm_source: data.utmSource,
            utm_medium: data.utmMedium,
            utm_campaign: data.utmCampaign,
          },
          window.location.search
        );
        const resolvedCode = String(data.shortCode || cleanCode);
        if (active) setTargetUrl(url);

        await waitWithTimeout(
          recordVisitorEvent({
            ownerId: String(data.ownerId || ''),
            pageId: String(data.linkId || ''),
            publicKey: `go_${resolvedCode}`,
            productId: data.productId ? String(data.productId) : '',
            eventType: 'affiliate_click',
            variant: 'A',
            language: detectVisitorLanguage('pt'),
            defaultUtmSource: data.utmSource,
            defaultUtmMedium: data.utmMedium,
            defaultUtmCampaign: data.utmCampaign,
            clickedElement: 'redirect_link',
            clickedLabel: `/go/${resolvedCode}`,
            clickedUrl: url,
            pageTitle: `Link /go/${resolvedCode}`,
            pageSlug: `go/${resolvedCode}`,
            awaitGeoMs: 350,
          }),
          500
        );

        if (active) {
          window.location.replace(url);
        }
      } catch {
        if (active) setStatus('error');
      }
    }
    resolve();
    return () => {
      active = false;
    };
  }, [shortCode]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <h1 className="font-display font-bold text-lg text-slate-900">
            Link de afiliado indisponível
          </h1>
          <p className="text-sm text-slate-600">
            Este link rastreável (/go/{shortCode}) não está ativo ou foi removido.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg"
          >
            Voltar ao Painel
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
        <p className="text-sm font-medium text-slate-700">
          Redirecionando com segurança para a oferta oficial...
        </p>
        {targetUrl && (
          <a
            href={targetUrl}
            className="inline-flex items-center gap-2 text-xs text-blue-600 hover:underline"
          >
            <span>Clique aqui caso o redirecionamento automático não inicie</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
