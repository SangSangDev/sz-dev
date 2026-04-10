import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Make sure public/uploads exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename safely
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.name);
    // Sanitize filename to prevent directory traversal
    const safeBaseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeBaseName}-${uniqueSuffix}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file to public/uploads
    await fs.writeFile(filepath, buffer);

    // Return the URL to access it
    const fileUrl = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url: fileUrl }, { status: 200 });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
