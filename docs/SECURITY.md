# Security Best Practices

คู่มือการรักษาความปลอดภัยสำหรับ SLCC Hub application

## 1. Environment Variables และ Secrets Management

### ✅ Do's

```bash
# เก็บ secrets ใน environment variables
# ไม่ hard-code ในโค้ด

# Good ✅
const secret = process.env.JWT_SECRET;

# Bad ❌
const secret = "Do8BZRs5jzrWEevTE59hsJhZDEC6cs5L9JbgKEJjg9M";
```

### ❌ Don'ts

- ❌ **อย่า commit `.env` เข้า Git**
- ❌ **อย่า share secrets ผ่าน email/chat**
- ❌ **อย่าใช้ weak secrets**
- ❌ **อย่าใช้ secrets เดียวกันทุก environment**

### การสร้าง Strong Secrets

```bash
# JWT Secrets (32-64 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# หรือใช้ openssl
openssl rand -base64 32
openssl rand -hex 64
```

### Secret Rotation

**เมื่อไหร่ต้อง rotate:**
- ✅ ทุก 90 วัน (recommended)
- ✅ เมื่อพนักงานลาออก
- ✅ เมื่อสงสัยว่า leaked
- ✅ หลังจาก security incident

**วิธี rotate secrets:**

1. **สร้าง secret ใหม่**
2. **Update configuration** (เก็บของเก่าไว้ก่อน)
3. **Deploy version ใหม่**
4. **ลบ secret เก่า** (หลัง deploy สำเร็จ)

---

## 2. Password Security

### Password Policy

```javascript
// Strong password requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false, // optional
};
```

### Password Hashing

```typescript
// ✅ Good: ใช้ bcrypt
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);

// ❌ Bad: เก็บ plaintext
const password = "password123"; // NEVER DO THIS!!!
```

### Default Passwords

```bash
# ⚠️ เปลี่ยน default passwords ทันทีหลัง deploy
ADMIN_PASSWORD=<change-me>
STAFF_PASSWORD=<change-me>
```

---

## 3. Database Security

### MongoDB Atlas Security Checklist

- [ ] **Network Access:**
  - ใช้ IP Whitelist
  - หรือใช้ VPC Peering
  - ❌ ไม่ควร allow 0.0.0.0/0

- [ ] **Database Users:**
  - สร้าง user แยกสำหรับแต่ละ application
  - ใช้ principle of least privilege
  - ตั้ง strong passwords

- [ ] **Encryption:**
  - ✅ Encryption at rest (เปิดโดย default)
  - ✅ Encryption in transit (TLS/SSL)

- [ ] **Monitoring:**
  - เปิด Database Auditing
  - ตั้ง alerts สำหรับ unusual activity

### Connection String Security

```bash
# ❌ Bad: อย่า commit connection string
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# ✅ Good: ใช้ environment variables
MONGODB_URI=${MONGODB_URI}

# ✅ Better: ใช้ secret management service
# AWS Secrets Manager, Azure Key Vault, etc.
```

---

## 4. JWT Token Security

### Token Configuration

```env
# Access Token: short-lived
JWT_EXPIRE=15m  # หรือ 1h สำหรับ better UX

# Refresh Token: long-lived  
JWT_REFRESH_EXPIRES=7d  # หรือ 30d
```

### JWT Best Practices

```typescript
// ✅ Good: เก็บ sensitive data นอก payload
const payload = {
  userId: user.id,
  role: user.role,
  // ❌ ไม่ควรเก็บ: password, credit card, etc.
};

// ✅ Good: ตรวจสอบ expiration
const decoded = jwt.verify(token, JWT_SECRET);
if (decoded.exp < Date.now() / 1000) {
  throw new Error('Token expired');
}

// ✅ Good: ใช้ different secrets สำหรับ access/refresh tokens
const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
```

### Token Storage

```typescript
// ❌ Bad: localStorage (vulnerable to XSS)
localStorage.setItem('token', token);

// ✅ Good: httpOnly cookies (protected from XSS)
res.cookie('token', token, {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,  // 15 minutes
});
```

---

## 5. HTTPS Configuration

### Local Development

```bash
# ใช้ HTTP ได้
NEXTAUTH_URL=http://localhost:3000
```

### Production

```bash
# ต้องใช้ HTTPS
NEXTAUTH_URL=https://yourdomain.com
```

### SSL Certificate

**Option 1: Let's Encrypt (ฟรี)**
```bash
# ใช้ Certbot
sudo certbot --nginx -d yourdomain.com
```

**Option 2: Cloudflare**
- ใช้ Cloudflare CDN → SSL ฟรีอัตโนมัติ

**Option 3: Platform SSL**
- Railway, Render, Vercel → มี SSL ให้อัตโนมัติ

---

## 6. Rate Limiting

### ป้องกัน Brute Force Attacks

```typescript
// ตัวอย่าง: ใช้ express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
});

app.post('/api/auth/login', loginLimiter, loginHandler);
```

### API Rate Limiting

```typescript
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
});

app.use('/api/', apiLimiter);
```

---

## 7. Security Headers

### Next.js Security Headers

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

---

## 8. Input Validation และ Sanitization

### Validate Input

```typescript
// ❌ Bad: ไม่ validate
const updateUser = async (data: any) => {
  await User.updateOne({ _id: data.id }, data);
};

// ✅ Good: validate inputs
import { z } from 'zod';

const UserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
});

const updateUser = async (data: unknown) => {
  const validated = UserSchema.parse(data);
  await User.updateOne({ _id: validated.id }, validated);
};
```

### Prevent NoSQL Injection

```typescript
// ❌ Bad: vulnerable to NoSQL injection
const user = await User.findOne({ username: req.body.username });

// ✅ Good: sanitize inputs
import validator from 'validator';

const username = validator.escape(req.body.username);
const user = await User.findOne({ username });
```

---

## 9. Dependency Security

### Regular Updates

```bash
# ตรวจสอบ vulnerabilities
npm audit

# แก้ไข vulnerabilities อัตโนมัติ
npm audit fix

# อัพเดท dependencies
npm update
```

### Automated Security Scans

```yaml
# GitHub Actions: .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit
```

---

## 10. Logging และ Monitoring

### What to Log

```typescript
// ✅ Log these:
- Login attempts (success/failure)
- Authorization failures
- Password changes
- Database errors
- API errors

// ❌ DON'T log these:
- Passwords
- Credit cards
- Secrets/tokens
- Personal data (PII)
```

### Log Monitoring

```typescript
// Example: log suspicious activity
logger.warn('Failed login attempt', {
  username: req.body.username,
  ip: req.ip,
  timestamp: new Date(),
});

// Alert on threshold
if (failedAttempts > 5) {
  alertAdmin('Possible brute force attack', { ip: req.ip });
}
```

---

## Security Checklist

### Pre-Deployment

- [ ] Secrets rotated และไม่มีใน Git
- [ ] Strong passwords สำหรับ admin/staff
- [ ] HTTPS enabled ใน production
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Dependencies up-to-date
- [ ] MongoDB network access restricted
- [ ] Backup system tested

### Post-Deployment

- [ ] Monitor logs สำหรับ suspicious activity
- [ ] Test security headers (securityheaders.com)
- [ ] Scan for vulnerabilities (npm audit)
- [ ] Review access logs
- [ ] Test rate limiting

### Monthly Maintenance

- [ ] Review และ update dependencies
- [ ] Check MongoDB Atlas security settings
- [ ] Review access logs
- [ ] Test backup/restore process
- [ ] Security training for team

---

## Common Vulnerabilities

### 1. XSS (Cross-Site Scripting)

```typescript
// ❌ Vulnerable
<div dangerouslySetInnerHTML={{__html: userInput}} />

// ✅ Safe: sanitize HTML
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput);
```

### 2. CSRF (Cross-Site Request Forgery)

```typescript
// Next.js มี CSRF protection built-in
// ใช้ NextAuth.js หรือ next-csrf
```

### 3. SQL/NoSQL Injection

```typescript
// ✅ Safe: ใช้ parameterized queries
const user = await User.findOne({ username });

// ❌ Unsafe: string concatenation
const user = await User.findOne({ $where: `this.username == '${username}'` });
```

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
