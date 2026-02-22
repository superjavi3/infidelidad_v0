import { NextRequest, NextResponse } from 'next/server';
import { generatePDF } from '@/lib/pdf-generator';
import { PDFData } from '@/lib/pdf-template';

export async function POST(req: NextRequest) {
  try {
    const data: PDFData = await req.json();

    if (!data.stats || !data.stats.personA) {
      return NextResponse.json(
        { error: 'Missing required stats data' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generatePDF(data);

    const safeA = (data.stats.personA || 'A').replace(/[^a-zA-Z0-9]/g, '');
    const safeB = (data.stats.personB || 'B').replace(/[^a-zA-Z0-9]/g, '');
    const filename = `LoSabia-${safeA}-${safeB}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: unknown) {
    console.error('PDF generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: message },
      { status: 500 }
    );
  }
}
