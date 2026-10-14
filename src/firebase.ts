import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { AppItem } from './types';

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore kết nối thành công!');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Vui lòng kiểm tra cấu hình Firebase.');
      return false;
    }
    return true;
  }
}
testConnection();

// Real-time listener for Apps collection (Hỗ trợ isPinned, sortOrder, status)
export function subscribeToApps(
  callback: (apps: AppItem[]) => void,
  onError?: (err: Error) => void
) {
  const appsCol = collection(db, 'apps');
  return onSnapshot(
    appsCol,
    (snapshot) => {
      const items: AppItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AppItem;
        const count = typeof data.downloadsCount === 'number' ? Math.max(8, data.downloadsCount) : 8;
        items.push({
          ...data,
          id: docSnap.id,
          downloadsCount: count,
          status: data.status || 'ready',
          isPinned: !!data.isPinned,
          sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 9999,
        });
      });

      // Sắp xếp: Ghim lên đầu -> sortOrder tăng dần -> ngày tạo mới nhất
      items.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 9999;
        const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 9999;
        if (orderA !== orderB) return orderA - orderB;

        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      callback(items);
    },
    (error) => {
      console.error('Lỗi lắng nghe Firestore apps:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, 'apps');
    }
  );
}

// Save app to Firestore
export async function saveAppToFirestore(appItem: AppItem): Promise<void> {
  const path = `apps/${appItem.id}`;
  try {
    await setDoc(doc(db, 'apps', appItem.id), {
      ...appItem,
      status: appItem.status || 'ready',
      isPinned: !!appItem.isPinned,
      sortOrder: typeof appItem.sortOrder === 'number' ? appItem.sortOrder : 9999,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update app in Firestore
export async function updateAppInFirestore(
  appId: string,
  updates: Partial<AppItem>
): Promise<void> {
  const path = `apps/${appId}`;
  try {
    await updateDoc(doc(db, 'apps', appId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Increment download count in Firestore
export async function incrementFirestoreDownload(appId: string): Promise<void> {
  const path = `apps/${appId}`;
  try {
    await updateDoc(doc(db, 'apps', appId), {
      downloadsCount: increment(1),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete app from Firestore
export async function deleteAppFromFirestore(appId: string): Promise<void> {
  const path = `apps/${appId}`;
  try {
    await deleteDoc(doc(db, 'apps', appId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Site Settings (Header Logo & Branding)
export function subscribeToSiteSettings(
  callback: (settings: { headerLogoUrl?: string }) => void
) {
  const settingsDoc = doc(db, 'settings', 'branding');
  return onSnapshot(
    settingsDoc,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as { headerLogoUrl?: string });
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('Site settings snapshot error:', err);
    }
  );
}

// Social Links subscription (Hỗ trợ thêm Facebook)
export interface SocialSettings {
  discord?: string;
  tiktok?: string;
  youtube?: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
}

export function subscribeToSocialLinks(
  callback: (socials: SocialSettings) => void
) {
  const docRef = doc(db, 'settings', 'socials');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as SocialSettings);
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('Socials subscription error:', err);
    }
  );
}

// Background Media Settings (Bổ sung đầy đủ 11 trường canh chỉnh mới)
export interface BackgroundSettings {
  mediaType: 'video' | 'image';
  videoUrl?: string;
  imageUrl?: string;
  brightness?: number;      // 0.1 - 1.0 (mặc định 0.45)
  blur?: number;            // 0 - 20 (px, mặc định 0)
  positionX?: number;       // 0 - 100 (% trục ngang, mặc định 50)
  positionY?: number;       // 0 - 100 (% trục dọc, mặc định 50)
  scale?: number;           // 1.0 - 2.0 (mặc định 1.05)
  fitMode?: 'cover' | 'contain'; // mặc định 'cover'
  contrast?: number;        // 0.7 - 1.6 (mặc định 1.1)
  overlayOpacity?: number;  // 0.2 - 0.95 (mặc định 0.75)
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mediaType: 'image',
  videoUrl: '',
  imageUrl: '',
  brightness: 0.45,
  blur: 0,
  positionX: 50,
  positionY: 50,
  scale: 1.05,
  fitMode: 'cover',
  contrast: 1.1,
  overlayOpacity: 0.75,
};

export function subscribeToBackgroundSettings(
  callback: (settings: BackgroundSettings) => void
) {
  const docRef = doc(db, 'settings', 'background');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_BACKGROUND_SETTINGS, ...(snap.data() as BackgroundSettings) });
      } else {
        fetch('/api/settings/background')
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.data) {
              callback({ ...DEFAULT_BACKGROUND_SETTINGS, ...res.data });
            } else {
              callback(DEFAULT_BACKGROUND_SETTINGS);
            }
          })
          .catch(() => callback(DEFAULT_BACKGROUND_SETTINGS));
      }
    },
    (err) => {
      console.warn('Background settings subscription error:', err);
      callback(DEFAULT_BACKGROUND_SETTINGS);
    }
  );
}

export async function saveBackgroundSettings(settings: BackgroundSettings): Promise<void> {
  const path = 'settings/background';
  try {
    await setDoc(doc(db, 'settings', 'background'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Payment / MoMo Settings
export interface PaymentSettings {
  momoQrUrl?: string;
  momoPhone?: string;
  momoAccountName?: string;
  momoNote?: string;
  paypalQrUrl?: string;
  paypalEmailOrLink?: string;
  paypalAccountName?: string;
  thankYouMessage?: string;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  momoQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=2|99|0981083304|||0|0|0|Ung%20ho%20tac%20gia|transfer_myqr',
  momoPhone: '0981083304',
  momoAccountName: 'SEPHOANG 93',
  momoNote: '',
  paypalQrUrl: '',
  paypalEmailOrLink: '',
  paypalAccountName: '',
  thankYouMessage: '',
};

export function subscribeToPaymentSettings(
  callback: (settings: PaymentSettings) => void
) {
  const docRef = doc(db, 'settings', 'payment');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_PAYMENT_SETTINGS, ...(snap.data() as PaymentSettings) });
      } else {
        callback(DEFAULT_PAYMENT_SETTINGS);
      }
    },
    (err) => {
      console.warn('Payment settings subscription error:', err);
      callback(DEFAULT_PAYMENT_SETTINGS);
    }
  );
}

export async function savePaymentSettings(settings: PaymentSettings): Promise<void> {
  const path = 'settings/payment';
  try {
    await setDoc(doc(db, 'settings', 'payment'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}