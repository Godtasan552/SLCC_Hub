import { DailyLog } from "@/types/shelter";

/**
 * คำนวณยอดสะสมการเข้า-ออกตามช่วงเวลา (ย้อนหลังกี่วัน)
 * ยึดตามเขตเวลาประเทศไทย UTC+7
 */
export const getAggregatedMovement = (logs: DailyLog[] | undefined, timeRangeDays: number) => {
  if (!logs || !Array.isArray(logs)) return { in: 0, out: 0 };
  
  const targetDates: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < timeRangeDays; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // ใช้ toLocaleDateString('en-CA') จะได้ format YYYY-MM-DD ตาม local time ของเครื่อง
    const dateStr = d.toLocaleDateString('en-CA'); 
    targetDates.push(dateStr);
  }

  return logs
    .filter(log => targetDates.includes(log.date))
    .reduce((acc, log) => ({
      in: acc.in + (Number(log.checkIn) || 0),
      out: acc.out + (Number(log.checkOut) || 0)
    }), { in: 0, out: 0 });
};

/**
 * คำนวณสถานะความหนาแน่น (Capacity Status)
 */
export const getCapacityStatus = (occupancy: number, capacity: number) => {
  const percent = (occupancy / (capacity || 1)) * 100;
  if (percent >= 100) return { text: "ล้นศูนย์", color: "danger", percent };
  if (percent >= 80) return { text: "ใกล้เต็ม", color: "warning", percent };
  return { text: "รองรับได้", color: "success", percent };
};
