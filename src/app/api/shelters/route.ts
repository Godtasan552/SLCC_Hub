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

// Helper to clean phone numbers
const sanitizePhones = (phones: string[] | undefined): string[] => {
  if (!phones || !Array.isArray(phones)) return [];
  
  return phones.reduce((acc, phone) => {
    // 1. Remove non-digit characters to keep only numbers
    const clean = phone.replace(/\D/g, '');
    
    // 2. Must be 9 or 10 digits (Standard Thai numbers)
    // 3. Must not be all zeros
    if (clean.length >= 9 && clean.length <= 10 && !/^0+$/.test(clean)) {
        // Optional: formatting could go here, e.g. 08x-xxx-xxxx
        acc.push(clean);
    }
    return acc;
  }, [] as string[]);
};

// GET - Fetch all shelters
export async function GET() {
  try {
    await dbConnect();
    const shelters = await Shelter.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: shelters });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
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
            phoneNumbers: sanitizePhones(item.phoneNumbers),
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