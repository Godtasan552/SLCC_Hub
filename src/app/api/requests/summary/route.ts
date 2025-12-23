import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Hub from '@/models/Hub';

import { ResourceRequest } from '@/types/shelter';

export const dynamic = 'force-dynamic';

interface ShelterSummaryDoc {
  _id: string;
  name: string;
  resources: ResourceRequest[];
}

export async function GET() {
  await dbConnect();

  try {
    const [sheltersRaw, hubsRaw] = await Promise.all([
      Shelter.find(
        { 'resources.0': { $exists: true } },
        { name: 1, resources: 1 }
      ).lean(),
      Hub.find(
        { 'resources.0': { $exists: true } },
        { name: 1, resources: 1 }
      ).lean()
    ]);

    const merged = [
      ...(sheltersRaw as unknown as ShelterSummaryDoc[]).map(s => ({ ...s, isHub: false })),
      ...(hubsRaw as unknown as ShelterSummaryDoc[]).map(h => ({ ...h, isHub: true }))
    ];

    return NextResponse.json({
      success: true,
      data: merged
    });
  } catch (error) {
    console.error('Fetch summary requests failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
