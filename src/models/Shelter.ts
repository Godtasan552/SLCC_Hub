import { Schema, model, models } from 'mongoose';

// โครงสร้างการขอทรัพยากร
const ResourceRequestSchema = new Schema({
  category: { 
    type: String, 
    enum: ['Medical', 'Food', 'Supplies', 'Others'], // ยา, อาหาร, ของใช้, อื่นๆ
    required: true 
  },
  itemName: { type: String, required: true }, // เช่น "ยาแก้ปวด"
  itemType: { type: String }, // ประเภทแยกย่อย เช่น "ยาสามัญ", "ยาฆ่าเชื้อ"
  amount: { type: Number, default: 0 },
  unit: { type: String }, // แผง, กล่อง, กิโลกรัม
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['Pending', 'Approved', 'Shipped', 'Received'], default: 'Pending' },
  requestedAt: { type: Date, default: Date.now }
});

const ShelterSchema = new Schema({
  name: { type: String, required: true },
  district: { type: String, required: true },
  subdistrict: { type: String },
  capacity: { type: Number, default: 0 },
  currentOccupancy: { type: Number, default: 0 }, // จำนวนคนปัจจุบัน (คีย์เพิ่มเองได้)
  phoneNumbers: [String],
  capacityStatus: { type: String }, // ล้นศูนย์, ใกล้เต็ม, รองรับได้
  resources: [ResourceRequestSchema], // รายการสิ่งของที่ศูนย์นี้ร้องขอ
  updatedAt: { type: Date, default: Date.now }
});

export default models.Shelter || model('Shelter', ShelterSchema);