import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ExternalLink } from 'lucide-react';
import { db } from '../lib/firebase';
import { buildAffiliateRedirectUrl, sanitizeId } from '../lib/i18n';

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
        if (active) {
          setTargetUrl(url);
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
