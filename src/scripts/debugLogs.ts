import dbConnect from '../lib/dbConnect';
import Shelter from '../models/Shelter';
import ShelterLog from '../models/ShelterLog';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function checkLogs() {
  try {
    await dbConnect();
    
    // ดึงรายชื่อศูนย์มา 10 แห่ง
    const shelters = await Shelter.find({ type: 'Shelter' }).limit(10);
    
    console.log('\n--- 📊 Debugging Shelter Occupancy (New Model) ---');
    
    for (const s of shelters) {
      // ดึง log ล่าสุด 5 รายการ
      const logs = await ShelterLog.find({ shelterId: s._id })
        .sort({ date: -1 })
        .limit(5);

      // คำนวณจำนวนคนปัจจุบัน (Sum In - Sum Out)
      const allLogs = await ShelterLog.find({ shelterId: s._id });
      const current = allLogs.reduce((acc, log) => {
        return log.action === 'in' ? acc + log.amount : acc - log.amount;
      }, 0);

      console.log(`\n🏢 ศูนย์: ${s.name}`);
      console.log(`👥 จำนวนคนปัจจุบัน: ${current} / ${s.capacity || 'ไม่ระบุ'}`);
      console.log(`🕒 ประวัติล่าสุด:`);
      
      if (logs.length === 0) {
        console.log('   (ไม่มีประวัติการทำรายการ)');
      } else {
        logs.forEach(log => {
          const time = new Date(log.date).toLocaleString('th-TH');
          const type = log.action === 'in' ? '➕ รับเข้า' : '➖ ส่งออก';
          console.log(`   [${time}] ${type} ${log.amount} คน (${log.note || '-'})`);
        });
      }
      console.log('-'.repeat(40));
    }

  } catch (error) {
    console.error('❌ Error debugging logs:', error);
  } finally {
    process.exit(0);
  }
}

checkLogs();
