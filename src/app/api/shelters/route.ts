// app/api/shelters/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

interface ShelterImportItem {
  name: string;
  district: string;
  subdistrict?: string;
  capacity?: number;
  capacityStatus?: string;
  phoneNumbers?: string[];
}

// 1. สำหรับคีย์ข้อมูลเองทีละศูนย์
export async function POST(req: Request) {
  try {
    await dbConnect();
    const data = await req.json();
    const newShelter = await Shelter.create(data);
    return NextResponse.json({ success: true, data: newShelter }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// 2. สำหรับ Import JSON (Bulk Upsert)
export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const { data } = await req.json(); // รับอาเรย์ 'data' จากไฟล์ JSON

    const operations = data.map((item: ShelterImportItem) => ({
      updateOne: {
        filter: { name: item.name, district: item.district }, // ใช้ชื่อและอำเภอเป็น Key
        update: { 
          $set: {
            name: item.name,
            district: item.district,
            subdistrict: item.subdistrict,
            capacity: item.capacity || 0,
            capacityStatus: item.capacityStatus || 'รองรับได้',
            phoneNumbers: item.phoneNumbers || [],
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await Shelter.bulkWrite(operations);
    return NextResponse.json({ success: true, imported: result.upsertedCount, updated: result.modifiedCount });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}