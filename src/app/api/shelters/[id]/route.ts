// app/api/shelters/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { currentOccupancy } = await req.json();
    const { id } = await params;

    // ค้นหาศูนย์เดิมเพื่อดูความจุสูงสุด
    const shelter = await Shelter.findById(id);
    if (!shelter) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });

    // คำนวณสถานะใหม่ตามจำนวนคนที่อัปเดต
    let newStatus = 'รองรับได้';
    const ratio = (currentOccupancy / shelter.capacity) * 100;

    if (ratio >= 100) newStatus = 'ล้นศูนย์';
    else if (ratio >= 80) newStatus = 'ใกล้เต็ม';

    const updatedShelter = await Shelter.findByIdAndUpdate(
      id,
      { currentOccupancy, capacityStatus: newStatus, updatedAt: new Date() },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updatedShelter });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}