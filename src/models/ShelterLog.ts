import { Schema, model, models } from 'mongoose';

/**
 * ShelterLog Model
 * 
 * เก็บประวัติการรับเข้า/ส่งออกผู้อพยพแต่ละครั้ง
 * แยกออกจาก Shelter เพื่อให้มีประวัติย้อนหลังและคำนวณยอดได้ถูกต้อง
 */
const ShelterLogSchema = new Schema({
  shelterId: {
    type: Schema.Types.ObjectId,
    ref: 'Shelter',
    required: true,
    index: true // เพิ่ม index เพื่อ query เร็วขึ้น
  },
  action: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  date: { 
    type: Date, 
    default: () => new Date(),
    index: true // เพิ่ม index สำหรับ filter ตามวันที่
  },
  note: { 
    type: String // Optional: บันทึกเพิ่มเติม
  }
}, { 
  timestamps: true // เพิ่ม createdAt และ updatedAt อัตโนมัติ
});

// Compound index สำหรับ query ที่ใช้บ่อย
ShelterLogSchema.index({ shelterId: 1, date: -1 });

export default models.ShelterLog || model('ShelterLog', ShelterLogSchema);
