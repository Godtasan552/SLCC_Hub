# Docker Deployment Guide

คู่มือการ deploy SLCC Hub application ด้วย Docker สำหรับ production environment

## Prerequisites

- Docker และ Docker Compose ติดตั้งแล้ว
- มี MongoDB Atlas account
- Environment variables ครบถ้วน

## การเตรียม Environment Variables

### 1. สร้างไฟล์ `.env`

คัดลอกจาก `.env.example`:

```bash
cp .env.example .env
```

### 2. กรอกข้อมูลที่จำเป็น

แก้ไขไฟล์ `.env` และกรอกข้อมูลจริง:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/slcc_hub?appName=SLCC

# Generate JWT Secrets (ใช้คำสั่งด้านล่าง)
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
NEXTAUTH_SECRET=<generated-secret>

# Admin Credentials (เปลี่ยนเป็นของจริง)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>

# Production URL
NEXTAUTH_URL=https://yourdomain.com  # หรือ http://localhost:3000 สำหรับ local
```

### 3. สร้าง Secrets

ใช้คำสั่งนี้เพื่อสร้าง random secrets:

```bash
# สำหรับ JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# สำหรับ JWT_REFRESH_SECRET (ใช้คำสั่งเดิมอีกครั้ง ต้องต่างกัน)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# สำหรับ NEXTAUTH_SECRET (ใช้คำสั่งเดิมอีกครั้ง ต้องต่างกัน)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## การ Build Docker Image

### Development Build

```bash
docker build -t slcc-hub:dev .
```

### Production Build

```bash
docker build --target runner -t slcc-hub:latest .
```

### ตรวจสอบ Image Size

```bash
docker images slcc-hub
```

Expected size: < 500MB

---

## การรัน Container

### ใช้ Docker Compose (แนะนำ)

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **ตรวจสอบ logs:**
   ```bash
   docker-compose logs -f web
   ```

3. **ตรวจสอบ health status:**
   ```bash
   docker-compose ps
   curl http://localhost:3000/api/health
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

### ใช้ Docker Run (Alternative)

```bash
docker run -d \
  --name slcc-hub-web \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  slcc-hub:latest
```

---

## Deployment ไปยัง Cloud Platforms

### Railway

1. **เชื่อมต่อ GitHub repository**
2. **Add environment variables:**
   - ไปที่ Variables tab
   - เพิ่ม variables ทั้งหมดจาก `.env`
3. **Deploy:**
   - Railway จะ auto-detect Dockerfile
   - Deploy อัตโนมัติเมื่อ push code

### Render

1. **สร้าง new Web Service**
2. **เลือก Docker environment**
3. **Set environment variables:**
   - Add ทุกตัวแปรจาก `.env`
4. **Deploy:**
   - Render จะ build และ deploy อัตโนมัติ

### DigitalOcean App Platform

1. **สร้าง new App**
2. **เลือก Docker**
3. **Configure:**
   ```yaml
   name: slcc-hub
   services:
   - name: web
     dockerfile_path: Dockerfile
     environment_slug: docker
     instance_count: 1
     instance_size_slug: basic-xs
     routes:
     - path: /
   ```
4. **Add environment variables**
5. **Deploy**

### Docker Hub + VPS

1. **Push image to Docker Hub:**
   ```bash
   docker tag slcc-hub:latest yourusername/slcc-hub:latest
   docker push yourusername/slcc-hub:latest
   ```

2. **SSH ไป VPS:**
   ```bash
   ssh user@your-server-ip
   ```

3. **Pull และ run:**
   ```bash
   docker pull yourusername/slcc-hub:latest
   docker run -d \
     --name slcc-hub-web \
     -p 3000:3000 \
     --env-file .env \
     --restart unless-stopped \
     yourusername/slcc-hub:latest
   ```

---

## Health Checks และ Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health
```

**Response (Healthy):**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-14T12:00:00.000Z",
  "uptime": 123.456
}
```

**Response (Unhealthy):**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "message": "Database connection is not established"
}
```

### Docker Health Check

Docker จะตรวจสอบ health อัตโนมัติ:

```bash
docker inspect --format='{{json .State.Health}}' slcc-hub-web
```

---

## Troubleshooting

### Container ไม่ start

```bash
# ดู logs
docker logs slcc-hub-web

# ตรวจสอบ container status
docker ps -a
```

### Database connection error

- ตรวจสอบ `MONGODB_URI` ใน `.env`
- ตรวจสอบว่า IP ของ container อนุญาตใน MongoDB Atlas Network Access

### Port already in use

```bash
# หา process ที่ใช้ port 3000
# Windows
netstat -ano | findstr :3000

# เปลี่ยน port ใน docker-compose.yml
PORT=3001 docker-compose up -d
```

### Image size ใหญ่เกินไป

- ตรวจสอบว่า `.dockerignore` ครบถ้วน
- ลบ `node_modules` ก่อน build

### Environment variables ไม่ทำงาน

```bash
# ตรวจสอบ env ใน container
docker exec slcc-hub-web env

# Rebuild container
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Best Practices

1. **ใช้ HTTPS ใน production:**
   - Setup reverse proxy (nginx, Caddy)
   - ใช้ Let's Encrypt สำหรับ SSL certificate

2. **Resource Limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
   ```

3. **Logging:**
   - ตั้งค่า log rotation (ทำแล้วใน docker-compose.yml)
   - ส่ง logs ไปยัง external service (Datadog, CloudWatch, etc.)

4. **Backup:**
   - Backup MongoDB ก่อน deploy (ดู MONGODB_BACKUP.md)
   - Test restore process

5. **Security:**
   - อย่า commit `.env` เข้า Git
   - Rotate secrets เป็นประจำ
   - ใช้ strong passwords
   - อัพเดท dependencies เป็นประจำ

---

## Update Application

### การอัพเดทโค้ด

1. **Pull code ใหม่:**
   ```bash
   git pull
   ```

2. **Rebuild image:**
   ```bash
   docker-compose build
   ```

3. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Zero-downtime deployment (Advanced)

ใช้ blue-green deployment หรือ rolling update strategy

---

## Monitoring และ Maintenance

### Log Monitoring

```bash
# ดู real-time logs
docker-compose logs -f web

# ดู logs ย้อนหลัง 100 บรรทัด
docker-compose logs --tail=100 web
```

### Resource Usage

```bash
# ดู CPU, Memory usage
docker stats slcc-hub-web
```

### Cleanup

```bash
# ลบ stopped containers
docker container prune

# ลบ unused images
docker image prune

# ลบ unused volumes
docker volume prune
```

---

## Support

หากพบปัญหาในการ deploy:
1. ตรวจสอบ [Troubleshooting](#troubleshooting) section
2. ดู container logs
3. ตรวจสอบ environment variables
4. ทดสอบ health check endpoint
