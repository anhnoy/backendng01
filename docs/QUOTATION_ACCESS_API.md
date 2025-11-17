# Quotation Access Code API Documentation

## Overview
ระบบนี้ช่วยให้ลูกค้าสามารถเข้าถึงใบเสนอราคาของตนเองผ่าน Access Code 6 หลักโดยไม่ต้อง login

## Database Schema

### Quotation Model
เพิ่ม fields:
- `accessCode` (STRING(6), UNIQUE): รหัส 6 หลักสำหรับเข้าถึงใบเสนอราคา
- `accessCodeCreatedAt` (DATETIME): วันที่สร้าง access code
- `shareCount` (INTEGER): จำนวนครั้งที่แชร์
- `lastSharedAt` (DATETIME): ครั้งสุดท้ายที่แชร์

## API Endpoints

### 1. Generate/Get Access Code (Admin)
**Endpoint:** `POST /api/quotations/:id/generate-access-code`

**Description:** สร้างหรือดึง access code สำหรับ quotation (สำหรับ Admin แชร์)

**Headers:**
```
Authorization: Bearer <admin_token>
```

**URL Parameters:**
- `id` (number): Quotation ID

**Response (Success - 200):**
```json
{
  "quotationId": 123,
  "quotationNumber": "QT-2025-000123",
  "accessCode": "482916",
  "shareUrl": "https://yourdomain.com/public/quotation/QT-2025-000123",
  "createdAt": "2024-11-15T10:30:00.000Z",
  "shareCount": 1,
  "lastSharedAt": "2024-11-15T10:30:00.000Z",
  "expiresAt": null
}
```

**Logic:**
- ถ้ามี accessCode อยู่แล้ว → คืนค่า code เดิม + เพิ่ม shareCount
- ถ้ายังไม่มี → สร้างใหม่ (ตรวจสอบไม่ซ้ำ)
- Update shareCount และ lastSharedAt

---

### 2. Verify Access Code
**Endpoint:** `POST /api/quotations/verify`

**Description:** ตรวจสอบ Quotation ID และ Access Code แล้วคืน JWT token สำหรับเข้าถึงข้อมูล

**Request Body:**
```json
{
  "quotationId": 123,
  "accessCode": "456789"
}
```

**Response (Success - 200):**
```json
{
  "valid": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "quotation": {
    "id": 123,
    "quotationNumber": "QT-2025-000123",
    "customerName": "John Doe"
  }
}
```

**Response (Invalid - 401):**
```json
{
  "valid": false,
  "error": "Invalid quotation ID or access code"
}
```

**Response (Missing Fields - 400):**
```json
{
  "valid": false,
  "error": "quotationId and accessCode are required"
}
```

---

### 2. Get Quotation with Token
**Endpoint:** `GET /api/quotations/:id/public`

**Description:** ดึงข้อมูลใบเสนอราคาทั้งหมดโดยใช้ JWT token

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "id": 123,
  "quotationNumber": "QT-2025-000123",
  "accessCode": "456789",
  "status": "quotation",
  "countryCode": "TH",
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+66812345678"
  },
  "travelers": {
    "adults": 2,
    "children": 1,
    "infants": 0
  },
  "calculated": {
    "grandTotal": 25000,
    "currency": "THB"
  },
  ...
}
```

**Response (Unauthorized - 401):**
```json
{
  "error": "Authorization token required"
}
```

```json
{
  "error": "Invalid or expired token"
}
```

**Response (Not Found - 404):**
```json
{
  "error": "Quotation not found"
}
```

---

## Frontend Implementation Guide

### Step 1: User enters Quotation ID and Access Code
```typescript
interface VerifyRequest {
  quotationId: number;
  accessCode: string;
}

async function verifyAccessCode(data: VerifyRequest) {
  const response = await fetch('/api/quotations/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  
  if (result.valid) {
    // Store token in localStorage or state
    localStorage.setItem('quotation_token', result.token);
    return result;
  } else {
    throw new Error(result.error);
  }
}
```

### Step 2: Fetch quotation data with token
```typescript
async function getQuotation(id: number) {
  const token = localStorage.getItem('quotation_token');
  
  const response = await fetch(`/api/quotations/${id}/public`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch quotation');
  }
  
  return await response.json();
}
```

### Example Usage in React
```tsx
function QuotationAccess() {
  const [quotationId, setQuotationId] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [quotation, setQuotation] = useState(null);

  const handleVerify = async () => {
    try {
      const result = await verifyAccessCode({
        quotationId: parseInt(quotationId),
        accessCode
      });
      
      // Fetch full quotation data
      const data = await getQuotation(result.quotation.id);
      setQuotation(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <input 
        value={quotationId} 
        onChange={e => setQuotationId(e.target.value)}
        placeholder="Quotation ID"
      />
      <input 
        value={accessCode} 
        onChange={e => setAccessCode(e.target.value)}
        placeholder="Access Code (6 digits)"
        maxLength={6}
      />
      <button onClick={handleVerify}>Verify</button>
      {error && <p className="error">{error}</p>}
      {quotation && <QuotationView data={quotation} />}
    </div>
  );
}
```

---

## Security Features

1. **Access Code Generation:**
   - 6-digit random numeric code (100000-999999)
   - Unique constraint in database
   - Generated automatically on quotation creation

2. **JWT Token:**
   - Expires in 7 days
   - Contains quotationId, accessCode, and type='quotation-access'
   - Verified on every request to /public endpoint

3. **Validation:**
   - Token must match quotation ID in URL
   - Access code in token must match database
   - Token must not be expired

---

## Migration

Run migration script to add accessCode column to existing quotations:

```bash
node scripts/add-quotation-access-code.js
```

This will:
1. Add `accessCode` column (VARCHAR(6) UNIQUE)
2. Generate and backfill access codes for all existing quotations

---

## Testing with Postman

### 1. Create Quotation (Admin)
```
POST /api/quotations
Body: { ...quotation data... }
Response: { id: 123, accessCode: "456789", ... }
```

### 2. Verify Access Code
```
POST /api/quotations/verify
Body: { "quotationId": 123, "accessCode": "456789" }
Save token from response
```

### 3. Get Quotation
```
GET /api/quotations/123/public
Headers: Authorization: Bearer <token_from_step_2>
```
