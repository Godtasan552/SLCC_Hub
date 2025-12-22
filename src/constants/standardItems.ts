import { SupplyCategory } from '@/types/supply';

export interface StandardItem {
  name: string;
  category: SupplyCategory;
  defaultUnit: string;
}

export const STANDARD_ITEMS: StandardItem[] = [
  // ยา และเวชภัณฑ์
  { name: 'พาราเซตามอล (500mg)', category: SupplyCategory.MEDICINE, defaultUnit: 'แผง' },
  { name: 'ยาแก้แพ้', category: SupplyCategory.MEDICINE, defaultUnit: 'แผง' },
  { name: 'ยาธาตุน้ำขาว', category: SupplyCategory.MEDICINE, defaultUnit: 'ขวด' },
  { name: 'แอลกอฮอล์ล้างแผล', category: SupplyCategory.MEDICINE, defaultUnit: 'ขวด' },
  { name: 'ผ้าพันแผล (Bandage)', category: SupplyCategory.MEDICINE, defaultUnit: 'ม้วน' },
  { name: 'ชุดทำแผลเบื้องต้น', category: SupplyCategory.MEDICINE, defaultUnit: 'ชุด' },
  { name: 'หน้ากากอนามัย', category: SupplyCategory.MEDICINE, defaultUnit: 'กล่อง' },
  
  // อาหารและน้ำดื่ม
  { name: 'น้ำดื่ม (600ml)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'แพ็ค' },
  { name: 'น้ำดื่ม (1500ml)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'แพ็ค' },
  { name: 'ข้าวสาร (5กก.)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ถุง' },
  { name: 'บะหมี่กึ่งสำเร็จรูป', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ลัง' },
  { name: 'ปลากระป๋อง', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'แพ็ค' },
  { name: 'นมยูเอชที (เด็ก)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ลัง' },
  { name: 'ไข่ไก่ (เบอร์ 2)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ถาด' },
  
  // สิ่งของเครื่องใช้
  { name: 'สบู่', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'ก้อน' },
  { name: 'ยาสีฟัน', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'หลอด' },
  { name: 'แปรงสีฟัน', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'อัน' },
  { name: 'กระดาษชำระ', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'แพ็ค' },
  { name: 'ผ้าอนามัย', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'ห่อ' },
  { name: 'ผงซักฟอก', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'ถุง' },
  
  // ผ้าห่ม และหมอน
  { name: 'ผ้าห่ม', category: SupplyCategory.BEDDING, defaultUnit: 'ผืน' },
  { name: 'หมอน', category: SupplyCategory.BEDDING, defaultUnit: 'ใบ' },
  { name: 'ฟูกที่นอน / เสื่อ', category: SupplyCategory.BEDDING, defaultUnit: 'ชิ้น' },
  { name: 'มุ้ง', category: SupplyCategory.BEDDING, defaultUnit: 'หลัง' },

  // ส่วนอบสำหรับเด็กเล็ก
  { name: 'ผ้าอ้อมเด็ก (S)', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'ห่อ' },
  { name: 'ผ้าอ้อมเด็ก (M)', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'ห่อ' },
  { name: 'ผ้าอ้อมเด็ก (L)', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'ห่อ' },
  { name: 'นมผงเด็ก', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'กล่อง' },
  
  // อื่นๆ
  { name: 'ถุงขยะ (ดำ)', category: SupplyCategory.CLEANING_SUPPLIES, defaultUnit: 'แพ็ค' },
  { name: 'เทียนไข', category: SupplyCategory.LIGHTING, defaultUnit: 'ห่อ' },
  { name: 'ไฟฉาย', category: SupplyCategory.LIGHTING, defaultUnit: 'กระบอก' },
  { name: 'ถ่านไฟฉาย (AA)', category: SupplyCategory.LIGHTING, defaultUnit: 'แพ็ค' },
];

export const getItemsByCategory = (category: SupplyCategory) => {
  return STANDARD_ITEMS.filter(item => item.category === category);
};
