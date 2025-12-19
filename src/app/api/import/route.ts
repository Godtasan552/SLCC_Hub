// app/api/import/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect'; // ไฟล์เชื่อมต่อ DB
import Shelter from '@/models/Shelter';

interface ShelterImportData {
  name: string;
  district: string;
  subdistrict?: string;
  capacity?: number;
  capacityStatus?: string;
  phoneNumbers?: string[];
}

export async function POST(req: Request) {
  await dbConnect();
  const rawData = await req.json(); // รับข้อมูลจากไฟล์ JSON

  // ใช้ bulkWrite เพื่อความเร็ว (944 รายการจะเสร็จในเสี้ยววินาที)
  const operations = rawData.data.map((item: ShelterImportData) => ({
    updateOne: {
      filter: { name: item.name, district: item.district }, // ใช้ชื่อและอำเภอเป็นตัวเช็ค
      update: { 
        $set: {
          name: item.name,
          district: item.district,
          subdistrict: item.subdistrict,
          capacity: item.capacity || 0,
          capacityStatus: item.capacityStatus,
          phoneNumbers: item.phoneNumbers,
          updatedAt: new Date()
        }
      },
      upsert: true
    }
  }));

  await Shelter.bulkWrite(operations);
  return NextResponse.json({ message: "Import Successful" });
}