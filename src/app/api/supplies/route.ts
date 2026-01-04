import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Supply from '@/models/Supply';

// GET - ดึงข้อมูลสิ่งของทั้งหมด
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const shelterId = searchParams.get('shelterId');
    
    const query: Record<string, string> = {};
    
    if (category && category !== 'ทั้งหมด') {
      query.category = category;
    }
    
    if (shelterId) {
      query.shelterId = shelterId;
    }
    
    const supplies = await Supply.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({ 
      success: true, 
      data: supplies 
    });
  } catch (error) {
    console.error('Error fetching supplies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supplies' },
      { status: 500 }
    );
  }
}

// POST - เพิ่มสิ่งของใหม่
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    
    if (body.quantity !== undefined && Number(body.quantity) < 0) {
      return NextResponse.json({ success: false, error: 'จำนวนต้องไม่ติดลบ' }, { status: 400 });
    }

    const supply = await Supply.create(body);
    
    return NextResponse.json({ 
      success: true, 
      data: supply 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating supply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create supply' },
      { status: 500 }
    );
  }
}

// PATCH - นำเข้าข้อมูลจำนวนมาก (Bulk Import)
export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    
    const { data } = await req.json();
    
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Data must be an array' },
        { status: 400 }
      );
    }
    
    const results = [];
    
    for (const item of data) {
      try {
        if (item.quantity !== undefined && Number(item.quantity) < 0) {
          results.push({ action: 'error', item, error: 'จำนวนต้องไม่ติดลบ' });
          continue;
        }

        // ตรวจสอบว่ามีสิ่งของนี้อยู่แล้วหรือไม่
        const query: Record<string, string | null | object> = { 
          name: item.name, 
          category: item.category
        };
        
        if (item.shelterId) {
          query.shelterId = item.shelterId;
        } else if (item.shelterName) {
           query.shelterName = item.shelterName;
        } else {
           // กรณีของกลาง (ไม่มีศูนย์)
           query.shelterId = null;
           query.shelterName = { $in: [null, ''] };
        }

        const existing = await Supply.findOne(query);
        
        if (existing) {
          // อัพเดทข้อมูล
          existing.quantity = item.quantity !== undefined ? item.quantity : existing.quantity;
          existing.unit = item.unit || existing.unit;
          existing.description = item.description || existing.description;
          existing.expiryDate = item.expiryDate || existing.expiryDate;
          existing.supplier = item.supplier || existing.supplier;
          existing.notes = item.notes || existing.notes;
          existing.shelterName = item.shelterName || existing.shelterName;
          await existing.save();
          results.push({ action: 'updated', item: existing });
        } else {
          // สร้างใหม่
          const newSupply = await Supply.create(item);
          results.push({ action: 'created', item: newSupply });
        }
      } catch (err) {
        console.error('Error processing item:', item, err);
        results.push({ action: 'error', item, error: String(err) });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${results.length} items`,
      results 
    });
  } catch (error) {
    console.error('Error bulk importing supplies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import supplies' },
      { status: 500 }
    );
  }
}

// DELETE - ลบสิ่งของทั้งหมด (ใช้ระวัง!)
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get('confirm');
    
    if (confirm !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Please confirm deletion' },
        { status: 400 }
      );
    }
    
    await Supply.deleteMany({});
    
    return NextResponse.json({ 
      success: true, 
      message: 'All supplies deleted' 
    });
  } catch (error) {
    console.error('Error deleting supplies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete supplies' },
      { status: 500 }
    );
  }
}
