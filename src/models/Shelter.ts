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
  sourceHubId: { type: String }, // ID of the hub providing the item
  sourceHubName: { type: String }, // Name of the hub for display
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['Pending', 'Approved', 'Received', 'Rejected'], default: 'Pending' },
  requestedAt: { type: Date, default: Date.now }
});



const ShelterSchema = new Schema({
  name: { type: String, required: true, unique: true }, // ห้ามสร้างชื่อที่ซ้ำกัน
  type: { type: String, enum: ['Hub', 'Shelter'], default: 'Shelter' }, // แยก "คลังกลาง" กับ "ศูนย์พักพิง"
  district: { type: String, required: true },
  subdistrict: { type: String },
  capacity: { type: Number, default: 0 },
  phoneNumbers: [String],
  resources: [ResourceRequestSchema], // รายการสิ่งของที่ศูนย์นี้ร้องขอ
  // ❌ ลบ currentOccupancy, capacityStatus, dailyLogs ออก
  // ✅ จะคำนวณจาก ShelterLog แทน
}, { 
  timestamps: true // เพิ่ม createdAt และ updatedAt อัตโนมัติ
});

// เพิ่ม Index เพื่อความเร็วในการรัน Aggregation
ShelterSchema.index({ district: 1 });

export default models.Shelter || model('Shelter', ShelterSchema);