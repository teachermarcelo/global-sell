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
      try {
        await setDoc(doc(db, 'categories', id), {
          ownerId: uid,
          name: input.name.trim().slice(0, 80),
          slug,
          description: (input.description || '').trim().slice(0, 300),
          color: input.color || '#2563EB',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `categories/${id}`);
      }
    },
    [uid]
  );

  const updateCategory = useCallback(
    async (id: string, input: { name: string; description?: string; color?: string }) => {
      if (!uid) return;
      try {
        await updateDoc(doc(db, 'categories', id), {
          name: input.name.trim().slice(0, 80),
          slug: slugify(input.name),
          description: (input.description || '').trim().slice(0, 300),
          color: input.color || '#2563EB',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `categories/${id}`);
      }
    },
    [uid]
  );

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  }, []);

  const createProduct = useCallback(
    async (input: Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
      if (!uid) return '';
      const id = makeId('prod');
      const allowedLang = ['pt', 'en', 'es', 'auto'].includes(input.language) ? input.language : 'pt';
      const allowedCurrency = ['BRL', 'USD', 'EUR', 'GBP'].includes(input.currency) ? input.currency : 'BRL';
      const allowedStatus = ['active', 'paused', 'archived'].includes(input.status) ? input.status : 'active';
      try {
        await setDoc(doc(db, 'products', id), {
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
      }
    },
    [uid]
  );

  const updateProduct = useCallback(
    async (id: string, input: Partial<Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>) => {
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (input.name !== undefined) payload.name = input.name.trim().slice(0, 140);
      if (input.description !== undefined) payload.description = input.description.slice(0, 2000);
      if (input.imageUrl !== undefined) payload.imageUrl = input.imageUrl.slice(0, 1000);
      if (input.categoryId !== undefined) payload.categoryId = input.categoryId.slice(0, 128);
      if (input.originCountry !== undefined) payload.originCountry = input.originCountry.slice(0, 10);
      if (input.country !== undefined) payload.country = input.country.slice(0, 10);
      if (input.language !== undefined) payload.language = input.language;
      if (input.network !== undefined) payload.network = input.network.slice(0, 80);
      if (input.affiliateUrl !== undefined) payload.affiliateUrl = input.affiliateUrl.trim().slice(0, 2000);
      if (input.price !== undefined) payload.price = Math.max(0, Number(input.price) || 0);
      if (input.currency !== undefined) payload.currency = input.currency;
      if (input.commissionRate !== undefined) payload.commissionRate = Number(input.commissionRate) || 0;
      if (input.producerEmail !== undefined) payload.producerEmail = input.producerEmail.slice(0, 200);
      if (input.status !== undefined) payload.status = input.status;
      try {
        await updateDoc(doc(db, 'products', id), payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
      }
    },
    []
  );

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
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
      try {
        const batch = writeBatch(db);
        const linkRef = doc(db, 'affiliateLinks', id);
        const redirectRef = doc(db, 'redirectLinks', cleanCode);
        const existingRedirectSnap = await withTimeout(
          getDoc(redirectRef),
          10000,
          'Tempo esgotado ao verificar código de redirecionamento.'
        );

        const linkMutable = {
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
          updatedAt: serverTimestamp(),
        };

        if (existingId) {
          batch.update(linkRef, linkMutable);
        } else {
          batch.set(linkRef, {
            ownerId: uid,
            ...linkMutable,
            createdAt: serverTimestamp(),
          });
        }

        const redirectMutable = {
          linkId: id,
          productId: (input.productId || '').slice(0, 128),
          shortCode: cleanCode,
          destinationUrl: input.destinationUrl.trim().slice(0, 2000),
          utmSource: (input.utmSource || '').slice(0, 100),
          utmMedium: (input.utmMedium || '').slice(0, 100),
          utmCampaign: (input.utmCampaign || '').slice(0, 100),
          isActive: Boolean(input.isActive),
          updatedAt: serverTimestamp(),
        };

        if (existingRedirectSnap.exists()) {
          batch.update(redirectRef, redirectMutable);
        } else {
          batch.set(redirectRef, {
            ownerId: uid,
            ...redirectMutable,
            createdAt: serverTimestamp(),
          });
        }

        await withTimeout(
          batch.commit(),
          15000,
          'Tempo esgotado ao salvar link. Verifique sua conexão ou recarregue a página.'
        );
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `affiliateLinks/${id}`);
      }
    },
    [uid]
  );

  const deleteAffiliateLink = useCallback(async (link: AffiliateLink) => {
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

      try {
        const pubRef = doc(db, 'publishedPages', publicKey);
        const existingPubSnap = existingPage?.publicKey
          ? await withTimeout(
              getDoc(pubRef),
              10000,
              'Tempo esgotado ao verificar página publicada.'
            )
          : null;

        const batch = writeBatch(db);
        const pageRef = doc(db, 'pages', pageId);

        const pageFields = {
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
          updatedAt: serverTimestamp(),
        };

        if (existingPage) {
          batch.update(pageRef, pageFields);
        } else {
          batch.set(pageRef, {
            ownerId: uid,
            ...pageFields,
            createdAt: serverTimestamp(),
          });
        }

        if (nextStatus === 'published' || existingPubSnap?.exists()) {
          const pubStatus: 'published' | 'unpublished' =
            nextStatus === 'published' ? 'published' : 'unpublished';
          const pubMutableFields = {
            pageId,
            productId: pageFields.productId,
            publicKey,
            slug: cleanSlug,
            title: pageFields.title,
            pageKind: pageFields.pageKind,
            presellType: pageFields.presellType,
            funnelStage: pageFields.funnelStage,
            language: pageFields.language,
            originCountry: pageFields.originCountry,
            targetCountry: pageFields.targetCountry,
            affiliateUrl: pageFields.affiliateUrl,
            policyEmail: pageFields.policyEmail,
            ghostMode: pageFields.ghostMode,
            status: pubStatus,
            blocks: pageFields.blocks,
            theme: pageFields.theme,
            seo: pageFields.seo,
            tracking: pageFields.tracking,
            whatsapp: pageFields.whatsapp,
            paymentConfig: pageFields.paymentConfig,
            abTest: pageFields.abTest,
            translations: pageFields.translations,
            updatedAt: serverTimestamp(),
          };

          if (existingPubSnap?.exists()) {
            batch.update(pubRef, pubMutableFields);
          } else {
            batch.set(pubRef, {
              ownerId: uid,
              ...pubMutableFields,
              createdAt: serverTimestamp(),
            });
          }
        }

        const versionId = makeId('ver');
        batch.set(doc(db, 'pageVersions', versionId), {
          ownerId: uid,
          pageId,
          versionNumber: Date.now(),
          note: (versionNote || (publishNow ? 'Publicação' : 'Salvamento')).slice(0, 200),
          snapshot: {
            title: pageFields.title,
            slug: pageFields.slug,
            blocks: pageFields.blocks,
            theme: pageFields.theme,
            abTest: pageFields.abTest,
          },
          createdAt: serverTimestamp(),
        });

        await withTimeout(
          batch.commit(),
          15000,
          'Tempo esgotado ao publicar no servidor. Verifique sua conexão com a internet ou recarregue a página e tente novamente.'
        );
        return pageId;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `pages/${pageId}`);
      }
    },
    [uid]
  );

  const togglePublishPage = useCallback(
    async (page: PageItem, shouldPublish: boolean) => {
      if (!uid) return;
      const publicKey =
        page.publicKey || sanitizeId(`${page.slug}_${uid.slice(0, 6)}_${page.id.slice(-5)}`);
      try {
        const pubRef = doc(db, 'publishedPages', publicKey);
        const existingPubSnap = page.publicKey
          ? await withTimeout(
              getDoc(pubRef),
              10000,
              'Tempo esgotado ao verificar página publicada.'
            )
          : null;

        const batch = writeBatch(db);
        const nextStatus = shouldPublish ? 'published' : 'unpublished';

        batch.update(doc(db, 'pages', page.id), {
          status: nextStatus,
          publicKey,
          publishedAt: shouldPublish ? serverTimestamp() : page.publishedAt || null,
          updatedAt: serverTimestamp(),
        });

        const pubMutableFields = {
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
          updatedAt: serverTimestamp(),
        };

        if (existingPubSnap?.exists()) {
          batch.update(pubRef, pubMutableFields);
        } else {
          batch.set(pubRef, {
            ownerId: uid,
            ...pubMutableFields,
            createdAt: serverTimestamp(),
          });
        }

        await withTimeout(
          batch.commit(),
          15000,
          'Tempo esgotado ao atualizar status da página. Verifique sua conexão e tente novamente.'
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `pages/${page.id}`);
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
      try {
        if (existingId) {
          await updateDoc(doc(db, 'userTemplates', id), {
            name: input.name.slice(0, 120),
            presellType: input.presellType,
            description: (input.description || '').slice(0, 400),
            isFavorite: Boolean(input.isFavorite),
            blocks: input.blocks.slice(0, 60),
            theme: input.theme,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'userTemplates', id), {
            ownerId: uid,
            name: input.name.slice(0, 120),
            presellType: input.presellType,
            description: (input.description || '').slice(0, 400),
            isFavorite: Boolean(input.isFavorite),
            blocks: input.blocks.slice(0, 60),
            theme: input.theme,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `userTemplates/${id}`);
      }
    },
    [uid]
  );

  const deleteUserTemplate = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'userTemplates', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `userTemplates/${id}`);
    }
  }, []);

  const saveCampaign = useCallback(
    async (
      input: Omit<Campaign, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('cmp');
      const mutable = {
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
        updatedAt: serverTimestamp(),
      };
      try {
        if (existingId) {
          await updateDoc(doc(db, 'campaigns', id), mutable);
        } else {
          await setDoc(doc(db, 'campaigns', id), {
            ownerId: uid,
            ...mutable,
            createdAt: serverTimestamp(),
          });
        }
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `campaigns/${id}`);
      }
    },
    [uid]
  );

  const deleteCampaign = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'campaigns', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `campaigns/${id}`);
    }
  }, []);

  const saveWhatsappWidget = useCallback(
    async (
      input: Omit<WhatsappWidget, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('wa');
      const mutable = {
        name: input.name.trim().slice(0, 100),
        phoneNumber: input.phoneNumber.trim().slice(0, 30),
        prefilledMessage: (input.prefilledMessage || '').slice(0, 300),
        position: input.position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
        buttonLabel: (input.buttonLabel || '').slice(0, 60),
        isActive: Boolean(input.isActive),
        updatedAt: serverTimestamp(),
      };
      try {
        if (existingId) {
          await updateDoc(doc(db, 'whatsappWidgets', id), mutable);
        } else {
          await setDoc(doc(db, 'whatsappWidgets', id), {
            ownerId: uid,
            ...mutable,
            createdAt: serverTimestamp(),
          });
        }
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `whatsappWidgets/${id}`);
      }
    },
    [uid]
  );

  const deleteWhatsappWidget = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'whatsappWidgets', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `whatsappWidgets/${id}`);
    }
  }, []);

  const savePaymentGateway = useCallback(
    async (
      input: Omit<PaymentGateway, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      if (!uid) return '';
      const id = existingId || makeId('gw');
      const mutable = {
        provider: input.provider,
        displayName: input.displayName.trim().slice(0, 80),
        publicKeyOrAccount: (input.publicKeyOrAccount || '').slice(0, 200),
        checkoutBaseUrl: (input.checkoutBaseUrl || '').slice(0, 1000),
        pixKey: (input.pixKey || '').slice(0, 200),
        supportedCurrencies: (input.supportedCurrencies || ['BRL']).slice(0, 10),
        mode: input.mode === 'sandbox' ? 'sandbox' : 'live',
        isEnabled: Boolean(input.isEnabled),
        updatedAt: serverTimestamp(),
      };
      try {
        if (existingId) {
          await updateDoc(doc(db, 'paymentGateways', id), mutable);
        } else {
          await setDoc(doc(db, 'paymentGateways', id), {
            ownerId: uid,
            ...mutable,
            createdAt: serverTimestamp(),
          });
        }
        return id;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `paymentGateways/${id}`);
      }
    },
    [uid]
  );

  const deletePaymentGateway = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'paymentGateways', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `paymentGateways/${id}`);
    }
  }, []);

  const updateWorkspaceSettings = useCallback(
    async (patch: Partial<UserWorkspaceSettings>) => {
      if (!uid) return;
      const safeUid = sanitizeId(uid);
      try {
        await setDoc(
          doc(db, 'userSettings', safeUid),
          {
            ownerId: uid,
            autoDetectVisitorLang: settings?.autoDetectVisitorLang ?? true,
            defaultVisitorLang: settings?.defaultVisitorLang ?? 'pt',
            preserveAffiliateParams: settings?.preserveAffiliateParams ?? true,
            robotsIndexDefault: settings?.robotsIndexDefault ?? true,
            ...settings,
            ...patch,
            updatedAt: serverTimestamp(),
          },
          { merge: false }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `userSettings/${safeUid}`);
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

    await setDoc(doc(db, 'categories', catHealthId), {
      ownerId: uid,
      name: 'Saúde & Skincare',
      slug: 'saude-skincare',
      description: 'Ofertas internacionais de bem-estar, nutracêuticos e cosméticos.',
      color: '#16A34A',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'categories', catTechId), {
      ownerId: uid,
      name: 'Tecnologia & Wearables',
      slug: 'tecnologia-wearables',
      description: 'Eletrônicos de alta demanda para campanhas globais.',
      color: '#2563EB',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'products', prod1Id), {
      ownerId: uid,
      name: 'Lumina Botanical Serum',
      description: 'Sérum botânico concentrado de vitamina C e extratos naturais para renovação facial.',
      imageUrl: '/images/product_skincare_serum_1794756575954.jpg',
      categoryId: catHealthId,
      country: 'BR',
      language: 'pt',
      network: 'Hotmart',
      affiliateUrl: 'https://checkout.example.com/lumina-serum?aff=gpc01',
      price: 197,
      currency: 'BRL',
      commissionRate: 55,
      producerEmail: 'suporte@luminabotanical.com',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'products', prod2Id), {
      ownerId: uid,
      name: 'Katori Biometric Watch Pro',
      description: 'Smartwatch biométrico com monitoramento contínuo e caixa em titânio escovado.',
      imageUrl: '/images/product_fitness_watch_1794756577239.jpg',
      categoryId: catTechId,
      country: 'US',
      language: 'en',
      network: 'ClickBank',
      affiliateUrl: 'https://katoriwatch.example.com/offer?hop=globalpro',
      price: 149,
      currency: 'USD',
      commissionRate: 45,
      producerEmail: 'support@katoriwatch.com',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'products', prod3Id), {
      ownerId: uid,
      name: 'VitalBotanics Pure 500mg',
      description: 'Suplemento herbal diário de alta biodisponibilidade em frasco âmbar protegido.',
      imageUrl: '/images/product_supplement_bottle_1794756576809.jpg',
      categoryId: catHealthId,
      country: 'US',
      language: 'auto',
      network: 'BuyGoods',
      affiliateUrl: 'https://vitalbotanics.example.com/order?aff_id=gp2026',
      price: 69,
      currency: 'USD',
      commissionRate: 60,
      producerEmail: 'care@vitalbotanics.com',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

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
