import { Schema, model, models } from 'mongoose';

// ใช้ schema เดียวกับ ResourceRequest เพื่อความสอดคล้อง แต่เก็บแยก collection
const HubResourceRequestSchema = new Schema({
  category: { 
    type: String, 
    required: true 
    // Support both Thai and English categories - no enum restriction
  },
  itemName: { type: String, required: true },
  amount: { type: Number, default: 0 },
  unit: { type: String },
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['Pending', 'Approved', 'Received', 'Rejected'], default: 'Pending' },
  requestedAt: { type: Date, default: Date.now }
});

const HubSchema = new Schema({
  name: { type: String, required: true, unique: true },
  district: { type: String },
  subdistrict: { type: String },
  phoneNumbers: [String],
  resources: [HubResourceRequestSchema], // รายการที่คลังนี้ "ต้องการ" (เพื่อรับบริจาค)
  updatedAt: { type: Date, default: Date.now }
});

// Force delete model cache to ensure schema updates are applied in development
if (models && models.Hub) {
  delete (models as { [key: string]: unknown }).Hub;
}

export default models.Hub || model('Hub', HubSchema);
