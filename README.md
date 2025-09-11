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
4. (แนะนำ) Hot reload dev server:
    ```
    npm run dev
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

## API Endpoint

### Auth
- `POST /api/auth/register`  
   **body:** `{ email, password, role }`  
   **response:** `201 Created` `{ id, email, role }`

- `POST /api/auth/login`  
   **body:** `{ email, password }`  
   **response:** `200 OK` `{ token, role }`

### User
- `GET /api/users` (lan, op)  
   **header:** `Authorization: Bearer <token>`  
   **response:** `[ { id, email, role, lanId } ]`

- `POST /api/users` (lan)  
   **body:** `{ email, password, role }`  
   **response:** `201 Created` `{ id, email, role, lanId }`

- `GET /api/users/:id` (lan, op, gn)  
   **response:** `{ id, email, role, lanId }`

- `PUT /api/users/:id` (lan, op)  
   **body:** `{ email?, password?, role? }`  
   **response:** `{ id, email, role }`

- `DELETE /api/users/:id` (lan)  
   **response:** `{ message: 'User deleted' }`

### Task (ถ้าต้องการเปิดใช้งาน)
- `GET /api/tasks`  
- `POST /api/tasks`  
- `PUT /api/tasks/:id`  
- `DELETE /api/tasks/:id`

## ตัวอย่าง Request/Response

**Register**
```
POST /api/auth/register
{
   "email": "user@example.com",
   "password": "123456",
   "role": "lan"
}
=> 201 Created
{
   "id": 1,
   "email": "user@example.com",
   "role": "lan"
}
```

**Login**
```
POST /api/auth/login
{
   "email": "user@example.com",
   "password": "123456"
}
=> 200 OK
{
   "token": "...",
   "role": "lan"
}
```

**Get Users**
```
GET /api/users
Authorization: Bearer <token>
=> 200 OK
[
   { "id": 1, "email": "user@example.com", "role": "lan", "lanId": null }
]
```

## หมายเหตุ
- ใช้ JWT secret และ DB config จาก .env
- ไม่ควรสร้าง superadmin ผ่าน API
- สามารถเพิ่ม/ขยาย route และ controller ได้ตามต้องการ
- หากต้องการเปิด Task API ให้ดูตัวอย่าง route/controller ด้านบน

## Dev Script
- เพิ่ม hot reload dev server:
   ```
   npm run dev
   ```

## CI/CD (GitHub Actions)
ดูไฟล์ `.github/workflows/nodejs.yml` สำหรับตัวอย่าง workflow deploy อัตโนมัติ
