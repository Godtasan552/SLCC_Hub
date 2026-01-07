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
    
    // เตรียม Operations สำหรับ BulkWrite
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operations: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors: { item: any, error: string }[] = [];
    
    for (const item of data) {
        if (item.quantity !== undefined && Number(item.quantity) < 0) {
          errors.push({ item, error: 'จำนวนต้องไม่ติดลบ' });
          continue;
        }

        // สร้าง Filter Query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter: Record<string, any> = { 
          name: item.name, 
          category: item.category
        };
        
        if (item.shelterId) {
          filter.shelterId = item.shelterId;
        } else if (item.shelterName) {
           filter.shelterName = item.shelterName;
        } else {
           filter.shelterId = null;
           filter.shelterName = { $in: [null, ''] }; // ของกลาง
        }

        // สร้าง Update Operation (Upsert)
        operations.push({
          updateOne: {
            filter: filter,
            update: {
              $set: {
                name: item.name,
                category: item.category,
                quantity: Number(item.quantity),
                unit: item.unit || 'ชิ้น',
                description: item.description || '',
                expiryDate: item.expiryDate || null,
                supplier: item.supplier || '',
                notes: item.notes || '',
                shelterId: item.shelterId || undefined, // undefined will be ignored by $set if not present
                shelterName: item.shelterName || 'คลังกลาง (Central Hub)',
                updatedAt: new Date()
              },
              $setOnInsert: {
                createdAt: new Date()
              }
            },
            upsert: true
          }
        });
    }

    // Execute Bulk Write (ถ้ามีข้อมูล)
    let result = null;
    if (operations.length > 0) {
      // ordered: false เพื่อให้ error ตัวเดียวไม่หยุดการทำงานของตัวอื่น
      result = await Supply.bulkWrite(operations, { ordered: false });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${operations.length} items`,
      summary: {
         matched: result?.matchedCount || 0,
         modified: result?.modifiedCount || 0,
         upserted: result?.upsertedCount || 0,
         errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
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
