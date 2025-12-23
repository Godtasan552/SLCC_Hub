// app/api/shelters/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const body = await req.json();
    const { currentOccupancy, action, amount, name, district, subdistrict, capacity, phoneNumbers } = body;
    const { id } = await params;

    const shelter = await Shelter.findById(id);
    if (!shelter) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });

    // --- Update General Info ---
    if (name) shelter.name = name;
    if (district) shelter.district = district;
    if (subdistrict !== undefined) shelter.subdistrict = subdistrict;
    if (capacity) shelter.capacity = capacity;
    if (phoneNumbers) shelter.phoneNumbers = phoneNumbers;

    // --- Update Occupancy Logic ---
    // คำนวณวันที่ปัจจุบันประเทศไทย (UTC+7) รูปแบบ YYYY-MM-DD
    const thDate = new Date(new Date().getTime() + (7 * 60 * 60 * 1000)).toISOString().split('T')[0];

    const oldOccupancy = shelter.currentOccupancy || 0;
    let newOccupancy = oldOccupancy;

    // 1. กรณีระบุจำนวนใหม่ตรงๆ (Manual Edit / Import)
    if (currentOccupancy !== undefined) {
      newOccupancy = Number(currentOccupancy);
    } 
    // 2. กรณีใช้ปุ่ม Check-in / Check-out
    else if (action && amount) {
      const val = Number(amount) || 0;
      if (action === 'in') newOccupancy += val;
      else if (action === 'out') newOccupancy = Math.max(0, newOccupancy - val);
    }

    // คำนวณส่วนต่างเพื่อบันทึกประวัติ (Movement)
    const diff = newOccupancy - oldOccupancy;

    if (diff !== 0) {
      if (!shelter.dailyLogs) shelter.dailyLogs = [];
      
      interface DailyLog { date: string; checkIn: number; checkOut: number; }
      let logIndex = shelter.dailyLogs.findIndex((log: DailyLog) => log.date === thDate);
      
      if (logIndex === -1) {
        shelter.dailyLogs.push({ date: thDate, checkIn: 0, checkOut: 0 });
        logIndex = shelter.dailyLogs.length - 1;
      }

      if (diff > 0) {
        shelter.dailyLogs[logIndex].checkIn = (shelter.dailyLogs[logIndex].checkIn || 0) + diff;
      } else {
        shelter.dailyLogs[logIndex].checkOut = (shelter.dailyLogs[logIndex].checkOut || 0) + Math.abs(diff);
      }
      
      // บังคับให้ Mongoose บันทึกการเปลี่ยนแปลงใน Array
      shelter.markModified('dailyLogs');
    }

    // บันทึกสถานะใหม่
    let newStatus = 'รองรับได้';
    const currentCap = capacity || shelter.capacity || 1;
    const ratio = (newOccupancy / currentCap) * 100;
    if (ratio >= 100) newStatus = 'ล้นศูนย์';
    else if (ratio >= 80) newStatus = 'ใกล้เต็ม';

    shelter.currentOccupancy = newOccupancy;
    shelter.capacityStatus = newStatus;
    shelter.updatedAt = new Date();
    
    await shelter.save();
    return NextResponse.json({ success: true, data: shelter });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const shelter = await Shelter.findByIdAndDelete(id);

    if (!shelter) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลที่ต้องการลบ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'ลบข้อมูลเรียบร้อย' });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}