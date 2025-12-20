// app/api/shelters/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

import { z } from 'zod';

const ShelterSchema = z.object({
  name: z.string().min(1, "ต้องระบุชื่อศูนย์"),
  district: z.string().min(1, "ต้องระบุอำเภอ"),
  subdistrict: z.string().optional(),
  capacity: z.number().nonnegative().default(0),
  currentOccupancy: z.number().nonnegative().default(0),
  phoneNumbers: z.array(z.string()).optional(),
  capacityStatus: z.string().optional(),
});

const ShelterImportSchema = z.array(ShelterSchema);

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
    const body = await req.json();
    const parsedData = ShelterSchema.parse(body); // Validate single item
    const newShelter = await Shelter.create(parsedData);
    return NextResponse.json({ success: true, data: newShelter }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof z.ZodError ? error.issues[0].message : (error as Error).message 
    }, { status: 400 });
  }
}

// 2. สำหรับ Import JSON (Bulk Upsert)
export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const { data } = await req.json(); // รับอาเรย์ 'data'
    const parsedData = ShelterImportSchema.parse(data); // Validate array

    const operations = parsedData.map((item) => ({
      updateOne: {
        filter: { name: item.name, district: item.district }, // ใช้ชื่อและอำเภอเป็น Key
        update: { 
          $set: {
            name: item.name,
            district: item.district,
            subdistrict: item.subdistrict,
            capacity: item.capacity || 0,
            currentOccupancy: item.currentOccupancy || 0,
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
    return NextResponse.json({ 
      success: false, 
      error: error instanceof z.ZodError ? "ข้อมูลนำเข้าไม่ถูกต้อง: " + error.issues[0].message : (error as Error).message 
    }, { status: 500 });
  }
}