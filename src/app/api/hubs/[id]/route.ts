import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Hub from '@/models/Hub';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await dbConnect();
  try {
    const body = await req.json();
    const { id } = params;

    const updatedHub = await Hub.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedHub) {
      return NextResponse.json({ success: false, error: 'Hub not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedHub });
  } catch (err) {
    console.error('Failed to update hub:', err);
    return NextResponse.json({ success: false, error: 'Failed to update hub' }, { status: 400 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await dbConnect();
  try {
    const { id } = params;
    const deletedHub = await Hub.findByIdAndDelete(id);

    if (!deletedHub) {
      return NextResponse.json({ success: false, error: 'Hub not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (err) {
    console.error('Failed to delete hub:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete hub' }, { status: 500 });
  }
}
