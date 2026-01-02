import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import { Shelter as IShelter } from '@/types/shelter';

export async function GET() {
  await dbConnect();
  try {
    const shelters = await Shelter.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: shelters });
  } catch (error) {
    console.error('Failed to fetch shelters:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch shelters' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const shelter = await Shelter.create(body);
    return NextResponse.json({ success: true, data: shelter }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create shelter:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ success: false, error: 'ชื่อศูนย์นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'ไม่สามารถสร้างศูนย์ได้' }, { status: 400 });
  }
}

// PATCH for Bulk Import/Update
export async function PATCH(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const { data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Data must be an array' }, { status: 400 });
    }

    const results = [];
    for (const item of data) {
      try {
        // ลบ _id ออกเพื่อป้องกัน Duplicate Key error หรือ Immutable field error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...updateData } = item;
        
        // Data Sanitization FIRST (before lookup)
        const sanitizedName = (item.name || '').trim();
        if (typeof updateData.name === 'string') updateData.name = updateData.name.trim();
        if (typeof updateData.district === 'string') updateData.district = updateData.district.trim();
        if (typeof updateData.subdistrict === 'string') updateData.subdistrict = updateData.subdistrict.trim();
        
        // Default required fields if missing to prevent validation errors
        if (!updateData.district) updateData.district = 'ไม่ระบุ';
        
        // Ensure numeric fields are numbers, defaulting to 0 if null/invalid
        if (updateData.capacity === null || updateData.capacity === undefined || isNaN(Number(updateData.capacity))) {
            updateData.capacity = 0;
        }
        if (updateData.currentOccupancy === null || updateData.currentOccupancy === undefined || isNaN(Number(updateData.currentOccupancy))) {
            updateData.currentOccupancy = 0;
        }

        // Use sanitized name for lookup
        const existing = await Shelter.findOne({ name: sanitizedName });

        if (existing) {
          // Update existing - EXCLUDE name field to prevent unique constraint violation
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { name, ...fieldsToUpdate } = updateData;
          Object.assign(existing, fieldsToUpdate);
          
          try {
            await existing.save();
            results.push({ action: 'updated', name: sanitizedName });
          } catch (saveErr) {
            console.error(`Save error for ${sanitizedName}:`, saveErr);
            results.push({ action: 'error', name: sanitizedName, error: `Update failed: ${String(saveErr)}` });
          }
        } else {
            // Create new
            try {
                const newShelter = await Shelter.create(updateData) as unknown as IShelter;
                results.push({ action: 'created', name: newShelter.name });
            } catch (createErr) {
                 // Double-check race condition
                 if (typeof createErr === 'object' && createErr !== null && 'code' in createErr && (createErr as { code: number }).code === 11000) {
                     const retryExisting = await Shelter.findOne({ name: sanitizedName });
                     if (retryExisting) {
                         // eslint-disable-next-line @typescript-eslint/no-unused-vars
                         const { name, ...fieldsToUpdate } = updateData;
                         Object.assign(retryExisting, fieldsToUpdate);
                         await retryExisting.save();
                         results.push({ action: 'updated (retry)', name: sanitizedName });
                     } else {
                         throw createErr;
                     }
                 } else {
                     throw createErr;
                 }
            }
        }
      } catch (err) {
        console.error(`Error processing shelter ${item.name}:`, err);
        results.push({ action: 'error', name: item.name, error: String(err) });
        // Continue processing other items
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Failed to bulk import shelters:', error);
    return NextResponse.json({ success: false, error: 'Failed to bulk import shelters' }, { status: 500 });
  }
}
