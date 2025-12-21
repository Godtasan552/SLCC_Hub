import { Schema, model, models } from 'mongoose';
import { SupplyCategory } from '@/types/supply';

const SupplySchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    enum: Object.values(SupplyCategory),
    required: true 
  },
  quantity: { 
    type: Number, 
    default: 0,
    min: 0
  },
  unit: { 
    type: String, 
    default: 'ชิ้น' // หน่วย เช่น ชิ้น, กล่อง, ขวด, ถุง
  },
  description: { 
    type: String 
  },
  shelterId: {
    type: Schema.Types.ObjectId,
    ref: 'Shelter',
    required: false // ถ้าเป็นสต็อกกลางอาจไม่มี shelterId
  },
  shelterName: {
    type: String // เก็บชื่อศูนย์เพื่อความสะดวกในการค้นหา
  },
  expiryDate: {
    type: Date // สำหรับสิ่งของที่มีวันหมดอายุ เช่น อาหาร ยา
  },
  supplier: {
    type: String // ผู้บริจาค/แหล่งที่มา
  },
  notes: {
    type: String // หมายเหตุเพิ่มเติม
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default models.Supply || model('Supply', SupplySchema);
