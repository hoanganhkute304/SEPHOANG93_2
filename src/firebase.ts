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
  query,
  orderBy,
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
    // Document might not exist which is fine
    return true;
  }
}
testConnection();

// Real-time listener for Apps collection
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
        items.push({ ...data, id: docSnap.id, downloadsCount: count });
      });
      // Sort newest first
      items.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
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
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Update app in Firestore (for Admin Mod)
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

export async function saveSiteLogoToFirestore(logoUrl: string): Promise<void> {
  const path = 'settings/branding';
  try {
    await setDoc(doc(db, 'settings', 'branding'), {
      headerLogoUrl: logoUrl,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSiteLogoFromFirestore(): Promise<void> {
  const path = 'settings/branding';
  try {
    await deleteDoc(doc(db, 'settings', 'branding'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Social Links subscription
export function subscribeToSocialLinks(
  callback: (socials: { discord?: string; tiktok?: string; youtube?: string; telegram?: string }) => void
) {
  const docRef = doc(db, 'settings', 'socials');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as any);
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('Socials subscription error:', err);
    }
  );
}

// Background Media Settings (Image & Video)
export interface BackgroundSettings {
  mediaType: 'video' | 'image';
  videoUrl?: string;
  imageUrl?: string;
  brightness?: number;
  blur?: number;
}

export function subscribeToBackgroundSettings(
  callback: (settings: BackgroundSettings) => void
) {
  const docRef = doc(db, 'settings', 'background');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as BackgroundSettings);
      } else {
        fetch('/api/settings/background')
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.data) {
              callback(res.data);
            } else {
              callback({
                mediaType: 'video',
                videoUrl: '',
                imageUrl: '',
                brightness: 0.45,
                blur: 0,
              });
            }
          })
          .catch(() => {
            callback({
              mediaType: 'video',
              videoUrl: '',
              imageUrl: '',
              brightness: 0.45,
              blur: 0,
            });
          });
      }
    },
    (err) => {
      console.warn('Background settings subscription error:', err);
      fetch('/api/settings/background')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) callback(res.data);
        })
        .catch(() => {});
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

export async function deleteBackgroundSettings(): Promise<void> {
  const path = 'settings/background';
  try {
    await deleteDoc(doc(db, 'settings', 'background'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Background Music Playlist Settings
export interface TrackItem {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface MusicSettings {
  tracks: TrackItem[];
}

export function subscribeToMusicSettings(
  callback: (settings: MusicSettings) => void
) {
  const docRef = doc(db, 'settings', 'music');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as MusicSettings);
      } else {
        fetch('/api/settings/music')
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.data && Array.isArray(res.data.tracks)) {
              callback(res.data);
            } else {
              callback({ tracks: [] });
            }
          })
          .catch(() => callback({ tracks: [] }));
      }
    },
    (err) => {
      console.warn('Music settings subscription error:', err);
      fetch('/api/settings/music')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data && Array.isArray(res.data.tracks)) {
            callback(res.data);
          }
        })
        .catch(() => {});
    }
  );
}

export async function saveMusicSettings(settings: MusicSettings): Promise<void> {
  const path = 'settings/music';
  try {
    await setDoc(doc(db, 'settings', 'music'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMusicSettings(): Promise<void> {
  const path = 'settings/music';
  try {
    await deleteDoc(doc(db, 'settings', 'music'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Payment / MoMo & PayPal Settings (Khi ấn tải EXE hiện QR MoMo & PayPal)
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
        fetch('/api/settings/payment')
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.data) {
              callback({ ...DEFAULT_PAYMENT_SETTINGS, ...res.data });
            } else {
              callback(DEFAULT_PAYMENT_SETTINGS);
            }
          })
          .catch(() => callback(DEFAULT_PAYMENT_SETTINGS));
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

// Author Contact Information (Dưới cùng bên phải có thể Copy)
export interface AuthorInfoSettings {
  name: string;
  email: string;
  bio?: string;
  phone?: string;
}

export const DEFAULT_AUTHOR_INFO: AuthorInfoSettings = {
  name: 'SEPHOANG 93',
  email: 'kute123kuto123@gmail.com',
  bio: 'Nhà sáng tạo / Developer',
  phone: '0987.654.321',
};

export function subscribeToAuthorSettings(
  callback: (info: AuthorInfoSettings) => void
) {
  const docRef = doc(db, 'settings', 'author');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_AUTHOR_INFO, ...(snap.data() as AuthorInfoSettings) });
      } else {
        callback(DEFAULT_AUTHOR_INFO);
      }
    },
    (err) => {
      console.warn('Author settings subscription error:', err);
      callback(DEFAULT_AUTHOR_INFO);
    }
  );
}

export async function saveAuthorSettings(info: AuthorInfoSettings): Promise<void> {
  const path = 'settings/author';
  try {
    await setDoc(doc(db, 'settings', 'author'), {
      ...info,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

