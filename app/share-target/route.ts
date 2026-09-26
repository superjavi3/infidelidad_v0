import { NextResponse } from 'next/server';

// Destino de «Compartir» desde WhatsApp (share_target del manifest). Normalmente lo atiende el
// service worker (public/sw.js) sin llegar aquí. Si el service worker aún no está activo, el
// archivo llega al servidor: no lo leemos ni lo guardamos, solo volvemos a la portada.
export async function POST(req: Request) {
  return NextResponse.redirect(new URL('/?shared=0', req.url), 303);
}

export async function GET(req: Request) {
  return NextResponse.redirect(new URL('/', req.url), 303);
}
