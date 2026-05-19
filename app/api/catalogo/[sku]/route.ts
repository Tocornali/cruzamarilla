import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sku: string }> }
) {
  const { sku } = await params;
  const cleanSku = sku.trim().toUpperCase();

  const apiKey = process.env.API_KEY || process.env.VITE_API_KEY || 'ms_live_bbd5499b466f47304b69128c6bf5c26ea21d5c9b6a9e18b014c2e77c55813190';
  const baseUrl = process.env.MEDISTOCK_API_URL || 'https://medistockc.vercel.app/api/v1/productos';

  const targetUrl = `${baseUrl.replace(/\/$/, '')}/${cleanSku}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      return NextResponse.json({ message: 'Error al parsear respuesta de Medistock' }, { status: 500 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ message: 'Error de conexión con Medistock' }, { status: 500 });
  }
}
