import { Schema, model, models } from 'mongoose';

// ใช้ schema เดียวกับ ResourceRequest เพื่อความสอดคล้อง แต่เก็บแยก collection
const HubResourceRequestSchema = new Schema({
  category: { type: String, required: true },
  itemName: { type: String, required: true },
  amount: { type: Number, default: 0 },
  unit: { type: String },
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['Pending', 'Approved', 'Shipped', 'Received'], default: 'Pending' },
  requestedAt: { type: Date, default: Date.now }
});

const HubSchema = new Schema({
  name: { type: String, required: true, unique: true },
  district: { type: String },
  subdistrict: { type: String },
  resources: [HubResourceRequestSchema], // รายการที่คลังนี้ "ต้องการ" (เพื่อรับบริจาค)
  updatedAt: { type: Date, default: Date.now }
});

export default models.Hub || model('Hub', HubSchema);
