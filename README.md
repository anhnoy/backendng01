# BackNG01

## Start

1. สร้างไฟล์ `.env` (ดูตัวอย่างใน `.env.example`)
2. ติดตั้ง dependencies
   ```
   npm install
   ```
3. รันเซิร์ฟเวอร์
   ```
   npm start
   ```

## โครงสร้างโปรเจกต์ (สำคัญ)

- `src/` : โค้ดหลักทั้งหมด
  - `index.js` : จุดเริ่ม Express app
  - `sequelize.js` : เชื่อมต่อฐานข้อมูล
  - `config.js` : โหลด config จาก .env
  - `models/` : โมเดล Sequelize
  - `controllers/` : ฟังก์ชัน logic
  - `routes/` : กำหนด endpoint
  - `middlewares/` : JWT, role middleware
  - `utils/` : ฟังก์ชันช่วยเหลือ เช่น hash password

## หมายเหตุ
- ใช้ JWT secret และ DB config จาก .env
- ไม่ควรสร้าง superadmin ผ่าน API
- สามารถเพิ่ม/ขยาย route และ controller ได้ตามต้องการ
