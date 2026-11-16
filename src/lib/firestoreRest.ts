import firebaseConfig from '../../firebase-applet-config.json';
import { auth } from './firebase';

export type FirestoreRestValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreRestValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreRestValue> } };

export interface RestWriteDoc {
  path: string;
  data: Record<string, unknown>;
  serverTimestampFields?: string[];
  exists?: boolean;
}

export class FirestoreQuotaError extends Error {
  readonly code = 'resource-exhausted';
  constructor(message: string) {
    super(message);
    this.name = 'FirestoreQuotaError';
  }
}

export function isQuotaError(err: unknown): boolean {
  if (err instanceof FirestoreQuotaError) return true;
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('cota diária')
  );
}

export function toFirestoreValue(val: unknown): FirestoreRestValue {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { doubleValue: 0 };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
    const dt = (val as { toDate: () => Date }).toDate();
    return { timestampValue: dt.toISOString() };
  }
  if (Array.isArray(val)) {
    const values = val
      .filter((item) => item !== undefined)
      .map((item) => toFirestoreValue(item));
    return { arrayValue: values.length > 0 ? { values } : {} };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreRestValue> = {};
    Object.entries(val as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    });
    return { mapValue: Object.keys(fields).length > 0 ? { fields } : {} };
  }
  return { stringValue: String(val) };
}

export function buildCommitBody(
  docs: RestWriteDoc[],
  projectId: string = firebaseConfig.projectId,
  databaseId: string = firebaseConfig.firestoreDatabaseId
) {
  const docPrefix = `projects/${projectId}/databases/${databaseId}/documents`;
  const writes = docs.map((entry) => {
    const serverSet = new Set(entry.serverTimestampFields || []);
    const fields: Record<string, FirestoreRestValue> = {};

    Object.entries(entry.data).forEach(([k, v]) => {
      if (v !== undefined && !serverSet.has(k)) {
        fields[k] = toFirestoreValue(v);
      }
    });

    const writeObj: Record<string, unknown> = {
      update: {
        name: `${docPrefix}/${entry.path.replace(/^\/+/, '')}`,
        fields,
      },
    };

    if (serverSet.size > 0) {
      writeObj.updateTransforms = Array.from(serverSet).map((fieldPath) => ({
        fieldPath,
        setToServerValue: 'REQUEST_TIME',
      }));
    }

    if (typeof entry.exists === 'boolean') {
      writeObj.currentDocument = { exists: entry.exists };
      if (entry.exists === true) {
        writeObj.updateMask = {
          fieldPaths: Object.keys(fields),
        };
      }
    }

    return writeObj;
  });

  return { writes };
}

export function parseFirestoreRestError(status: number, bodyText: string): Error {
  let msg = bodyText;
  let statusCode = '';
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string; status?: string; code?: number };
    };
    if (parsed?.error?.message) msg = parsed.error.message;
    if (parsed?.error?.status) statusCode = parsed.error.status;
  } catch {
    // keep raw text
  }

  if (
    status === 429 ||
    statusCode === 'RESOURCE_EXHAUSTED' ||
    msg.includes('Quota exceeded') ||
    msg.includes('Quota limit exceeded')
  ) {
    return new FirestoreQuotaError(
      'Cota diária gratuita de gravações do Firestore atingida (Quota exceeded). A cota é reiniciada automaticamente amanhã.'
    );
  }
  if (status === 403 || statusCode === 'PERMISSION_DENIED') {
    return new Error(`Missing or insufficient permissions: ${msg}`);
  }
  if (status === 401 || statusCode === 'UNAUTHENTICATED') {
    return new Error('Sessão expirada. Saia e entre novamente com sua conta Google.');
  }
  return new Error(msg || `Firestore REST error (${status})`);
}

export async function commitDocsViaRest(docs: RestWriteDoc[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sessão Google não encontrada. Faça login novamente.');
  }
  const token = await user.getIdToken();
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:commit`;
  const body = buildCommitBody(docs);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw parseFirestoreRestError(res.status, errText);
    }
  } finally {
    clearTimeout(timer);
  }
}
