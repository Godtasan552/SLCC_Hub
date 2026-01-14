# MongoDB Backup and Restore Guide

คู่มือการ backup และ restore ข้อมูล MongoDB สำหรับ SLCC Hub

## Overview

MongoDB Atlas มี backup ระบบหลายแบบ:
1. **Continuous Backup** - Point-in-time recovery (แนะนำ)
2. **Cloud Backup (Snapshots)** - Scheduled snapshots
3. **Manual Backup** - Export ด้วย mongodump

---

## 1. MongoDB Atlas Continuous Backup (แนะนำที่สุด)

### ข้อดี
- ✅ Point-in-time recovery (กู้คืนข้อมูล ณ เวลาใดก็ได้)
- ✅ Automatic snapshots ทุก 6-12 ชั่วโมง
- ✅ Retain ได้นานถึง 30 วัน
- ✅ ไม่ต้องจัดการเอง

### ข้อเสีย
- ❌ ต้องใช้ M10 cluster ขึ้นไป (เสียค่าใช้จ่าย)
- ❌ Free tier (M0) ไม่มี

### วิธีเปิดใช้งาน

1. **Login เข้า MongoDB Atlas:**
   - https://cloud.mongodb.com

2. **เลือก Cluster:**
   - Project → Clusters → เลือก cluster ของคุณ

3. **เปิด Backup:**
   - Backup tab → Turn On Cloud Backup
   - หรือ Continuous Backup (M10+)

4. **กำหนด Schedule:**
   - Snapshot frequency: ทุก 6h, 12h, หรือ 24h
   - Retention period: 7, 14, หรือ 30 วัน

5. **Test Restore:**
   - Backup tab → Restore
   - เลือก snapshot หรือ point-in-time
   - Restore to new cluster (ทดสอบก่อน)

---

## 2. Cloud Backup (Snapshots)

### สำหรับ Free Tier (M0)

**หมายเหตุ:** M0 free cluster ไม่มี automated backup ต้องใช้ manual backup

### วิธีตั้งค่า Snapshot Backup

1. **เข้า Backup Settings:**
   ```
   Cluster → Backup → Configure Backup
   ```

2. **ตั้งค่า Schedule:**
   ```yaml
   Snapshot Schedule:
     - Every 6 hours (retain 2 days)
     - Daily (retain 7 days)
     - Weekly (retain 4 weeks)
     - Monthly (retain 12 months)
   ```

3. **Storage Location:**
   - เลือก region ที่ใกล้ที่สุด

---

## 3. Manual Backup ด้วย mongodump

### สำหรับ Free Tier และ Extra Safety

### ติดตั้ง MongoDB Database Tools

#### Windows
```powershell
# Download MongoDB Database Tools
# https://www.mongodb.com/try/download/database-tools

# หรือใช้ chocolatey
choco install mongodb-database-tools
```

#### macOS
```bash
brew install mongodb/brew/mongodb-database-tools
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install mongodb-database-tools

# RHEL/CentOS
sudo yum install mongodb-database-tools
```

### Backup ทั้งหมด

```bash
# Export ข้อมูลทั้งหมด
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  --out="./backups/backup-$(date +%Y%m%d-%H%M%S)"
```

### Backup เฉพาะ Database

```bash
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  --db=slcc_hub \
  --out="./backups/slcc_hub-$(date +%Y%m%d-%H%M%S)"
```

### Backup เฉพาะ Collection

```bash
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  --collection=orders \
  --out="./backups/orders-$(date +%Y%m%d-%H%M%S)"
```

### Backup แบบ Gzip (ประหยัดพื้นที่)

```bash
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  --gzip \
  --out="./backups/backup-$(date +%Y%m%d-%H%M%S)"
```

---

## 4. Restore จาก Backup

### Restore จาก mongodump

```bash
# Restore ทั้งหมด
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  ./backups/backup-20260114-120000

# Restore เฉพาะ database
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  --db=slcc_hub \
  ./backups/backup-20260114-120000/slcc_hub

# Restore และ drop existing collections ก่อน
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  --drop \
  ./backups/backup-20260114-120000

# Restore จาก gzip
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub" \
  --gzip \
  ./backups/backup-20260114-120000
```

### Restore จาก Atlas Snapshot

1. **เข้า Backup tab:**
   ```
   Cluster → Backup → View All Snapshots
   ```

2. **เลือก Snapshot:**
   - เลือกวันเวลาที่ต้องการ restore

3. **Restore Options:**
   - **Download:** Export เป็นไฟล์ (ปลอดภัยที่สุด)
   - **Automated Restore:** Restore เข้า cluster ใหม่
   - **Point-in-Time:** เลือกเวลาแม่นยำ (Continuous Backup only)

4. **Restore:**
   - เลือก "Restore to new cluster" (ไม่ทับข้อมูลเดิม)
   - ทดสอบให้แน่ใจก่อน swap

---

## 5. Automated Backup Scripts

### Windows PowerShell Script

สร้างไฟล์ `backup-mongodb.ps1`:

```powershell
# MongoDB Backup Script
$DATE = Get-Date -Format "yyyyMMdd-HHmmss"
$BACKUP_DIR = "C:\backups\mongodb"
$MONGODB_URI = $env:MONGODB_URI

# สร้าง backup directory
New-Item -ItemType Directory -Force -Path "$BACKUP_DIR\backup-$DATE"

# Run mongodump
mongodump --uri="$MONGODB_URI" `
  --gzip `
  --out="$BACKUP_DIR\backup-$DATE"

Write-Host "Backup completed: $BACKUP_DIR\backup-$DATE"

# ลบ backup เก่าที่มีอายุเกิน 30 วัน
Get-ChildItem -Path $BACKUP_DIR -Directory | 
  Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-30) } | 
  Remove-Item -Recurse -Force

Write-Host "Old backups cleaned up"
```

### ตั้งค่า Windows Task Scheduler

1. **เปิด Task Scheduler**
2. **สร้าง new task:**
   - Name: "MongoDB Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Run PowerShell script
     ```
     powershell.exe -ExecutionPolicy Bypass -File "C:\path\to\backup-mongodb.ps1"
     ```

### Linux/Mac Bash Script

สร้างไฟล์ `backup-mongodb.sh`:

```bash
#!/bin/bash

# MongoDB Backup Script
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/mongodb"
MONGODB_URI="$MONGODB_URI"  # จาก environment variable

# สร้าง backup directory
mkdir -p "$BACKUP_DIR/backup-$DATE"

# Run mongodump
mongodump --uri="$MONGODB_URI" \
  --gzip \
  --out="$BACKUP_DIR/backup-$DATE"

echo "Backup completed: $BACKUP_DIR/backup-$DATE"

# ลบ backup เก่าที่มีอายุเกิน 30 วัน
find "$BACKUP_DIR" -name "backup-*" -type d -mtime +30 -exec rm -rf {} \;

echo "Old backups cleaned up"
```

### ตั้งค่า Cron Job

```bash
# Edit crontab
crontab -e

# เพิ่มบรรทัดนี้ (backup ทุกวันเวลา 02:00)
0 2 * * * /path/to/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## 6. Backup Schedule แนะนำ

| Backup Type | Frequency | Retention | Tool | Priority |
|-------------|-----------|-----------|------|----------|
| Continuous | Every 6h | 30 days | Atlas | 🔴 High |
| Full Backup | Daily | 90 days | mongodump | 🟡 Medium |
| Pre-deployment | Manual | 90 days | mongodump | 🟢 Low |
| Weekly Archive | Weekly | 1 year | mongodump | 🟢 Low |

---

## 7. Backup Verification

### ทดสอบ Restore เป็นประจำ

```bash
# 1. สร้าง test database
# 2. Restore backup เข้า test database
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/slcc_hub_test" \
  --drop \
  ./backups/latest

# 3. ตรวจสอบข้อมูล
mongosh "mongodb+srv://username:password@cluster.mongodb.net/slcc_hub_test" \
  --eval "db.orders.count()"

# 4. ลบ test database
mongosh "mongodb+srv://username:password@cluster.mongodb.net/slcc_hub_test" \
  --eval "db.dropDatabase()"
```

---

## 8. Disaster Recovery Plan

### กรณีข้อมูลสูญหาย

1. **อย่าตื่นตระหนก:**
   - Stop application ทันที
   - ห้ามลบหรือแก้ไขข้อมูล

2. **ระบุปัญหา:**
   - ข้อมูลสูญหายทั้งหมดหรือบางส่วน?
   - เกิดขึ้นเมื่อไหร่?

3. **เลือก Recovery Point:**
   - Point-in-time ก่อนเกิดปัญหา
   - หรือ snapshot ล่าสุด

4. **Restore to New Cluster:**
   - ไม่ restore ทับของเดิมทันที
   - Verify ข้อมูลใน new cluster ก่อน

5. **Swap Clusters:**
   - Update `MONGODB_URI` ใน environment
   - Restart application

---

## 9. Best Practices

### ✅ ควรทำ

- ✅ เปิด Atlas Continuous Backup (ถ้าเป็นไปได้)
- ✅ Backup ก่อน deploy version ใหม่เสมอ
- ✅ Test restore process อย่างน้อยเดือนละครั้ง
- ✅ เก็บ backup หลายที่ (local + cloud)
- ✅ Encrypt backup files
- ✅ ตั้ง retention policy ที่เหมาะสม
- ✅ Monitor backup success/failure

### ❌ ไม่ควรทำ

- ❌ พึ่งพา backup เพียงแหล่งเดียว
- ❌ ลืม test restore
- ❌ เก็บ backup credentials ไว้ใน Git
- ❌ Restore ทับ production โดยไม่ verify
- ❌ เก็บ backup ไว้นานเกินไปจนเต็ม disk

---

## 10. Backup Checklist

### ก่อน Deploy Production

- [ ] เปิด Atlas Continuous Backup (ถ้าเป็น M10+)
- [ ] ตั้งค่า scheduled backup script
- [ ] Test restore process
- [ ] Document recovery procedures
- [ ] Setup monitoring alerts

### ทุกสัปดาห์

- [ ] ตรวจสอบ backup logs
- [ ] Verify backup files exist
- [ ] Check disk space

### ทุกเดือน

- [ ] Test restore from backup
- [ ] Review retention policies
- [ ] Update disaster recovery plan

---

## Support

สำหรับข้อมูลเพิ่มเติม:
- [MongoDB Atlas Backup Documentation](https://docs.atlas.mongodb.com/backup/)
- [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/)
