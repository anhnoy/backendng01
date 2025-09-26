const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
// Enable trust proxy so that req.protocol is respected behind reverse proxies (e.g., Nginx / Cloudflare)
app.set('trust proxy', 1);
// ให้ Express เปิด static path สำหรับไฟล์รูปภาพ
// รองรับ URL legacy ที่ไม่มีนามสกุลไฟล์ เช่น /uploads/abcdef โดยพยายามจับคู่ไฟล์ที่ขึ้นต้นด้วยชื่อดังกล่าว
app.use('/uploads', async (req, res, next) => {
  try {
    const hasExt = path.extname(req.path);
    if (hasExt) return next();
    const id = path.basename(req.path);
    if (!id) return next();
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.promises.readdir(uploadsDir);
    const match = files.find((f) => f.startsWith(id + '.') || f === id);
    if (match) {
      return res.sendFile(path.join(uploadsDir, match));
    }
    return next();
  } catch (e) {
    return next();
  }
});
app.use('/uploads', express.static('uploads'));
// const app = express();
const PORT = process.env.PORT || 3000;

const sequelize = require('./sequelize');
const User = require('./models/user');
// โหลดความสัมพันธ์ของโมเดล (Destination <-> DestinationImage)
require('./models/relations');
require('./models/activityRelations');

// Allow CORS for frontend on port 8080
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    const allowExact = [
      'https://lovable.dev'
    ];
    if (allowExact.includes(origin)) return callback(null, true);
    // Allow localhost and LAN IPs in 8080-8090 range
    const allowed = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.(\d{1,3})\.(\d{1,3})):80(8\d)$/;
    if (allowed.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes


app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/tasks', require('./routes/task'));
app.use('/api/countries', require('./routes/country'));
app.use('/api/attractions', require('./routes/attraction'));
app.use('/api/activities', require('./routes/activity'));
app.use('/api/accommodations', require('./routes/accommodation'));
app.use('/api/travel-purposes', require('./routes/travelPurpose'));
app.use('/api/destinations', require('./routes/destination'));
app.use('/api/foods', require('./routes/food'));
// Re-enable FAQ and Contact APIs
app.use('/api/faq', require('./routes/faq'));
app.use('/api/contact', require('./routes/contact'));


// Sync DB and start server
// ใช้ force:true เฉพาะตอน test เท่านั้น เพื่อไม่ให้ล้างข้อมูลใน dev/prod
// ปิดการ alter อัตโนมัติใน dev/prod เพื่อหลีกเลี่ยงปัญหา index/unique ซ้ำซ้อนใน MySQL
const isTest = process.env.NODE_ENV === 'test';
const syncOptions = isTest ? { force: true } : {};

sequelize.sync(syncOptions).then(() => {
  console.log('Database synced', syncOptions);
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('DB sync error:', err);
});
