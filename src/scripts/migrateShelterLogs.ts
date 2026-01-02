/**
 * Migration Script: Migrate dailyLogs to ShelterLog
 * 
 * สคริปต์นี้จะย้ายข้อมูล dailyLogs จาก Shelter ไปเป็น ShelterLog
 * และลบ currentOccupancy, capacityStatus, dailyLogs ออกจาก Shelter
 * 
 * วิธีใช้:
 * npx tsx src/scripts/migrateShelterLogs.ts
 */

import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import ShelterLog from '@/models/ShelterLog';
import mongoose from 'mongoose';

interface DailyLog {
  date: string;
  checkIn: number;
  checkOut: number;
}

interface OldShelter {
  _id: mongoose.Types.ObjectId;
  name: string;
  dailyLogs?: DailyLog[];
  currentOccupancy?: number;
  capacityStatus?: string;
}

async function migrateShelterLogs() {
  try {
    await dbConnect();
    console.log('🔄 เริ่มต้น Migration...\n');

    // ดึง Shelters ที่มี dailyLogs
    const shelters = await Shelter.find({
      dailyLogs: { $exists: true, $ne: [] }
    }) as unknown as OldShelter[];

    console.log(`📊 พบศูนย์ที่มี dailyLogs: ${shelters.length} ศูนย์\n`);

    let totalLogsCreated = 0;
    let totalSheltersUpdated = 0;

    for (const shelter of shelters) {
      console.log(`\n🏢 กำลังประมวลผล: ${shelter.name}`);
      
      if (!shelter.dailyLogs || shelter.dailyLogs.length === 0) {
        console.log('   ⏭️  ไม่มี dailyLogs ข้าม...');
        continue;
      }

      let logsCreated = 0;

      // แปลง dailyLogs เป็น ShelterLog
      for (const log of shelter.dailyLogs) {
        // สร้าง log สำหรับ checkIn
        if (log.checkIn && log.checkIn > 0) {
          await ShelterLog.create({
            shelterId: shelter._id,
            action: 'in',
            amount: log.checkIn,
            date: new Date(log.date),
            note: 'Migrated from dailyLogs'
          });
          logsCreated++;
        }

        // สร้าง log สำหรับ checkOut
        if (log.checkOut && log.checkOut > 0) {
          await ShelterLog.create({
            shelterId: shelter._id,
            action: 'out',
            amount: log.checkOut,
            date: new Date(log.date),
            note: 'Migrated from dailyLogs'
          });
          logsCreated++;
        }
      }

      console.log(`   ✅ สร้าง ShelterLog: ${logsCreated} รายการ`);
      totalLogsCreated += logsCreated;

      // ลบ fields เก่าออก
      await Shelter.updateOne(
        { _id: shelter._id },
        { 
          $unset: { 
            dailyLogs: "",
            currentOccupancy: "",
            capacityStatus: ""
          } 
        }
      );
      
      console.log(`   🗑️  ลบ dailyLogs, currentOccupancy, capacityStatus แล้ว`);
      totalSheltersUpdated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration เสร็จสมบูรณ์!');
    console.log('='.repeat(60));
    console.log(`📈 สรุปผลลัพธ์:`);
    console.log(`   - ศูนย์ที่อัปเดต: ${totalSheltersUpdated} ศูนย์`);
    console.log(`   - ShelterLog ที่สร้าง: ${totalLogsCreated} รายการ`);
    console.log('='.repeat(60) + '\n');

    // ตรวจสอบผลลัพธ์
    const remainingSheltersWithLogs = await Shelter.countDocuments({
      dailyLogs: { $exists: true, $ne: [] }
    });

    if (remainingSheltersWithLogs > 0) {
      console.warn(`⚠️  เตือน: ยังมีศูนย์ที่มี dailyLogs อยู่: ${remainingSheltersWithLogs} ศูนย์`);
    } else {
      console.log('✅ ไม่มีศูนย์ที่มี dailyLogs เหลืออยู่แล้ว');
    }

    const totalShelterLogs = await ShelterLog.countDocuments();
    console.log(`📊 จำนวน ShelterLog ทั้งหมดในระบบ: ${totalShelterLogs} รายการ\n`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดระหว่าง Migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อ Database แล้ว');
  }
}

// เรียกใช้งาน
migrateShelterLogs();
