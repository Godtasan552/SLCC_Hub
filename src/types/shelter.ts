// ❌ DailyLog ไม่ใช้แล้ว (เก็บไว้เพื่อ backward compatibility ชั่วคราว)
export interface DailyLog {
  date: string;
  checkIn: number;
  checkOut: number;
}

export interface ResourceRequest {
  _id?: string;
  category: 'Medical' | 'Food' | 'Supplies' | 'Others';
  itemName: string;
  itemType?: string;
  amount: number;
  unit?: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'Pending' | 'Approved' | 'Received' | 'Rejected';
  requestedAt: string;
}

export interface Shelter {
  _id: string;
  name: string;
  district: string;
  subdistrict?: string;
  capacity: number;
  phoneNumbers?: string[];
  resources?: ResourceRequest[];
  
  // ✅ Fields ที่คำนวณจาก backend (optional)
  currentOccupancy?: number;      // คำนวณจาก ShelterLog
  capacityStatus?: string;        // คำนวณจาก currentOccupancy
  recentMovement?: {              // คำนวณจาก ShelterLog ตาม timeRange
    in: number;
    out: number;
  };
  
  // ❌ ไม่ใช้แล้ว (เก็บไว้เพื่อ backward compatibility ชั่วคราว)
  dailyLogs?: DailyLog[];
  
  createdAt?: string;
  updatedAt?: string;
}

export interface Stats {
  totalShelters: number;
  totalCapacity: number;
  totalOccupancy: number;
  criticalShelters: number;
  warningShelters: number;
  totalResourceRequests: number;
  totalSupplies?: number;
  lowStockSupplies?: number;
  outOfStockSupplies?: number;
}
