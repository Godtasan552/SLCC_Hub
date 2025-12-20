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
  status: 'Pending' | 'Approved' | 'Shipped' | 'Received';
  requestedAt: string;
}

export interface Shelter {
  _id: string;
  name: string;
  district: string;
  subdistrict?: string;
  capacity: number;
  currentOccupancy: number;
  phoneNumbers?: string[];
  capacityStatus?: string;
  resources?: ResourceRequest[];
  dailyLogs?: DailyLog[];
  updatedAt?: string;
}

export interface Stats {
  totalShelters: number;
  totalCapacity: number;
  totalOccupancy: number;
  criticalShelters: number;
  warningShelters: number;
  totalMedicalRequests: number;
}
