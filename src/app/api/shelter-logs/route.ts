import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ShelterLog from '@/models/ShelterLog';
import Shelter from '@/models/Shelter';

/**
 * POST /api/shelter-logs
 * 
 * บันทึกการรับเข้า/ส่งออกผู้อพยพ
 * ✅ ไม่ทับข้อมูลเก่า
 * ✅ เก็บประวัติทุกครั้ง
 */
export async function POST(req: Request) {
  await dbConnect();

  try {
    const { shelterId, action, amount, note } = await req.json();

    // Validation
    if (!shelterId || !action || !amount) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบ: ต้องมี shelterId, action, amount' },
        { status: 400 }
      );
    }

    if (!['in', 'out'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action ต้องเป็น "in" หรือ "out" เท่านั้น' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'จำนวนต้องมากกว่า 0' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า Shelter มีอยู่จริง
    const shelter = await Shelter.findById(shelterId);
    if (!shelter) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบศูนย์พักพิงนี้ในระบบ' },
        { status: 404 }
      );
    }

    // สร้าง Log ใหม่
    const log = await ShelterLog.create({
      shelterId,
      action,
      amount: Number(amount),
      note
    });

    // ✅ อัปเดตเวลาล่าสุดของ Shelter ด้วย
    await Shelter.findByIdAndUpdate(shelterId, { updatedAt: new Date() });

    return NextResponse.json({ 
      success: true, 
      data: log,
      message: `บันทึก${action === 'in' ? 'รับเข้า' : 'ส่งออก'} ${amount} คน เรียบร้อย`
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create shelter log:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'ไม่สามารถบันทึกข้อมูลได้' 
    }, { status: 500 });
  }
}

/**
 * GET /api/shelter-logs?shelterId=xxx&startDate=xxx&endDate=xxx
 * 
 * ดึงประวัติการรับเข้า/ส่งออก
 */
export async function GET(req: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(req.url);
    const shelterId = searchParams.get('shelterId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};
    
    if (shelterId) {
      filter.shelterId = shelterId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const logs = await ShelterLog.find(filter)
      .sort({ date: -1 })
      .populate('shelterId', 'name district');

    return NextResponse.json({ 
      success: true, 
      data: logs,
      count: logs.length
    });

  } catch (error) {
    console.error('Failed to fetch shelter logs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'ไม่สามารถดึงข้อมูลได้' 
    }, { status: 500 });
  }
}

/**
 * PATCH /api/shelter-logs
 * 
 * นำเข้าข้อมูลการรับเข้า/ส่งออก แบบกลุ่ม (Bulk Import)
 */
export async function PATCH(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const { data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'ข้อมูลต้องเป็นอาเรย์' }, { status: 400 });
    }

    // 1. ดึงรายชื่อศูนย์ทั้งหมดมาทำ Map เพื่อความเร็วในการค้นหา
    const shelters = await Shelter.find({}, '_id name');
    const shelterMap = new Map();
    shelters.forEach(s => {
      shelterMap.set(s.name.trim(), s._id);
    });

    const logsToCreate = [];
    const skipped = [];

    for (const item of data) {
      const name = (item.name || '').trim();
      const shelterId = shelterMap.get(name);
      
      const action = String(item.action).toLowerCase();
      const amount = Number(item.amount);

      if (!shelterId || !['in', 'out'].includes(action) || isNaN(amount) || amount <= 0) {
        skipped.push({ name, error: !shelterId ? 'ไม่พบศูนย์' : 'ข้อมูลไม่ถูกต้อง' });
        continue;
      }

      logsToCreate.push({
        shelterId,
        action,
        amount,
        date: item.date ? new Date(item.date) : new Date()
      });
    }

    if (logsToCreate.length > 0) {
      const result = await ShelterLog.insertMany(logsToCreate);

      // ✅ อัปเดตเวลาล่าสุดของศูนย์พักพิงทุกแห่งที่เกี่ยวข้อง
      const uniqueShelterIds = [...new Set(logsToCreate.map(l => l.shelterId))];
      if (uniqueShelterIds.length > 0) {
        await Shelter.updateMany(
          { _id: { $in: uniqueShelterIds } },
          { $set: { updatedAt: new Date() } }
        );
      }

      return NextResponse.json({
        success: true,
        summary: {
          created: result.length,
          skipped: skipped.length
        },
        skippedItems: skipped
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'ไม่มีข้อมูลที่ถูกต้องในการนำเข้า',
      skippedItems: skipped 
    }, { status: 400 });

  } catch (error) {
    console.error('Failed to bulk import logs:', error);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' }, { status: 500 });
  }
}
