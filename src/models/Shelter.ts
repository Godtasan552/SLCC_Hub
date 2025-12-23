import { Schema, model, models } from 'mongoose';

// โครงสร้างการขอทรัพยากร
const ResourceRequestSchema = new Schema({
  category: { 
    type: String,
    // Support both Thai and English categories
    required: true 
  },
  itemName: { type: String, required: true }, // เช่น "ยาแก้ปวด"
  itemType: { type: String }, // ประเภทแยกย่อย เช่น "ยาสามัญ", "ยาฆ่าเชื้อ"
  amount: { type: Number, default: 0 },
  unit: { type: String }, // แผง, กล่อง, กิโลกรัม
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['Pending', 'Approved', 'Shipped', 'Received', 'Rejected'], default: 'Pending' },
  requestedAt: { type: Date, default: Date.now }
});

// โครงสร้างบันทึกรายวัน (สำหรับ Dashboard)
const DailyOccupancySchema = new Schema({
  date: { type: String, required: true }, // Format "YYYY-MM-DD"
  checkIn: { type: Number, default: 0 },
  checkOut: { type: Number, default: 0 }
});

const ShelterSchema = new Schema({
  name: { type: String, required: true, unique: true }, // ห้ามสร้างชื่อที่ซ้ำกัน
  type: { type: String, enum: ['Hub', 'Shelter'], default: 'Shelter' }, // แยก "คลังกลาง" กับ "ศูนย์พักพิง"
  district: { type: String, required: true },
  subdistrict: { type: String },
  capacity: { type: Number, default: 0 },
  currentOccupancy: { type: Number, default: 0 }, // จำนวนคนปัจจุบัน
  phoneNumbers: [String],
  capacityStatus: { type: String }, // ล้นศูนย์, ใกล้เต็ม, รองรับได้
  resources: [ResourceRequestSchema], // รายการสิ่งของที่ศูนย์นี้ร้องขอ
  dailyLogs: [DailyOccupancySchema], // บันทึกเข้า-ออกรายวัน
  updatedAt: { type: Date, default: Date.now }
});

export default models.Shelter || model('Shelter', ShelterSchema);