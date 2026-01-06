// app/api/shelters/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import ShelterLog from '@/models/ShelterLog';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, amount, name, district, subdistrict, capacity, phoneNumbers } = body;
    const { id } = await params;

    const shelter = await Shelter.findById(id);
    if (!shelter) return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 });

    // --- Case 1: Update General Info (Admin Edit) ---
    if (name || district || subdistrict !== undefined || capacity !== undefined || phoneNumbers) {
      if (name) shelter.name = name;
      if (district) shelter.district = district;
      if (subdistrict !== undefined) shelter.subdistrict = subdistrict;
      if (capacity !== undefined) {
        const cap = Number(capacity);
        if (isNaN(cap) || cap < 0) {
          return NextResponse.json({ error: 'ความจุต้องเป็นตัวเลขที่เท่ากับหรือมากกว่า 0' }, { status: 400 });
        }
        shelter.capacity = cap;
      }
      if (phoneNumbers) shelter.phoneNumbers = phoneNumbers;
      
      await shelter.save();
      return NextResponse.json({ success: true, data: shelter });
    }

    // --- Case 2: Check-in / Check-out (Daily Operations) ---
    if (action && amount) {
      const val = Number(amount) || 0;
      
      if (!['in', 'out'].includes(action)) {
        return NextResponse.json({ error: 'action ต้องเป็น "in" หรือ "out"' }, { status: 400 });
      }

      if (val <= 0) {
        return NextResponse.json({ error: 'จำนวนต้องมากกว่า 0' }, { status: 400 });
      }

      // ✅ บันทึกลง ShelterLog แทนการอัปเดต currentOccupancy โดยตรง
      await ShelterLog.create({
        shelterId: id,
        action,
        amount: val
      });

      return NextResponse.json({ 
        success: true, 
        message: `บันทึก${action === 'in' ? 'รับเข้า' : 'ส่งออก'} ${val} คน เรียบร้อย` 
      });
    }

    // --- Case 3: No valid operation ---
    return NextResponse.json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' }, { status: 400 });

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