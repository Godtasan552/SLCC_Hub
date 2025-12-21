// หมวดหมู่สิ่งของตามที่กำหนด
export enum SupplyCategory {
  // อื่นๆ และวัสดุสำรอง
  OTHER = 'อื่นๆ และวัสดุสำรอง',
  
  // ทั้งหมด
  ALL = 'ทั้งหมด',
  
  // วัตถุดิบประกอบอาหาร
  FOOD_INGREDIENTS = 'วัตถุดิบประกอบอาหาร',
  
  // สิ่งของเครื่องใช้
  DAILY_NECESSITIES = 'สิ่งของเครื่องใช้',
  
  // อาหารและน้ำดื่ม
  FOOD_AND_WATER = 'อาหารและน้ำดื่ม',
  
  // ยา และเวชภัณฑ์
  MEDICINE = 'ยา และเวชภัณฑ์',
  
  // เสื้อผ้า และรองเท้า
  CLOTHING = 'เสื้อผ้า และรองเท้า',
  
  // ผ้าห่ม และหมอน
  BEDDING = 'ผ้าห่ม และหมอน',
  
  // สุขาภิบาลและสินค้าเอกชน
  HYGIENE_PRIVATE = 'สุขาภิบาลและสินค้าเอกชน',
  
  // อุปกรณ์ทำความสะอาด
  CLEANING_SUPPLIES = 'อุปกรณ์ทำความสะอาด',
  
  // อุปกรณ์หลอดไฟและไฟฉาย
  LIGHTING = 'อุปกรณ์หลอดไฟและไฟฉาย',
  
  // ควดวิหยุ สาระไทรสัญญาณ
  ANIMAL_CARE = 'ควดวิหยุ สาระไทรสัญญาณ',
  
  // เชื้อเพลิง และน้ำมัน
  FUEL = 'เชื้อเพลิง และน้ำมัน',
  
  // ถังและภาชนะเก็บของ
  CONTAINERS = 'ถังและภาชนะเก็บของ',
  
  // อุปกรณ์ทำอาหาร และจานชาม
  COOKING_UTENSILS = 'อุปกรณ์ทำอาหาร และจานชาม',
  
  // ปั่นติดตั้งกุเอ่น
  DISASTER_KIT = 'ปั่นติดตั้งกุเอ่น',
  
  // แบบน้ำและวัสดุก่อสร้าง
  CONSTRUCTION = 'แบบน้ำและวัสดุก่อสร้าง',
  
  // ส่วนอบสำหรับเด็กเล็ก
  BABY_SUPPLIES = 'ส่วนอบสำหรับเด็กเล็ก',
  
  // อุปกรณ์ป้องกันส่วนบุคคล (PPE)
  PPE = 'อุปกรณ์ป้องกันส่วนบุคคล (PPE)',
  
  // อุปกรณ์ปฐมพยาบาล
  FIRST_AID = 'อุปกรณ์ปฐมพยาบาล',
  
  // สื่อสัญญาณและเอกสาร
  COMMUNICATION_DOCS = 'สื่อสัญญาณและเอกสาร',
  
  // อุปกรณ์การศึกษาสำหรับเด็ก
  EDUCATIONAL_SUPPLIES = 'อุปกรณ์การศึกษาสำหรับเด็ก',
}

export interface Supply {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  description?: string;
  shelterId?: string;
  shelterName?: string;
  expiryDate?: Date | string;
  supplier?: string;
  notes?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SupplyData {
  name: string;
  category: string;
  quantity?: number;
  unit?: string;
  description?: string;
  shelterId?: string;
  shelterName?: string;
  expiryDate?: Date | string;
  supplier?: string;
  notes?: string;
}
