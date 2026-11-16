import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  commitDocsViaRest,
  FirestoreQuotaError,
  isQuotaError,
  RestWriteDoc,
} from '../lib/firestoreRest';
import { GPC_TABLES, getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  mapRowToAffiliateLink,
  mapRowToCampaign,
  mapRowToCategory,
  mapRowToClickEvent,
  mapRowToPage,
  mapRowToPageVersion,
  mapRowToPaymentGateway,
  mapRowToProduct,
  mapRowToSettings,
  mapRowToUserTemplate,
  mapRowToWhatsappWidget,
} from '../lib/supabaseMappers';
import { BUILTIN_TEMPLATES } from '../lib/templates';
import { sanitizeId, slugify } from '../lib/i18n';
import {
  AffiliateLink,
  Campaign,
  Category,
  ClickEvent,
  PageItem,
  PageVersion,
  PaymentGateway,
  Product,
  UserTemplate,
  UserWorkspaceSettings,
  WhatsappWidget,
} from '../types';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function commitSdkOrRest(
  sdkPromise: Promise<unknown>,
  restDocs: RestWriteDoc[],
  timeoutMs: number = 5500
): Promise<void> {
  try {
    await withTimeout(sdkPromise, timeoutMs, '__REST_FALLBACK__');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err || '');
    if (
      msg === '__REST_FALLBACK__' ||
      isQuotaError(err) ||
      msg.toLowerCase().includes('network') ||
      msg.toLowerCase().includes('unavailable') ||
      msg.toLowerCase().includes('deadline')
    ) {
      await commitDocsViaRest(restDocs);
      return;
    }
    throw err;
  }
}

function handleWriteError(err: unknown, op: OperationType, path: string): never {
  if (isQuotaError(err)) {
    const quotaErr =
      err instanceof FirestoreQuotaError
        ? err
        : new FirestoreQuotaError(
            'Cota diária gratuita de gravações do Firestore atingida (Quota exceeded). A cota é reiniciada automaticamente amanhã.'
          );
    console.error('Firestore Quota Exceeded:', path, quotaErr.message);
    throw quotaErr;
  }
  handleFirestoreError(err, op, path);
}

function throwSupabaseError(err: unknown, context: string): never {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err || 'Erro desconhecido no banco de dados');
  console.error(`Supabase error (${context}):`, err);
  throw new Error(msg);
}

export function useWorkspaceData(uid: string | undefined) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clickEvents, setClickEvents] = useState<ClickEvent[]>([]);
  const [whatsappWidgets, setWhatsappWidgets] = useState<WhatsappWidget[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [settings, setSettings] = useState<UserWorkspaceSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setCategories([]);
      setProducts([]);
      setAffiliateLinks([]);
      setPages([]);
      setUserTemplates([]);
      setCampaigns([]);
      setClickEvents([]);
      setWhatsappWidgets([]);
      setPaymentGateways([]);
      setSettings(null);
      setDataLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      let active = true;
      const supabase = getSupabaseClient();
      setDataLoading(true);

      async function loadAllSupabase() {
        try {
          const [
            catRes,
            prodRes,
            linkRes,
            pageRes,
            tplRes,
            cmpRes,
            evtRes,
            waRes,
            gwRes,
            setRes,
          ] = await Promise.all([
            supabase.from(GPC_TABLES.categories).select('*').eq('owner_id', uid),
            supabase.from(GPC_TABLES.products).select('*').eq('owner_id', uid),
            supabase.from(GPC_TABLES.affiliateLinks).select('*').eq('owner_id', uid),
            supabase.from(GPC_TABLES.pages).select('*').eq('owner_id', uid),
            supabase.from(GPC_TABLES.userTemplates).select('*').eq('owner_id', uid),
            supabase.from(GPC_TABLES.campaigns).select('*').eq('owner_id', uid),
            supabase
              .from(GPC_TABLES.clickEvents)
              .select('*')
              .eq('owner_id', uid)
              .order('created_at', { ascending: false })
              .limit(1000),
            supabase.from(GPC_TABLES.whatsappWidgets).select('*').eq('owner_id', uid),
            supabase.from(GPC_TABLES.paymentGateways).select('*').eq('owner_id', uid),
            supabase.from(GPC_TABLES.userSettings).select('*').eq('owner_id', uid).maybeSingle(),
          ]);

          if (!active) return;

          setCategories((catRes.data || []).map((r) => mapRowToCategory(r as Record<string, unknown>)));
          setProducts((prodRes.data || []).map((r) => mapRowToProduct(r as Record<string, unknown>)));
          setAffiliateLinks(
            (linkRes.data || []).map((r) => mapRowToAffiliateLink(r as Record<string, unknown>))
          );
          setPages((pageRes.data || []).map((r) => mapRowToPage(r as Record<string, unknown>)));
          setUserTemplates(
            (tplRes.data || []).map((r) => mapRowToUserTemplate(r as Record<string, unknown>))
          );
          setCampaigns((cmpRes.data || []).map((r) => mapRowToCampaign(r as Record<string, unknown>)));
          setClickEvents((evtRes.data || []).map((r) => mapRowToClickEvent(r as Record<string, unknown>)));
          setWhatsappWidgets(
            (waRes.data || []).map((r) => mapRowToWhatsappWidget(r as Record<string, unknown>))
          );
          setPaymentGateways(
            (gwRes.data || []).map((r) => mapRowToPaymentGateway(r as Record<string, unknown>))
          );
          if (setRes.data) {
            setSettings(mapRowToSettings(setRes.data as Record<string, unknown>));
          }
        } catch (err) {
          console.error('Supabase initial workspace load error:', err);
        } finally {
          if (active) setDataLoading(false);
        }
      }

      loadAllSupabase();

      const channel = supabase
        .channel(`gpc_events_${uid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: GPC_TABLES.clickEvents,
            filter: `owner_id=eq.${uid}`,
          },
          (payload) => {
            if (!active || !payload.new) return;
            const mapped = mapRowToClickEvent(payload.new as Record<string, unknown>);
            setClickEvents((prev) => [mapped, ...prev.filter((e) => e.id !== mapped.id)]);
          }
        )
        .subscribe();

      return () => {
        active = false;
        supabase.removeChannel(channel);
      };
    }

    setDataLoading(true);
    const safeUid = sanitizeId(uid);

    const unsubs: Array<() => void> = [];

    const subscribeCollection = <T extends { id: string }>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const q = query(collection(db, colName), where('ownerId', '==', uid));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as T);
          setter(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, colName)
      );
      unsubs.push(unsub);
    };

    subscribeCollection<Category>('categories', setCategories);
    subscribeCollection<Product>('products', setProducts);
    subscribeCollection<AffiliateLink>('affiliateLinks', setAffiliateLinks);
    subscribeCollection<PageItem>('pages', setPages);
    subscribeCollection<UserTemplate>('userTemplates', setUserTemplates);
    subscribeCollection<Campaign>('campaigns', setCampaigns);
    subscribeCollection<ClickEvent>('clickEvents', setClickEvents);
    subscribeCollection<WhatsappWidget>('whatsappWidgets', setWhatsappWidgets);
    subscribeCollection<PaymentGateway>('paymentGateways', setPaymentGateways);

    const settingsUnsub = onSnapshot(
      doc(db, 'userSettings', safeUid),
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as UserWorkspaceSettings);
        }
        setDataLoading(false);
      },
      (err) => {
        setDataLoading(false);
        handleFirestoreError(err, OperationType.GET, `userSettings/${safeUid}`);
      }
    );
    unsubs.push(settingsUnsub);

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [uid]);

  const createCategory = useCallback(
    async (input: { name: string; description?: string; color?: string }) => {
      if (!uid) return '';
      const id = makeId('cat');
      const slug = slugify(input.name);
      const baseData = {
        ownerId: uid,
        name: input.name.trim().slice(0, 80),
        slug,
        description: (input.description || '').trim().slice(0, 300),
        color: input.color || '#2563EB',
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.categories)
          .insert({
            id,
            owner_id: uid,
            name: baseData.name,
            slug: baseData.slug,
            description: baseData.description,
            color: baseData.color,
          })
          .select()
          .single();
        if (error) throwSupabaseError(error, 'createCategory');
        if (data) {
          setCategories((prev) => [...prev, mapRowToCategory(data as Record<string, unknown>)]);
        }
        return id;
      }

      try {
        await commitSdkOrRest(
          setDoc(doc(db, 'categories', id), {
            ...baseData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          [
            {
              path: `categories/${id}`,
              data: baseData,
              serverTimestampFields: ['createdAt', 'updatedAt'],
              exists: false,
            },
          ]
        );
        return id;
      } catch (err) {
        handleWriteError(err, OperationType.CREATE, `categories/${id}`);
      }
    },
    [uid]
  );

  const updateCategory = useCallback(
    async (id: string, input: { name: string; description?: string; color?: string }) => {
      if (!uid) return;
      const baseData = {
        name: input.name.trim().slice(0, 80),
        slug: slugify(input.name),
        description: (input.description || '').trim().slice(0, 300),
        color: input.color || '#2563EB',
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.categories)
          .update(baseData)
          .eq('id', id)
          .eq('owner_id', uid)
          .select()
          .single();
        if (error) throwSupabaseError(error, 'updateCategory');
        if (data) {
          const mapped = mapRowToCategory(data as Record<string, unknown>);
          setCategories((prev) => prev.map((c) => (c.id === id ? mapped : c)));
        }
        return;
      }

      try {
        await commitSdkOrRest(
          updateDoc(doc(db, 'categories', id), {
            ...baseData,
            updatedAt: serverTimestamp(),
          }),
          [
            {
              path: `categories/${id}`,
              data: baseData,
              serverTimestampFields: ['updatedAt'],
              exists: true,
            },
          ]
        );
      } catch (err) {
        handleWriteError(err, OperationType.UPDATE, `categories/${id}`);
      }
    },
    [uid]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (isSupabaseConfigured) {
        const { error } = await getSupabaseClient()
          .from(GPC_TABLES.categories)
          .delete()
          .eq('id', id);
        if (error) throwSupabaseError(error, 'deleteCategory');
        setCategories((prev) => prev.filter((c) => c.id !== id));
        return;
      }
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {
        handleWriteError(err, OperationType.DELETE, `categories/${id}`);
      }
    },
    []
  );

  const createProduct = useCallback(
    async (input: Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
      if (!uid) return '';
      const id = makeId('prod');
      const allowedLang = ['pt', 'en', 'es', 'auto'].includes(input.language) ? input.language : 'pt';
      const allowedCurrency = ['BRL', 'USD', 'EUR', 'GBP'].includes(input.currency) ? input.currency : 'BRL';
      const allowedStatus = ['active', 'paused', 'archived'].includes(input.status) ? input.status : 'active';
      const baseData = {
        ownerId: uid,
        name: input.name.trim().slice(0, 140),
        description: (input.description || '').slice(0, 2000),
        imageUrl: (input.imageUrl || '').slice(0, 1000),
        categoryId: (input.categoryId || '').slice(0, 128),
        originCountry: (input.originCountry || input.country || 'BR').slice(0, 10),
        country: (input.country || 'BR').slice(0, 10),
        language: allowedLang,
        network: (input.network || 'Hotmart').slice(0, 80),
        affiliateUrl: input.affiliateUrl.trim().slice(0, 2000),
        price: Math.max(0, Number(input.price) || 0),
        currency: allowedCurrency,
        commissionRate: Number(input.commissionRate) || 0,
        producerEmail: (input.producerEmail || '').slice(0, 200),
        status: allowedStatus,
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.products)
          .insert({
            id,
            owner_id: uid,
            name: baseData.name,
            description: baseData.description,
            image_url: baseData.imageUrl,
            category_id: baseData.categoryId,
            origin_country: baseData.originCountry,
            country: baseData.country,
            language: baseData.language,
            network: baseData.network,
            affiliate_url: baseData.affiliateUrl,
            price: baseData.price,
            currency: baseData.currency,
            commission_rate: baseData.commissionRate,
            producer_email: baseData.producerEmail,
            status: baseData.status,
          })
          .select()
          .single();
        if (error) throwSupabaseError(error, 'createProduct');
        if (data) {
          setProducts((prev) => [...prev, mapRowToProduct(data as Record<string, unknown>)]);
        }
        return id;
      }

      try {
        await commitSdkOrRest(
          setDoc(doc(db, 'products', id), {
            ...baseData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          [
            {
              path: `products/${id}`,
              data: baseData,
              serverTimestampFields: ['createdAt', 'updatedAt'],
              exists: false,
            },
          ]
        );
        return id;
      } catch (err) {
        handleWriteError(err, OperationType.CREATE, `products/${id}`);
      }
    },
    [uid]
  );

  const updateProduct = useCallback(
    async (id: string, input: Partial<Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>) => {
      if (isSupabaseConfigured) {
        const supaPayload: Record<string, unknown> = {};
        if (input.name !== undefined) supaPayload.name = input.name.trim().slice(0, 140);
        if (input.description !== undefined) supaPayload.description = input.description.slice(0, 2000);
        if (input.imageUrl !== undefined) supaPayload.image_url = input.imageUrl.slice(0, 1000);
        if (input.categoryId !== undefined) supaPayload.category_id = input.categoryId.slice(0, 128);
        if (input.originCountry !== undefined) supaPayload.origin_country = input.originCountry.slice(0, 10);
        if (input.country !== undefined) supaPayload.country = input.country.slice(0, 10);
        if (input.language !== undefined) supaPayload.language = input.language;
        if (input.network !== undefined) supaPayload.network = input.network.slice(0, 80);
        if (input.affiliateUrl !== undefined) supaPayload.affiliate_url = input.affiliateUrl.trim().slice(0, 2000);
        if (input.price !== undefined) supaPayload.price = Math.max(0, Number(input.price) || 0);
        if (input.currency !== undefined) supaPayload.currency = input.currency;
        if (input.commissionRate !== undefined) supaPayload.commission_rate = Number(input.commissionRate) || 0;
        if (input.producerEmail !== undefined) supaPayload.producer_email = input.producerEmail.slice(0, 200);
        if (input.status !== undefined) supaPayload.status = input.status;

        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.products)
          .update(supaPayload)
          .eq('id', id)
          .select()
          .single();
        if (error) throwSupabaseError(error, 'updateProduct');
        if (data) {
          const mapped = mapRowToProduct(data as Record<string, unknown>);
          setProducts((prev) => prev.map((p) => (p.id === id ? mapped : p)));
        }
        return;
      }

      const restPayload: Record<string, unknown> = {};
      if (input.name !== undefined) restPayload.name = input.name.trim().slice(0, 140);
      if (input.description !== undefined) restPayload.description = input.description.slice(0, 2000);
      if (input.imageUrl !== undefined) restPayload.imageUrl = input.imageUrl.slice(0, 1000);
      if (input.categoryId !== undefined) restPayload.categoryId = input.categoryId.slice(0, 128);
      if (input.originCountry !== undefined) restPayload.originCountry = input.originCountry.slice(0, 10);
      if (input.country !== undefined) restPayload.country = input.country.slice(0, 10);
      if (input.language !== undefined) restPayload.language = input.language;
      if (input.network !== undefined) restPayload.network = input.network.slice(0, 80);
      if (input.affiliateUrl !== undefined) restPayload.affiliateUrl = input.affiliateUrl.trim().slice(0, 2000);
      if (input.price !== undefined) restPayload.price = Math.max(0, Number(input.price) || 0);
      if (input.currency !== undefined) restPayload.currency = input.currency;
      if (input.commissionRate !== undefined) restPayload.commissionRate = Number(input.commissionRate) || 0;
      if (input.producerEmail !== undefined) restPayload.producerEmail = input.producerEmail.slice(0, 200);
      if (input.status !== undefined) restPayload.status = input.status;
      try {
        await commitSdkOrRest(
          updateDoc(doc(db, 'products', id), {
            ...restPayload,
            updatedAt: serverTimestamp(),
          }),
          [
            {
              path: `products/${id}`,
              data: restPayload,
              serverTimestampFields: ['updatedAt'],
              exists: true,
            },
          ]
        );
      } catch (err) {
        handleWriteError(err, OperationType.UPDATE, `products/${id}`);
      }
    },
    []
  );

  const deleteProduct = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient().from(GPC_TABLES.products).delete().eq('id', id);
      if (error) throwSupabaseError(error, 'deleteProduct');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleWriteError(err, OperationType.DELETE, `products/${id}`);
    }
  }, []);

  const saveAffiliateLink = useCallback(
    async (
      input: Omit<AffiliateLink, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('link');
      const cleanCode = sanitizeId(input.shortCode || slugify(input.label)).slice(0, 64) || makeId('go');

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        const linkRow = {
          id,
          owner_id: uid,
          product_id: (input.productId || '').slice(0, 128),
          label: input.label.trim().slice(0, 120),
          short_code: cleanCode,
          destination_url: input.destinationUrl.trim().slice(0, 2000),
          alternative_urls: (input.alternativeUrls || []).slice(0, 10),
          country: (input.country || 'BR').slice(0, 10),
          network: (input.network || 'Hotmart').slice(0, 80),
          affiliate_tag: (input.affiliateTag || '').slice(0, 120),
          utm_source: (input.utmSource || '').slice(0, 100),
          utm_medium: (input.utmMedium || '').slice(0, 100),
          utm_campaign: (input.utmCampaign || '').slice(0, 100),
          button_text: (input.buttonText || '').slice(0, 80),
          is_primary: Boolean(input.isPrimary),
          is_active: Boolean(input.isActive),
        };
        const { data: savedLink, error: linkErr } = await supabase
          .from(GPC_TABLES.affiliateLinks)
          .upsert(linkRow, { onConflict: 'id' })
          .select()
          .single();
        if (linkErr) throwSupabaseError(linkErr, 'saveAffiliateLink');

        const { error: redirErr } = await supabase
          .from(GPC_TABLES.redirectLinks)
          .upsert(
            {
              short_code: cleanCode,
              owner_id: uid,
              link_id: id,
              product_id: linkRow.product_id,
              destination_url: linkRow.destination_url,
              utm_source: linkRow.utm_source,
              utm_medium: linkRow.utm_medium,
              utm_campaign: linkRow.utm_campaign,
              is_active: linkRow.is_active,
            },
            { onConflict: 'short_code' }
          );
        if (redirErr) throwSupabaseError(redirErr, 'saveRedirectLink');

        if (savedLink) {
          const mapped = mapRowToAffiliateLink(savedLink as Record<string, unknown>);
          setAffiliateLinks((prev) =>
            existingId ? prev.map((l) => (l.id === id ? mapped : l)) : [...prev, mapped]
          );
        }
        return id;
      }

      try {
        const linkRef = doc(db, 'affiliateLinks', id);
        const redirectRef = doc(db, 'redirectLinks', cleanCode);
        const existingRedirectSnap = await withTimeout(
          getDoc(redirectRef),
          6000,
          'Tempo esgotado ao verificar código de redirecionamento.'
        );
        const redirectExists = existingRedirectSnap.exists();

        const batch = writeBatch(db);
        const linkPlain = {
          productId: (input.productId || '').slice(0, 128),
          label: input.label.trim().slice(0, 120),
          shortCode: cleanCode,
          destinationUrl: input.destinationUrl.trim().slice(0, 2000),
          alternativeUrls: (input.alternativeUrls || []).slice(0, 10),
          country: (input.country || 'BR').slice(0, 10),
          network: (input.network || 'Hotmart').slice(0, 80),
          affiliateTag: (input.affiliateTag || '').slice(0, 120),
          utmSource: (input.utmSource || '').slice(0, 100),
          utmMedium: (input.utmMedium || '').slice(0, 100),
          utmCampaign: (input.utmCampaign || '').slice(0, 100),
          buttonText: (input.buttonText || '').slice(0, 80),
          isPrimary: Boolean(input.isPrimary),
          isActive: Boolean(input.isActive),
        };

        if (existingId) {
          batch.update(linkRef, { ...linkPlain, updatedAt: serverTimestamp() });
        } else {
          batch.set(linkRef, {
            ownerId: uid,
            ...linkPlain,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const redirectPlain = {
          linkId: id,
          productId: (input.productId || '').slice(0, 128),
          shortCode: cleanCode,
          destinationUrl: input.destinationUrl.trim().slice(0, 2000),
          utmSource: (input.utmSource || '').slice(0, 100),
          utmMedium: (input.utmMedium || '').slice(0, 100),
          utmCampaign: (input.utmCampaign || '').slice(0, 100),
          isActive: Boolean(input.isActive),
        };

        if (redirectExists) {
          batch.update(redirectRef, { ...redirectPlain, updatedAt: serverTimestamp() });
        } else {
          batch.set(redirectRef, {
            ownerId: uid,
            ...redirectPlain,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const restDocs: RestWriteDoc[] = [
          {
            path: `affiliateLinks/${id}`,
            data: existingId ? linkPlain : { ownerId: uid, ...linkPlain },
            serverTimestampFields: existingId ? ['updatedAt'] : ['createdAt', 'updatedAt'],
            exists: Boolean(existingId),
          },
          {
            path: `redirectLinks/${cleanCode}`,
            data: redirectExists ? redirectPlain : { ownerId: uid, ...redirectPlain },
            serverTimestampFields: redirectExists ? ['updatedAt'] : ['createdAt', 'updatedAt'],
            exists: redirectExists,
          },
        ];

        await commitSdkOrRest(batch.commit(), restDocs);
        return id;
      } catch (err) {
        handleWriteError(err, OperationType.WRITE, `affiliateLinks/${id}`);
      }
    },
    [uid]
  );

  const deleteAffiliateLink = useCallback(async (link: AffiliateLink) => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from(GPC_TABLES.affiliateLinks).delete().eq('id', link.id);
      if (error) throwSupabaseError(error, 'deleteAffiliateLink');
      if (link.shortCode) {
        await supabase
          .from(GPC_TABLES.redirectLinks)
          .delete()
          .eq('short_code', sanitizeId(link.shortCode));
      }
      setAffiliateLinks((prev) => prev.filter((l) => l.id !== link.id));
      return;
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, 'affiliateLinks', link.id));
    if (link.shortCode) {
      batch.delete(doc(db, 'redirectLinks', sanitizeId(link.shortCode)));
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `affiliateLinks/${link.id}`);
    }
  }, []);

  const savePage = useCallback(
    async (
      pageInput: Omit<PageItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingPage?: PageItem,
      publishNow?: boolean,
      versionNote?: string
    ): Promise<string> => {
      if (!uid) return '';
      const pageId = existingPage?.id || makeId('page');
      const cleanSlug = slugify(pageInput.slug || pageInput.title);
      const publicKey =
        existingPage?.publicKey ||
        sanitizeId(`${cleanSlug}_${uid.slice(0, 6)}_${pageId.slice(-5)}`);
      const nextStatus = publishNow ? 'published' : pageInput.status || 'draft';

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        const existingPublishedAt =
          existingPage?.publishedAt && typeof existingPage.publishedAt.toDate === 'function'
            ? existingPage.publishedAt.toDate().toISOString()
            : null;
        const publishedAtIso =
          nextStatus === 'published'
            ? existingPublishedAt || new Date().toISOString()
            : existingPublishedAt;

        const pageRow = {
          id: pageId,
          owner_id: uid,
          parent_page_id: (pageInput.parentPageId || '').slice(0, 128),
          product_id: (pageInput.productId || '').slice(0, 128),
          category_id: (pageInput.categoryId || '').slice(0, 128),
          template_id: (pageInput.templateId || '').slice(0, 128),
          title: pageInput.title.trim().slice(0, 160),
          slug: cleanSlug,
          page_kind: pageInput.pageKind,
          presell_type: pageInput.presellType,
          funnel_stage: pageInput.funnelStage,
          language: pageInput.language,
          origin_country: (pageInput.originCountry || 'BR').slice(0, 10),
          target_country: (pageInput.targetCountry || 'BR').slice(0, 10),
          affiliate_link_id: (pageInput.affiliateLinkId || '').slice(0, 128),
          affiliate_url: (pageInput.affiliateUrl || '').slice(0, 2000),
          policy_email_mode: pageInput.policyEmailMode || 'producer',
          policy_email: (pageInput.policyEmail || '').slice(0, 200),
          ghost_mode: Boolean(pageInput.ghostMode),
          status: nextStatus,
          sort_order: pageInput.sortOrder ?? 0,
          public_key: publicKey,
          blocks: (pageInput.blocks || []).slice(0, 60),
          theme: pageInput.theme,
          seo: pageInput.seo,
          tracking: pageInput.tracking,
          whatsapp: pageInput.whatsapp || { enabled: false },
          payment_config: pageInput.paymentConfig || { enabled: false },
          ab_test: pageInput.abTest || { enabled: false, splitPercent: 50 },
          translations: pageInput.translations || {},
          published_at: publishedAtIso,
        };

        const { data: savedPage, error: pageErr } = await supabase
          .from(GPC_TABLES.pages)
          .upsert(pageRow, { onConflict: 'id' })
          .select()
          .single();
        if (pageErr) throwSupabaseError(pageErr, 'savePage');

        if (nextStatus === 'published' || existingPage?.status === 'published' || existingPage?.publishedAt) {
          const pubStatus: 'published' | 'unpublished' =
            nextStatus === 'published' ? 'published' : 'unpublished';
          const { error: pubErr } = await supabase
            .from(GPC_TABLES.publishedPages)
            .upsert(
              {
                public_key: publicKey,
                owner_id: uid,
                page_id: pageId,
                product_id: pageRow.product_id,
                slug: cleanSlug,
                title: pageRow.title,
                page_kind: pageRow.page_kind,
                presell_type: pageRow.presell_type,
                funnel_stage: pageRow.funnel_stage,
                language: pageRow.language,
                origin_country: pageRow.origin_country,
                target_country: pageRow.target_country,
                affiliate_url: pageRow.affiliate_url,
                policy_email: pageRow.policy_email,
                ghost_mode: pageRow.ghost_mode,
                status: pubStatus,
                blocks: pageRow.blocks,
                theme: pageRow.theme,
                seo: pageRow.seo,
                tracking: pageRow.tracking,
                whatsapp: pageRow.whatsapp,
                payment_config: pageRow.payment_config,
                ab_test: pageRow.ab_test,
                translations: pageRow.translations,
              },
              { onConflict: 'public_key' }
            );
          if (pubErr) throwSupabaseError(pubErr, 'savePublishedPage');
        }

        if (existingPage) {
          await supabase.from(GPC_TABLES.pageVersions).insert({
            id: makeId('ver'),
            owner_id: uid,
            page_id: pageId,
            version_number: Date.now(),
            note: (versionNote || (publishNow ? 'Publicação' : 'Salvamento')).slice(0, 200),
            snapshot: {
              title: pageRow.title,
              slug: pageRow.slug,
              blocks: pageRow.blocks,
              theme: pageRow.theme,
              abTest: pageRow.ab_test,
            },
          });
        }

        if (savedPage) {
          const mapped = mapRowToPage(savedPage as Record<string, unknown>);
          setPages((prev) =>
            existingPage ? prev.map((p) => (p.id === pageId ? mapped : p)) : [...prev, mapped]
          );
        }
        return pageId;
      }

      try {
        const pubRef = doc(db, 'publishedPages', publicKey);
        const existingPubSnap = existingPage?.publicKey
          ? await withTimeout(
              getDoc(pubRef),
              6000,
              'Tempo esgotado ao verificar página publicada.'
            )
          : null;
        const pubExists = Boolean(existingPubSnap?.exists());

        const batch = writeBatch(db);
        const pageRef = doc(db, 'pages', pageId);

        const pagePlain = {
          parentPageId: (pageInput.parentPageId || '').slice(0, 128),
          productId: (pageInput.productId || '').slice(0, 128),
          categoryId: (pageInput.categoryId || '').slice(0, 128),
          templateId: (pageInput.templateId || '').slice(0, 128),
          title: pageInput.title.trim().slice(0, 160),
          slug: cleanSlug,
          pageKind: pageInput.pageKind,
          presellType: pageInput.presellType,
          funnelStage: pageInput.funnelStage,
          language: pageInput.language,
          originCountry: (pageInput.originCountry || 'BR').slice(0, 10),
          targetCountry: (pageInput.targetCountry || 'BR').slice(0, 10),
          affiliateLinkId: (pageInput.affiliateLinkId || '').slice(0, 128),
          affiliateUrl: (pageInput.affiliateUrl || '').slice(0, 2000),
          policyEmailMode: pageInput.policyEmailMode || 'producer',
          policyEmail: (pageInput.policyEmail || '').slice(0, 200),
          ghostMode: Boolean(pageInput.ghostMode),
          status: nextStatus,
          sortOrder: pageInput.sortOrder ?? 0,
          publicKey,
          blocks: (pageInput.blocks || []).slice(0, 60),
          theme: pageInput.theme,
          seo: pageInput.seo,
          tracking: pageInput.tracking,
          whatsapp: pageInput.whatsapp || { enabled: false },
          paymentConfig: pageInput.paymentConfig || { enabled: false },
          abTest: pageInput.abTest || { enabled: false, splitPercent: 50 },
          translations: pageInput.translations || {},
          publishedAt:
            nextStatus === 'published'
              ? existingPage?.publishedAt || serverTimestamp()
              : existingPage?.publishedAt || null,
        };

        if (existingPage) {
          batch.update(pageRef, { ...pagePlain, updatedAt: serverTimestamp() });
        } else {
          batch.set(pageRef, {
            ownerId: uid,
            ...pagePlain,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const pageRestServerFields = ['updatedAt'];
        if (!existingPage) pageRestServerFields.push('createdAt');
        const needsServerPublishedAt = nextStatus === 'published' && !existingPage?.publishedAt;
        if (needsServerPublishedAt) pageRestServerFields.push('publishedAt');

        const restDocs: RestWriteDoc[] = [
          {
            path: `pages/${pageId}`,
            data: existingPage
              ? {
                  ...pagePlain,
                  publishedAt: needsServerPublishedAt ? undefined : existingPage?.publishedAt || null,
                }
              : {
                  ownerId: uid,
                  ...pagePlain,
                  publishedAt: needsServerPublishedAt ? undefined : null,
                },
            serverTimestampFields: pageRestServerFields,
            exists: Boolean(existingPage),
          },
        ];

        if (nextStatus === 'published' || pubExists) {
          const pubStatus: 'published' | 'unpublished' =
            nextStatus === 'published' ? 'published' : 'unpublished';
          const pubPlain = {
            pageId,
            productId: pagePlain.productId,
            publicKey,
            slug: cleanSlug,
            title: pagePlain.title,
            pageKind: pagePlain.pageKind,
            presellType: pagePlain.presellType,
            funnelStage: pagePlain.funnelStage,
            language: pagePlain.language,
            originCountry: pagePlain.originCountry,
            targetCountry: pagePlain.targetCountry,
            affiliateUrl: pagePlain.affiliateUrl,
            policyEmail: pagePlain.policyEmail,
            ghostMode: pagePlain.ghostMode,
            status: pubStatus,
            blocks: pagePlain.blocks,
            theme: pagePlain.theme,
            seo: pagePlain.seo,
            tracking: pagePlain.tracking,
            whatsapp: pagePlain.whatsapp,
            paymentConfig: pagePlain.paymentConfig,
            abTest: pagePlain.abTest,
            translations: pagePlain.translations,
          };

          if (pubExists) {
            batch.update(pubRef, { ...pubPlain, updatedAt: serverTimestamp() });
          } else {
            batch.set(pubRef, {
              ownerId: uid,
              ...pubPlain,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          restDocs.push({
            path: `publishedPages/${publicKey}`,
            data: pubExists ? pubPlain : { ownerId: uid, ...pubPlain },
            serverTimestampFields: pubExists ? ['updatedAt'] : ['createdAt', 'updatedAt'],
            exists: pubExists,
          });
        }

        if (existingPage) {
          const versionId = makeId('ver');
          const versionPlain = {
            ownerId: uid,
            pageId,
            versionNumber: Date.now(),
            note: (versionNote || (publishNow ? 'Publicação' : 'Salvamento')).slice(0, 200),
            snapshot: {
              title: pagePlain.title,
              slug: pagePlain.slug,
              blocks: pagePlain.blocks,
              theme: pagePlain.theme,
              abTest: pagePlain.abTest,
            },
          };
          batch.set(doc(db, 'pageVersions', versionId), {
            ...versionPlain,
            createdAt: serverTimestamp(),
          });
          restDocs.push({
            path: `pageVersions/${versionId}`,
            data: versionPlain,
            serverTimestampFields: ['createdAt'],
            exists: false,
          });
        }

        await commitSdkOrRest(batch.commit(), restDocs);
        return pageId;
      } catch (err) {
        handleWriteError(err, OperationType.WRITE, `pages/${pageId}`);
      }
    },
    [uid]
  );

  const togglePublishPage = useCallback(
    async (page: PageItem, shouldPublish: boolean) => {
      if (!uid) return;
      const publicKey =
        page.publicKey || sanitizeId(`${page.slug}_${uid.slice(0, 6)}_${page.id.slice(-5)}`);
      const nextStatus = shouldPublish ? 'published' : 'unpublished';

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        const existingPublishedAt =
          page.publishedAt && typeof page.publishedAt.toDate === 'function'
            ? page.publishedAt.toDate().toISOString()
            : null;
        const publishedAtIso = shouldPublish
          ? existingPublishedAt || new Date().toISOString()
          : existingPublishedAt;

        const { data: updatedPage, error: pageErr } = await supabase
          .from(GPC_TABLES.pages)
          .update({
            status: nextStatus,
            public_key: publicKey,
            published_at: publishedAtIso,
          })
          .eq('id', page.id)
          .select()
          .single();
        if (pageErr) throwSupabaseError(pageErr, 'togglePublishPage');

        const { error: pubErr } = await supabase
          .from(GPC_TABLES.publishedPages)
          .upsert(
            {
              public_key: publicKey,
              owner_id: uid,
              page_id: page.id,
              product_id: page.productId || '',
              slug: page.slug,
              title: page.title,
              page_kind: page.pageKind,
              presell_type: page.presellType,
              funnel_stage: page.funnelStage,
              language: page.language,
              origin_country: page.originCountry || 'BR',
              target_country: page.targetCountry || 'BR',
              affiliate_url: page.affiliateUrl || '',
              policy_email: page.policyEmail || '',
              ghost_mode: Boolean(page.ghostMode),
              status: nextStatus,
              blocks: page.blocks || [],
              theme: page.theme,
              seo: page.seo,
              tracking: page.tracking,
              whatsapp: page.whatsapp || { enabled: false },
              payment_config: page.paymentConfig || { enabled: false },
              ab_test: page.abTest || { enabled: false, splitPercent: 50 },
              translations: page.translations || {},
            },
            { onConflict: 'public_key' }
          );
        if (pubErr) throwSupabaseError(pubErr, 'togglePublishPage.publishedPages');

        if (updatedPage) {
          const mapped = mapRowToPage(updatedPage as Record<string, unknown>);
          setPages((prev) => prev.map((p) => (p.id === page.id ? mapped : p)));
        }
        return;
      }

      try {
        const pubRef = doc(db, 'publishedPages', publicKey);
        const existingPubSnap = page.publicKey
          ? await withTimeout(
              getDoc(pubRef),
              6000,
              'Tempo esgotado ao verificar página publicada.'
            )
          : null;
        const pubExists = Boolean(existingPubSnap?.exists());

        const batch = writeBatch(db);
        const needsServerPublishedAt = shouldPublish && !page.publishedAt;

        batch.update(doc(db, 'pages', page.id), {
          status: nextStatus,
          publicKey,
          publishedAt: shouldPublish ? page.publishedAt || serverTimestamp() : page.publishedAt || null,
          updatedAt: serverTimestamp(),
        });

        const pubPlain = {
          pageId: page.id,
          productId: page.productId || '',
          publicKey,
          slug: page.slug,
          title: page.title,
          pageKind: page.pageKind,
          presellType: page.presellType,
          funnelStage: page.funnelStage,
          language: page.language,
          originCountry: page.originCountry || 'BR',
          targetCountry: page.targetCountry || 'BR',
          affiliateUrl: page.affiliateUrl || '',
          policyEmail: page.policyEmail || '',
          ghostMode: Boolean(page.ghostMode),
          status: nextStatus,
          blocks: page.blocks || [],
          theme: page.theme,
          seo: page.seo,
          tracking: page.tracking,
          whatsapp: page.whatsapp || { enabled: false },
          paymentConfig: page.paymentConfig || { enabled: false },
          abTest: page.abTest || { enabled: false, splitPercent: 50 },
          translations: page.translations || {},
        };

        if (pubExists) {
          batch.update(pubRef, { ...pubPlain, updatedAt: serverTimestamp() });
        } else {
          batch.set(pubRef, {
            ownerId: uid,
            ...pubPlain,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        const restDocs: RestWriteDoc[] = [
          {
            path: `pages/${page.id}`,
            data: {
              status: nextStatus,
              publicKey,
              ...(needsServerPublishedAt ? {} : { publishedAt: page.publishedAt || null }),
            },
            serverTimestampFields: needsServerPublishedAt ? ['publishedAt', 'updatedAt'] : ['updatedAt'],
            exists: true,
          },
          {
            path: `publishedPages/${publicKey}`,
            data: pubExists ? pubPlain : { ownerId: uid, ...pubPlain },
            serverTimestampFields: pubExists ? ['updatedAt'] : ['createdAt', 'updatedAt'],
            exists: pubExists,
          },
        ];

        await commitSdkOrRest(batch.commit(), restDocs);
      } catch (err) {
        handleWriteError(err, OperationType.UPDATE, `pages/${page.id}`);
      }
    },
    [uid]
  );

  const duplicatePage = useCallback(
    async (page: PageItem) => {
      const nextSlug = `${page.slug}-copy-${Math.random().toString(36).slice(2, 5)}`;
      return savePage(
        {
          ...page,
          title: `${page.title} (Cópia)`.slice(0, 160),
          slug: nextSlug,
          status: 'draft',
          publicKey: undefined,
          publishedAt: null,
        },
        undefined,
        false,
        'Duplicação de página'
      );
    },
    [savePage]
  );

  const deletePage = useCallback(async (page: PageItem) => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from(GPC_TABLES.pages).delete().eq('id', page.id);
      if (error) throwSupabaseError(error, 'deletePage');
      if (page.publicKey) {
        await supabase.from(GPC_TABLES.publishedPages).delete().eq('public_key', page.publicKey);
      }
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      return;
    }

    const batch = writeBatch(db);
    batch.delete(doc(db, 'pages', page.id));
    if (page.publicKey) {
      batch.delete(doc(db, 'publishedPages', page.publicKey));
    }
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pages/${page.id}`);
    }
  }, []);

  const getPageVersions = useCallback(
    async (pageId: string): Promise<PageVersion[]> => {
      if (!uid) return [];
      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.pageVersions)
          .select('*')
          .eq('owner_id', uid)
          .eq('page_id', pageId)
          .order('version_number', { ascending: false });
        if (error) throwSupabaseError(error, 'getPageVersions');
        return (data || []).map((r) => mapRowToPageVersion(r as Record<string, unknown>));
      }
      try {
        const q = query(
          collection(db, 'pageVersions'),
          where('ownerId', '==', uid),
          where('pageId', '==', pageId)
        );
        const snap = await getDocs(q);
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as PageVersion)
          .sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'pageVersions');
      }
    },
    [uid]
  );

  const saveUserTemplate = useCallback(
    async (
      input: Omit<UserTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('tpl');
      const baseData = {
        name: input.name.slice(0, 120),
        presellType: input.presellType,
        description: (input.description || '').slice(0, 400),
        isFavorite: Boolean(input.isFavorite),
        blocks: input.blocks.slice(0, 60),
        theme: input.theme,
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.userTemplates)
          .upsert(
            {
              id,
              owner_id: uid,
              name: baseData.name,
              presell_type: baseData.presellType,
              description: baseData.description,
              is_favorite: baseData.isFavorite,
              blocks: baseData.blocks,
              theme: baseData.theme,
            },
            { onConflict: 'id' }
          )
          .select()
          .single();
        if (error) throwSupabaseError(error, 'saveUserTemplate');
        if (data) {
          const mapped = mapRowToUserTemplate(data as Record<string, unknown>);
          setUserTemplates((prev) =>
            existingId ? prev.map((t) => (t.id === id ? mapped : t)) : [...prev, mapped]
          );
        }
        return id;
      }

      try {
        if (existingId) {
          await commitSdkOrRest(
            updateDoc(doc(db, 'userTemplates', id), {
              ...baseData,
              updatedAt: serverTimestamp(),
            }),
            [
              {
                path: `userTemplates/${id}`,
                data: baseData,
                serverTimestampFields: ['updatedAt'],
                exists: true,
              },
            ]
          );
        } else {
          await commitSdkOrRest(
            setDoc(doc(db, 'userTemplates', id), {
              ownerId: uid,
              ...baseData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
            [
              {
                path: `userTemplates/${id}`,
                data: { ownerId: uid, ...baseData },
                serverTimestampFields: ['createdAt', 'updatedAt'],
                exists: false,
              },
            ]
          );
        }
        return id;
      } catch (err) {
        handleWriteError(err, OperationType.WRITE, `userTemplates/${id}`);
      }
    },
    [uid]
  );

  const deleteUserTemplate = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient()
        .from(GPC_TABLES.userTemplates)
        .delete()
        .eq('id', id);
      if (error) throwSupabaseError(error, 'deleteUserTemplate');
      setUserTemplates((prev) => prev.filter((t) => t.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'userTemplates', id));
    } catch (err) {
      handleWriteError(err, OperationType.DELETE, `userTemplates/${id}`);
    }
  }, []);

  const saveCampaign = useCallback(
    async (
      input: Omit<Campaign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('cmp');
      const baseData = {
        name: input.name.trim().slice(0, 120),
        platform: input.platform,
        pageId: (input.pageId || '').slice(0, 128),
        utmSource: (input.utmSource || '').slice(0, 100),
        utmMedium: (input.utmMedium || '').slice(0, 100),
        utmCampaign: (input.utmCampaign || '').slice(0, 100),
        targetCountry: (input.targetCountry || 'BR').slice(0, 10),
        dailyBudget: Math.max(0, Number(input.dailyBudget) || 0),
        currency: (input.currency || 'BRL').slice(0, 10),
        status: input.status || 'active',
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.campaigns)
          .upsert(
            {
              id,
              owner_id: uid,
              name: baseData.name,
              platform: baseData.platform,
              page_id: baseData.pageId,
              utm_source: baseData.utmSource,
              utm_medium: baseData.utmMedium,
              utm_campaign: baseData.utmCampaign,
              target_country: baseData.targetCountry,
              daily_budget: baseData.dailyBudget,
              currency: baseData.currency,
              status: baseData.status,
            },
            { onConflict: 'id' }
          )
          .select()
          .single();
        if (error) throwSupabaseError(error, 'saveCampaign');
        if (data) {
          const mapped = mapRowToCampaign(data as Record<string, unknown>);
          setCampaigns((prev) =>
            existingId ? prev.map((c) => (c.id === id ? mapped : c)) : [...prev, mapped]
          );
        }
        return id;
      }

      try {
        if (existingId) {
          await commitSdkOrRest(
            updateDoc(doc(db, 'campaigns', id), { ...baseData, updatedAt: serverTimestamp() }),
            [
              {
                path: `campaigns/${id}`,
                data: baseData,
                serverTimestampFields: ['updatedAt'],
                exists: true,
              },
            ]
          );
        } else {
          await commitSdkOrRest(
            setDoc(doc(db, 'campaigns', id), {
              ownerId: uid,
              ...baseData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
            [
              {
                path: `campaigns/${id}`,
                data: { ownerId: uid, ...baseData },
                serverTimestampFields: ['createdAt', 'updatedAt'],
                exists: false,
              },
            ]
          );
        }
        return id;
      } catch (err) {
        handleWriteError(err, OperationType.WRITE, `campaigns/${id}`);
      }
    },
    [uid]
  );

  const deleteCampaign = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient().from(GPC_TABLES.campaigns).delete().eq('id', id);
      if (error) throwSupabaseError(error, 'deleteCampaign');
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'campaigns', id));
    } catch (err) {
      handleWriteError(err, OperationType.DELETE, `campaigns/${id}`);
    }
  }, []);

  const saveWhatsappWidget = useCallback(
    async (
      input: Omit<WhatsappWidget, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('wa');
      const baseData = {
        name: input.name.trim().slice(0, 100),
        phoneNumber: input.phoneNumber.trim().slice(0, 30),
        prefilledMessage: (input.prefilledMessage || '').slice(0, 300),
        position: input.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
        buttonLabel: (input.buttonLabel || '').slice(0, 60),
        isActive: Boolean(input.isActive),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.whatsappWidgets)
          .upsert(
            {
              id,
              owner_id: uid,
              name: baseData.name,
              phone_number: baseData.phoneNumber,
              prefilled_message: baseData.prefilledMessage,
              position: baseData.position,
              button_label: baseData.buttonLabel,
              is_active: baseData.isActive,
            },
            { onConflict: 'id' }
          )
          .select()
          .single();
        if (error) throwSupabaseError(error, 'saveWhatsappWidget');
        if (data) {
          const mapped = mapRowToWhatsappWidget(data as Record<string, unknown>);
          setWhatsappWidgets((prev) =>
            existingId ? prev.map((w) => (w.id === id ? mapped : w)) : [...prev, mapped]
          );
        }
        return id;
      }

      try {
        if (existingId) {
          await commitSdkOrRest(
            updateDoc(doc(db, 'whatsappWidgets', id), { ...baseData, updatedAt: serverTimestamp() }),
            [
              {
                path: `whatsappWidgets/${id}`,
                data: baseData,
                serverTimestampFields: ['updatedAt'],
                exists: true,
              },
            ]
          );
        } else {
          await commitSdkOrRest(
            setDoc(doc(db, 'whatsappWidgets', id), {
              ownerId: uid,
              ...baseData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
            [
              {
                path: `whatsappWidgets/${id}`,
                data: { ownerId: uid, ...baseData },
                serverTimestampFields: ['createdAt', 'updatedAt'],
                exists: false,
              },
            ]
          );
        }
        return id;
      } catch (err) {
        handleWriteError(err, OperationType.WRITE, `whatsappWidgets/${id}`);
      }
    },
    [uid]
  );

  const deleteWhatsappWidget = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient()
        .from(GPC_TABLES.whatsappWidgets)
        .delete()
        .eq('id', id);
      if (error) throwSupabaseError(error, 'deleteWhatsappWidget');
      setWhatsappWidgets((prev) => prev.filter((w) => w.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'whatsappWidgets', id));
    } catch (err) {
      handleWriteError(err, OperationType.DELETE, `whatsappWidgets/${id}`);
    }
  }, []);

  const savePaymentGateway = useCallback(
    async (
      input: Omit<PaymentGateway, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('gw');
      const baseData = {
        provider: input.provider,
        displayName: input.displayName.trim().slice(0, 80),
        publicKeyOrAccount: (input.publicKeyOrAccount || '').slice(0, 200),
        checkoutBaseUrl: (input.checkoutBaseUrl || '').slice(0, 1000),
        pixKey: (input.pixKey || '').slice(0, 200),
        supportedCurrencies: (input.supportedCurrencies || ['BRL']).slice(0, 10),
        mode: input.mode === 'sandbox' ? 'sandbox' : 'live',
        isEnabled: Boolean(input.isEnabled),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.paymentGateways)
          .upsert(
            {
              id,
              owner_id: uid,
              provider: baseData.provider,
              display_name: baseData.displayName,
              public_key_or_account: baseData.publicKeyOrAccount,
              checkout_base_url: baseData.checkoutBaseUrl,
              pix_key: baseData.pixKey,
              supported_currencies: baseData.supportedCurrencies,
              mode: baseData.mode,
              is_enabled: baseData.isEnabled,
            },
            { onConflict: 'id' }
          )
          .select()
          .single();
        if (error) throwSupabaseError(error, 'savePaymentGateway');
        if (data) {
          const mapped = mapRowToPaymentGateway(data as Record<string, unknown>);
          setPaymentGateways((prev) =>
            existingId ? prev.map((g) => (g.id === id ? mapped : g)) : [...prev, mapped]
          );
        }
        return id;
      }

      try {
        if (existingId) {
          await commitSdkOrRest(
            updateDoc(doc(db, 'paymentGateways', id), { ...baseData, updatedAt: serverTimestamp() }),
            [
              {
                path: `paymentGateways/${id}`,
                data: baseData,
                serverTimestampFields: ['updatedAt'],
                exists: true,
              },
            ]
          );
        } else {
          await commitSdkOrRest(
            setDoc(doc(db, 'paymentGateways', id), {
              ownerId: uid,
              ...baseData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
            [
              {
                path: `paymentGateways/${id}`,
                data: { ownerId: uid, ...baseData },
                serverTimestampFields: ['createdAt', 'updatedAt'],
                exists: false,
              },
            ]
          );
        }
        return id;
      } catch (err) {
        handleWriteError(err, OperationType.WRITE, `paymentGateways/${id}`);
      }
    },
    [uid]
  );

  const deletePaymentGateway = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      const { error } = await getSupabaseClient()
        .from(GPC_TABLES.paymentGateways)
        .delete()
        .eq('id', id);
      if (error) throwSupabaseError(error, 'deletePaymentGateway');
      setPaymentGateways((prev) => prev.filter((g) => g.id !== id));
      return;
    }
    try {
      await deleteDoc(doc(db, 'paymentGateways', id));
    } catch (err) {
      handleWriteError(err, OperationType.DELETE, `paymentGateways/${id}`);
    }
  }, []);

  const updateWorkspaceSettings = useCallback(
    async (patch: Partial<UserWorkspaceSettings>) => {
      if (!uid) return;
      const safeUid = sanitizeId(uid);
      const merged = { ...settings, ...patch };
      const allowedPayload = {
        ownerId: uid,
        ga4MeasurementId: (merged.ga4MeasurementId || '').slice(0, 60),
        gtmContainerId: (merged.gtmContainerId || '').slice(0, 60),
        googleAdsId: (merged.googleAdsId || '').slice(0, 60),
        googleAdsConversionLabel: (merged.googleAdsConversionLabel || '').slice(0, 80),
        metaPixelId: (merged.metaPixelId || '').slice(0, 60),
        headScripts: (merged.headScripts || '').slice(0, 5000),
        bodyScripts: (merged.bodyScripts || '').slice(0, 5000),
        customDomain: (merged.customDomain || '').slice(0, 200),
        autoDetectVisitorLang: merged.autoDetectVisitorLang ?? true,
        defaultVisitorLang: ['pt', 'en', 'es'].includes(merged.defaultVisitorLang || '')
          ? merged.defaultVisitorLang
          : 'pt',
        preserveAffiliateParams: merged.preserveAffiliateParams ?? true,
        robotsIndexDefault: merged.robotsIndexDefault ?? true,
        cookieConsentTextPt: (merged.cookieConsentTextPt || '').slice(0, 500),
        cookieConsentTextEn: (merged.cookieConsentTextEn || '').slice(0, 500),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await getSupabaseClient()
          .from(GPC_TABLES.userSettings)
          .upsert(
            {
              owner_id: uid,
              ga4_measurement_id: allowedPayload.ga4MeasurementId,
              gtm_container_id: allowedPayload.gtmContainerId,
              google_ads_id: allowedPayload.googleAdsId,
              google_ads_conversion_label: allowedPayload.googleAdsConversionLabel,
              meta_pixel_id: allowedPayload.metaPixelId,
              head_scripts: allowedPayload.headScripts,
              body_scripts: allowedPayload.bodyScripts,
              custom_domain: allowedPayload.customDomain,
              auto_detect_visitor_lang: allowedPayload.autoDetectVisitorLang,
              default_visitor_lang: allowedPayload.defaultVisitorLang,
              preserve_affiliate_params: allowedPayload.preserveAffiliateParams,
              robots_index_default: allowedPayload.robotsIndexDefault,
              cookie_consent_text_pt: allowedPayload.cookieConsentTextPt,
              cookie_consent_text_en: allowedPayload.cookieConsentTextEn,
            },
            { onConflict: 'owner_id' }
          )
          .select()
          .single();
        if (error) throwSupabaseError(error, 'updateWorkspaceSettings');
        if (data) {
          setSettings(mapRowToSettings(data as Record<string, unknown>));
        }
        return;
      }

      try {
        await commitSdkOrRest(
          setDoc(
            doc(db, 'userSettings', safeUid),
            {
              ...allowedPayload,
              updatedAt: serverTimestamp(),
            },
            { merge: false }
          ),
          [
            {
              path: `userSettings/${safeUid}`,
              data: allowedPayload,
              serverTimestampFields: ['updatedAt'],
            },
          ]
        );
      } catch (err) {
        handleWriteError(err, OperationType.UPDATE, `userSettings/${safeUid}`);
      }
    },
    [uid, settings]
  );

  const bootstrapStarterCatalog = useCallback(async () => {
    if (!uid) return;
    const catHealthId = makeId('cat');
    const catTechId = makeId('cat');
    const prod1Id = makeId('prod');
    const prod2Id = makeId('prod');
    const prod3Id = makeId('prod');

    const catHealth = {
      ownerId: uid,
      name: 'Saúde & Skincare',
      slug: 'saude-skincare',
      description: 'Ofertas internacionais de bem-estar, nutracêuticos e cosméticos.',
      color: '#16A34A',
    };
    const catTech = {
      ownerId: uid,
      name: 'Tecnologia & Wearables',
      slug: 'tecnologia-wearables',
      description: 'Eletrônicos de alta demanda para campanhas globais.',
      color: '#2563EB',
    };
    const prod1 = {
      ownerId: uid,
      name: 'Lumina Botanical Serum',
      description: 'Sérum botânico concentrado de vitamina C e extratos naturais para renovação facial.',
      imageUrl: '/images/product_skincare_serum_1794756575954.jpg',
      categoryId: catHealthId,
      originCountry: 'BR',
      country: 'BR',
      language: 'pt',
      network: 'Hotmart',
      affiliateUrl: 'https://checkout.example.com/lumina-serum?aff=gpc01',
      price: 197,
      currency: 'BRL',
      commissionRate: 55,
      producerEmail: 'suporte@luminabotanical.com',
      status: 'active',
    };
    const prod2 = {
      ownerId: uid,
      name: 'Katori Biometric Watch Pro',
      description: 'Smartwatch biométrico com monitoramento contínuo e caixa em titânio escovado.',
      imageUrl: '/images/product_fitness_watch_1794756577239.jpg',
      categoryId: catTechId,
      originCountry: 'US',
      country: 'US',
      language: 'en',
      network: 'ClickBank',
      affiliateUrl: 'https://katoriwatch.example.com/offer?hop=globalpro',
      price: 149,
      currency: 'USD',
      commissionRate: 45,
      producerEmail: 'support@katoriwatch.com',
      status: 'active',
    };
    const prod3 = {
      ownerId: uid,
      name: 'VitalBotanics Pure 500mg',
      description: 'Suplemento herbal diário de alta biodisponibilidade em frasco âmbar protegido.',
      imageUrl: '/images/product_supplement_bottle_1794756576809.jpg',
      categoryId: catHealthId,
      originCountry: 'US',
      country: 'US',
      language: 'auto',
      network: 'BuyGoods',
      affiliateUrl: 'https://vitalbotanics.example.com/order?aff_id=gp2026',
      price: 69,
      currency: 'USD',
      commissionRate: 60,
      producerEmail: 'care@vitalbotanics.com',
      status: 'active',
    };

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      const { data: cats, error: catErr } = await supabase
        .from(GPC_TABLES.categories)
        .insert([
          {
            id: catHealthId,
            owner_id: uid,
            name: catHealth.name,
            slug: catHealth.slug,
            description: catHealth.description,
            color: catHealth.color,
          },
          {
            id: catTechId,
            owner_id: uid,
            name: catTech.name,
            slug: catTech.slug,
            description: catTech.description,
            color: catTech.color,
          },
        ])
        .select();
      if (catErr) throwSupabaseError(catErr, 'bootstrapStarterCatalog.categories');

      const { data: prods, error: prodErr } = await supabase
        .from(GPC_TABLES.products)
        .insert([
          {
            id: prod1Id,
            owner_id: uid,
            name: prod1.name,
            description: prod1.description,
            image_url: prod1.imageUrl,
            category_id: prod1.categoryId,
            origin_country: prod1.originCountry,
            country: prod1.country,
            language: prod1.language,
            network: prod1.network,
            affiliate_url: prod1.affiliateUrl,
            price: prod1.price,
            currency: prod1.currency,
            commission_rate: prod1.commissionRate,
            producer_email: prod1.producerEmail,
            status: prod1.status,
          },
          {
            id: prod2Id,
            owner_id: uid,
            name: prod2.name,
            description: prod2.description,
            image_url: prod2.imageUrl,
            category_id: prod2.categoryId,
            origin_country: prod2.originCountry,
            country: prod2.country,
            language: prod2.language,
            network: prod2.network,
            affiliate_url: prod2.affiliateUrl,
            price: prod2.price,
            currency: prod2.currency,
            commission_rate: prod2.commissionRate,
            producer_email: prod2.producerEmail,
            status: prod2.status,
          },
          {
            id: prod3Id,
            owner_id: uid,
            name: prod3.name,
            description: prod3.description,
            image_url: prod3.imageUrl,
            category_id: prod3.categoryId,
            origin_country: prod3.originCountry,
            country: prod3.country,
            language: prod3.language,
            network: prod3.network,
            affiliate_url: prod3.affiliateUrl,
            price: prod3.price,
            currency: prod3.currency,
            commission_rate: prod3.commissionRate,
            producer_email: prod3.producerEmail,
            status: prod3.status,
          },
        ])
        .select();
      if (prodErr) throwSupabaseError(prodErr, 'bootstrapStarterCatalog.products');

      if (cats) {
        setCategories((prev) => [
          ...prev,
          ...cats.map((r) => mapRowToCategory(r as Record<string, unknown>)),
        ]);
      }
      if (prods) {
        setProducts((prev) => [
          ...prev,
          ...prods.map((r) => mapRowToProduct(r as Record<string, unknown>)),
        ]);
      }
    } else {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'categories', catHealthId), {
          ...catHealth,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'categories', catTechId), {
          ...catTech,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'products', prod1Id), {
          ...prod1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'products', prod2Id), {
          ...prod2,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'products', prod3Id), {
          ...prod3,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await commitSdkOrRest(batch.commit(), [
          { path: `categories/${catHealthId}`, data: catHealth, serverTimestampFields: ['createdAt', 'updatedAt'], exists: false },
          { path: `categories/${catTechId}`, data: catTech, serverTimestampFields: ['createdAt', 'updatedAt'], exists: false },
          { path: `products/${prod1Id}`, data: prod1, serverTimestampFields: ['createdAt', 'updatedAt'], exists: false },
          { path: `products/${prod2Id}`, data: prod2, serverTimestampFields: ['createdAt', 'updatedAt'], exists: false },
          { path: `products/${prod3Id}`, data: prod3, serverTimestampFields: ['createdAt', 'updatedAt'], exists: false },
        ]);
      } catch (err) {
        handleWriteError(err, OperationType.WRITE, 'bootstrapStarterCatalog');
      }
    }

    await saveAffiliateLink({
      productId: prod2Id,
      label: 'Katori Watch — US Search Campaign',
      shortCode: `katori-${uid.slice(0, 4).toLowerCase()}`,
      destinationUrl: 'https://katoriwatch.example.com/offer?hop=globalpro',
      alternativeUrls: [],
      country: 'US',
      network: 'ClickBank',
      affiliateTag: 'globalpro',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'katori_us_search',
      buttonText: 'Visit Official Store',
      isPrimary: true,
      isActive: true,
    });

    const tpl = BUILTIN_TEMPLATES[1];
    await savePage(
      {
        productId: prod1Id,
        categoryId: catHealthId,
        templateId: tpl.id,
        title: 'Katori — Presell Oficial Multilíngue',
        slug: `katori-${uid.slice(0, 4).toLowerCase()}`,
        pageKind: 'presell',
        presellType: tpl.presellType,
        funnelStage: 'bottom',
        language: 'auto',
        originCountry: 'BR',
        targetCountry: 'BR',
        affiliateUrl: 'https://katoriwatch.example.com/offer?hop=globalpro',
        policyEmailMode: 'producer',
        policyEmail: 'support@katoriwatch.com',
        ghostMode: false,
        status: 'published',
        sortOrder: 1,
        blocks: tpl.blocksPt,
        theme: tpl.theme,
        seo: {
          metaTitle: 'Katori Biometric Watch — Oferta Oficial Verificada',
          metaDescription: 'Acesse a página oficial do Katori Biometric Watch com garantia de 60 dias.',
          robotsIndex: true,
          protectedBrandTerms: ['Katori', 'Lumina Botanical', 'VitalBotanics'],
        },
        tracking: {
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'katori_presell_01',
        },
        whatsapp: { enabled: false },
        paymentConfig: {
          enabled: true,
          provider: 'mercadopago',
          price: 197,
          currency: 'BRL',
          buttonLabel: 'Comprar Agora com Pix ou Cartão',
        },
        abTest: {
          enabled: true,
          splitPercent: 50,
          variantBName: 'Variação B — Foco em Garantia',
          variantBHeadline: 'Lote Oficial com 60 Dias de Garantia Incondicional',
          variantBCtaText: 'Garantir Oferta Oficial Agora',
          variantBPrimaryColor: '#16A34A',
        },
        translations: {
          pt: {
            title: 'Katori — Presell Oficial Multilíngue',
            slug: `katori-${uid.slice(0, 4).toLowerCase()}`,
            metaTitle: 'Katori — Oferta Oficial',
            metaDescription: 'Acesse com segurança o site oficial do fabricante.',
            blocks: tpl.blocksPt,
          },
          en: {
            title: 'Katori — Official Verified Portal',
            slug: `katori-${uid.slice(0, 4).toLowerCase()}`,
            metaTitle: 'Katori Biometric Watch — Official Offer',
            metaDescription: 'Direct verified access to the official Katori offer.',
            blocks: tpl.blocksEn,
          },
        },
      },
      undefined,
      true,
      'Página inicial criada'
    );

    await savePaymentGateway({
      provider: 'stripe',
      displayName: 'Stripe Global Checkout',
      publicKeyOrAccount: 'pk_live_global_presell',
      checkoutBaseUrl: 'https://buy.stripe.com/test_demo',
      supportedCurrencies: ['USD', 'EUR', 'BRL'],
      mode: 'sandbox',
      isEnabled: true,
    });

    await savePaymentGateway({
      provider: 'mercadopago',
      displayName: 'Mercado Pago (Pix & Cartão)',
      publicKeyOrAccount: 'APP_USR_mercadopago',
      pixKey: 'pagamentos@globalpresell.com',
      supportedCurrencies: ['BRL'],
      mode: 'sandbox',
      isEnabled: true,
    });
  }, [uid, saveAffiliateLink, savePage, savePaymentGateway]);

  return {
    categories,
    products,
    affiliateLinks,
    pages,
    userTemplates,
    campaigns,
    clickEvents,
    whatsappWidgets,
    paymentGateways,
    settings,
    dataLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    saveAffiliateLink,
    deleteAffiliateLink,
    savePage,
    togglePublishPage,
    duplicatePage,
    deletePage,
    getPageVersions,
    saveUserTemplate,
    deleteUserTemplate,
    saveCampaign,
    deleteCampaign,
    saveWhatsappWidget,
    deleteWhatsappWidget,
    savePaymentGateway,
    deletePaymentGateway,
    updateWorkspaceSettings,
    bootstrapStarterCatalog,
  };
}
