import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await context.params;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('/') || filename.includes('..')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const filepath = path.join(process.cwd(), '.uploads', filename);

    try {
      await fs.access(filepath);
    } catch {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await fs.readFile(filepath);
    
    // Basic mime type detection based on extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        // Cache heavily since filename includes a unique timestamp
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Error reading image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
