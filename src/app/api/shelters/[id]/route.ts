// app/api/shelters/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { currentOccupancy, action, amount } = await req.json();
    const { id } = await params;

    const shelter = await Shelter.findById(id);
    if (!shelter) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });

    let finalOccupancy = shelter.currentOccupancy;
    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    // If it's a direct update (Legacy / Manual Fix)
    if (currentOccupancy !== undefined) {
      finalOccupancy = currentOccupancy;
    } 
    // If it's a Check-in / Check-out action
    else if (action && amount) {
      interface DailyLog { date: string; checkIn: number; checkOut: number; }

      if (action === 'in') {
        finalOccupancy += amount;
        
        // Update Daily Log
        const logIndex = shelter.dailyLogs.findIndex((log: DailyLog) => log.date === today);
        if (logIndex > -1) {
          shelter.dailyLogs[logIndex].checkIn += amount;
        } else {
          shelter.dailyLogs.push({ date: today, checkIn: amount, checkOut: 0 });
        }
      } else if (action === 'out') {
        finalOccupancy = Math.max(0, finalOccupancy - amount);
        
        // Update Daily Log
        const logIndex = shelter.dailyLogs.findIndex((log: DailyLog) => log.date === today);
        if (logIndex > -1) {
          shelter.dailyLogs[logIndex].checkOut += amount;
        } else {
          shelter.dailyLogs.push({ date: today, checkIn: 0, checkOut: amount });
        }
      }
    }

    // Recalculate status
    let newStatus = 'รองรับได้';
    const ratio = (finalOccupancy / (shelter.capacity || 1)) * 100;
    if (ratio >= 100) newStatus = 'ล้นศูนย์';
    else if (ratio >= 80) newStatus = 'ใกล้เต็ม';

    shelter.currentOccupancy = finalOccupancy;
    shelter.capacityStatus = newStatus;
    shelter.updatedAt = new Date();
    await shelter.save();

    return NextResponse.json({ success: true, data: shelter });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}