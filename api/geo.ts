interface GeoRequest {
  headers: Record<string, string | string[] | undefined>;
}

interface GeoResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (payload: Record<string, string>) => void;
  };
}

function readHeader(headers: GeoRequest['headers'], key: string): string {
  const raw = headers[key] ?? headers[key.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || '';
  return typeof raw === 'string' ? raw : '';
}

function safeDecode(value: string): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export default function handler(req: GeoRequest, res: GeoResponse) {
  const country = safeDecode(
    readHeader(req.headers, 'x-vercel-ip-country') ||
      readHeader(req.headers, 'cf-ipcountry')
  ).toUpperCase();
  const region = safeDecode(readHeader(req.headers, 'x-vercel-ip-country-region'));
  const city = safeDecode(readHeader(req.headers, 'x-vercel-ip-city'));
  const timezone = safeDecode(readHeader(req.headers, 'x-vercel-ip-timezone'));

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    country,
    region,
    city,
    timezone,
  });
}
