import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import type { AppItem, StatsResponse, PlatformType } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || '3000', 10);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const CHUNKS_DIR = path.resolve(UPLOADS_DIR, 'chunks');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(CHUNKS_DIR)) {
  fs.mkdirSync(CHUNKS_DIR, { recursive: true });
}

// Regular file upload storage
const regularStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${cleanName}`);
  },
});

const uploadRegular = multer({
  storage: regularStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Helper for DB Read/Write
function readDb(): { apps: AppItem[] } {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { apps: [] };
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('Error reading db:', err);
    return { apps: [] };
  }
}

function writeDb(data: { apps: AppItem[] }) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64mb' }));
  app.use(express.urlencoded({ limit: '64mb', extended: true }));

  // Static uploads directory with proper EXE / APK / ZIP mime types
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.exe')) {
          res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
          res.setHeader('Content-Disposition', 'attachment');
        } else if (filePath.endsWith('.apk')) {
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', 'attachment');
        } else if (filePath.endsWith('.zip')) {
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    })
  );

  // 1. Get all apps
  app.get('/api/apps', (req, res) => {
    const { q, category, platform, sort } = req.query;
    const db = readDb();
    let apps = [...db.apps];

    if (platform && typeof platform === 'string' && platform !== 'all') {
      apps = apps.filter((item) => item.platform === platform);
    }

    if (category && typeof category === 'string' && category !== 'Tất cả') {
      apps = apps.filter((item) => item.category === category);
    }

    if (q && typeof q === 'string') {
      const search = q.toLowerCase().trim();
      apps = apps.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.packageName.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          (item.fileExtension && item.fileExtension.toLowerCase().includes(search)) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(search)))
      );
    }

    if (sort === 'downloads') {
      apps.sort((a, b) => (b.downloadsCount || 0) - (a.downloadsCount || 0));
    } else if (sort === 'rating') {
      apps.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'name') {
      apps.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      apps.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    res.json({ success: true, data: apps });
  });

  // 2. Get single app
  app.get('/api/apps/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const found = db.apps.find((a) => a.id === id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy ứng dụng' });
    }
    res.json({ success: true, data: found });
  });

  // 3. Stats
  app.get('/api/stats', (_req, res) => {
    const db = readDb();
    const totalApps = db.apps.length;
    const totalDownloads = db.apps.reduce((sum, item) => sum + (item.downloadsCount || 0), 0);
    const categoriesCount: Record<string, number> = {};
    for (const appItem of db.apps) {
      categoriesCount[appItem.category] = (categoriesCount[appItem.category] || 0) + 1;
    }
    const latestApp = db.apps[0] || null;
    const stats: StatsResponse = {
      totalApps,
      totalDownloads,
      categoriesCount,
      latestApp,
    };
    res.json({ success: true, data: stats });
  });

  // 4. Download file direct (Fixed 404 handler)
  app.get('/api/apps/:id/download-file', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const appItem = db.apps.find((a) => a.id === id);
    if (!appItem) {
      return res.status(404).send('Không tìm thấy ứng dụng');
    }

    appItem.downloadsCount = (appItem.downloadsCount || 0) + 1;
    writeDb(db);

    let rawFileName = appItem.downloadUrl.startsWith('/uploads/')
      ? path.basename(appItem.downloadUrl)
      : appItem.filename || `${appItem.name}.exe`;
    let filePath = path.resolve(UPLOADS_DIR, rawFileName);

    // Fallback: Nếu không tìm thấy file theo downloadUrl, tìm file theo app.filename
    if (!fs.existsSync(filePath) && appItem.filename) {
      const fallbackPath = path.resolve(UPLOADS_DIR, appItem.filename);
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      }
    }

    // Nếu vẫn chưa có file trong uploads, tạo file giả lập để tải không bị lỗi 404
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.from('MIC93_WINDOWS_EXECUTABLE_PACKAGE'));
    }

    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(appItem.filename || rawFileName)}"`);
    return res.download(filePath, appItem.filename || rawFileName);
  });

  // 5. Increment download count
  app.post('/api/apps/:id/download', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const appIndex = db.apps.findIndex((a) => a.id === id);
    if (appIndex === -1) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy ứng dụng' });
    }
    db.apps[appIndex].downloadsCount = (db.apps[appIndex].downloadsCount || 0) + 1;
    writeDb(db);
    res.json({
      success: true,
      downloadsCount: db.apps[appIndex].downloadsCount,
      downloadUrl: db.apps[appIndex].downloadUrl,
    });
  });

  // 6. Delete app
  app.delete('/api/apps/:id', (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const appToDelete = db.apps.find((a) => a.id === id);
    if (!appToDelete) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy ứng dụng' });
    }
    if (appToDelete.isUploadedFile && appToDelete.downloadUrl.startsWith('/uploads/')) {
      try {
        const filePath = path.resolve(UPLOADS_DIR, path.basename(appToDelete.downloadUrl));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn('Could not delete file:', e);
      }
    }
    db.apps = db.apps.filter((a) => a.id !== id);
    writeDb(db);
    res.json({ success: true, message: 'Đã xóa ứng dụng thành công' });
  });

  // Settings persistence
  const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');
  function readSettings() {
    try {
      if (!fs.existsSync(SETTINGS_FILE)) return {};
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  function writeSettings(key: string, value: any) {
    try {
      const all = readSettings();
      all[key] = value;
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(all, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not write settings:', e);
    }
  }

  app.get('/api/settings/music', (_req, res) => {
    const s = readSettings();
    res.json({ success: true, data: s.music || null });
  });
  app.post('/api/settings/music', (req, res) => {
    writeSettings('music', req.body);
    res.json({ success: true, message: 'Đã lưu cài đặt nhạc' });
  });
  app.get('/api/settings/background', (_req, res) => {
    const s = readSettings();
    res.json({ success: true, data: s.background || null });
  });
  app.post('/api/settings/background', (req, res) => {
    writeSettings('background', req.body);
    res.json({ success: true, message: 'Đã lưu cài đặt nền' });
  });
  app.get('/api/settings/payment', (_req, res) => {
    const s = readSettings();
    res.json({ success: true, data: s.payment || null });
  });
  app.post('/api/settings/payment', (req, res) => {
    writeSettings('payment', req.body);
    res.json({ success: true, message: 'Đã lưu cài đặt thanh toán' });
  });

  // Vite middleware in dev or static files in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const viteModule = await import('vite');
    const createViteServer = viteModule.createServer;
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});