// app/api/shelters/[id]/resources/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json(); // { category, itemName, amount, unit, urgency }
    
    const shelter = await Shelter.findByIdAndUpdate(
      id,
      { 
        $push: { resources: { ...body, requestedAt: new Date() } } 
      },
      { new: true }
    );

    if (!shelter) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลศูนย์พักพิง' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: shelter.resources });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่รู้จัก' 
    }, { status: 400 });
  }
}