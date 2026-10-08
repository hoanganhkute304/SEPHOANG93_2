export type PlatformType = 'windows' | 'android' | 'cross';

export interface AppItem {
  id: string;
  name: string;
  platform: PlatformType;
  fileExtension: string; // '.exe' | '.apk' | '.zip'
  packageName: string;
  version: string;
  versionCode?: number;
  description: string;
  category: string;
  osRequirement: string;
  minAndroid?: string;
  fileSize: string;
  downloadUrl: string;
  isUploadedFile: boolean;
  filename?: string;
  iconUrl: string;
  bannerUrl?: string; // Ảnh nền / Cover banner ứng dụng
  screenshots: string[];
  downloadsCount: number;
  rating: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  changelog?: string;
  apkSha256?: string;
  tags?: string[];
  features?: string[];
}

export interface StatsResponse {
  totalApps: number;
  totalDownloads: number;
  categoriesCount: Record<string, number>;
  latestApp: AppItem | null;
}
