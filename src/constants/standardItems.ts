import { SupplyCategory } from '@/types/supply';

export interface StandardItem {
  name: string;
  category: SupplyCategory;
  defaultUnit: string;
  icon: string;
}

export const STANDARD_ITEMS: StandardItem[] = [
  // ยา และเวชภัณฑ์
  { name: 'พาราเซตามอล (500mg)', category: SupplyCategory.MEDICINE, defaultUnit: 'แผง', icon: 'bi-capsule' },
  { name: 'ยาแก้แพ้', category: SupplyCategory.MEDICINE, defaultUnit: 'แผง', icon: 'bi-capsule-pill' },
  { name: 'ยาธาตุน้ำขาว', category: SupplyCategory.MEDICINE, defaultUnit: 'ขวด', icon: 'bi-droplet-half' },
  { name: 'แอลกอฮอล์ล้างแผล', category: SupplyCategory.MEDICINE, defaultUnit: 'ขวด', icon: 'bi-prescription2' },
  { name: 'ผ้าพันแผล (Bandage)', category: SupplyCategory.MEDICINE, defaultUnit: 'ม้วน', icon: 'bi-bandaid' },
  { name: 'ชุดทำแผลเบื้องต้น', category: SupplyCategory.MEDICINE, defaultUnit: 'ชุด', icon: 'bi-first-aid' },
  { name: 'หน้ากากอนามัย', category: SupplyCategory.MEDICINE, defaultUnit: 'กล่อง', icon: 'bi-mask' },
  
  // อาหารและน้ำดื่ม
  { name: 'น้ำดื่ม (600ml)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'แพ็ค', icon: 'bi-water' },
  { name: 'น้ำดื่ม (1500ml)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'แพ็ค', icon: 'bi-water' },
  { name: 'ข้าวสาร (5กก.)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ถุง', icon: 'bi-bag-fill' },
  { name: 'บะหมี่กึ่งสำเร็จรูป', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ลัง', icon: 'bi-box-seam' },
  { name: 'ปลากระป๋อง', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'แพ็ค', icon: 'bi-archive' },
  { name: 'นมยูเอชที (เด็ก)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ลัง', icon: 'bi-cup-hot' },
  { name: 'ไข่ไก่ (เบอร์ 2)', category: SupplyCategory.FOOD_AND_WATER, defaultUnit: 'ถาด', icon: 'bi-egg' },
  
  // สิ่งของเครื่องใช้
  { name: 'สบู่', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'ก้อน', icon: 'bi-soap' },
  { name: 'ยาสีฟัน', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'หลอด', icon: 'bi-tencent-qq' },
  { name: 'แปรงสีฟัน', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'อัน', icon: 'bi-brush' },
  { name: 'กระดาษชำระ', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'แพ็ค', icon: 'bi-layers' },
  { name: 'ผ้าอนามัย', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'ห่อ', icon: 'bi-droplet' },
  { name: 'ผงซักฟอก', category: SupplyCategory.DAILY_NECESSITIES, defaultUnit: 'ถุง', icon: 'bi-snow' },
  
  // ผ้าห่ม และหมอน
  { name: 'ผ้าห่ม', category: SupplyCategory.BEDDING, defaultUnit: 'ผืน', icon: 'bi-square-fill' },
  { name: 'หมอน', category: SupplyCategory.BEDDING, defaultUnit: 'ใบ', icon: 'bi-circle-square' },
  { name: 'ฟูกที่นอน / เสื่อ', category: SupplyCategory.BEDDING, defaultUnit: 'ชิ้น', icon: 'bi-grid-3x3' },
  { name: 'มุ้ง', category: SupplyCategory.BEDDING, defaultUnit: 'หลัง', icon: 'bi-umbrella' },

  // ส่วนอบสำหรับเด็กเล็ก
  { name: 'ผ้าอ้อมเด็ก (S)', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'ห่อ', icon: 'bi-baby' },
  { name: 'ผ้าอ้อมเด็ก (M)', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'ห่อ', icon: 'bi-baby' },
  { name: 'ผ้าอ้อมเด็ก (L)', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'ห่อ', icon: 'bi-baby' },
  { name: 'นมผงเด็ก', category: SupplyCategory.BABY_SUPPLIES, defaultUnit: 'กล่อง', icon: 'bi-cup-straw' },
  
  // อื่นๆ
  { name: 'ถุงขยะ (ดำ)', category: SupplyCategory.CLEANING_SUPPLIES, defaultUnit: 'แพ็ค', icon: 'bi-trash' },
  { name: 'เทียนไข', category: SupplyCategory.LIGHTING, defaultUnit: 'ห่อ', icon: 'bi-lightbulb' },
  { name: 'ไฟฉาย', category: SupplyCategory.LIGHTING, defaultUnit: 'กระบอก', icon: 'bi-flashlight' },
  { name: 'ถ่านไฟฉาย (AA)', category: SupplyCategory.LIGHTING, defaultUnit: 'แพ็ค', icon: 'bi-battery-full' },
];

export const getItemsByCategory = (category: SupplyCategory) => {
  return STANDARD_ITEMS.filter(item => item.category === category);
};
