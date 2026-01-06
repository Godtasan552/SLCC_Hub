/**
 * คำนวณสถานะความหนาแน่น (Capacity Status)
 * ✅ ฟังก์ชันนี้ปลอดภัยสำหรับใช้ทั้ง Client และ Server
 */
export const getCapacityStatus = (occupancy: number, capacity: number) => {
  const percent = (occupancy / (capacity || 1)) * 100;
  if (percent >= 100) return { text: "ล้นศูนย์", color: "danger", percent };
  if (percent >= 80) return { text: "ใกล้เต็ม", color: "warning", percent };
  return { text: "รองรับได้", color: "success", percent };
};
