import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ message: 'Origem inválida.' }, { status: 403 });
  const client = await db();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Entre novamente.' }, { status: 401 });
  const form = await request.formData();
  const photo = form.get('photo'); const productId = String(form.get('product_id'));
  if (!(photo instanceof File) || !['image/jpeg','image/png','image/webp'].includes(photo.type) || photo.size > 5242880 || photo.size === 0) return NextResponse.json({ message: 'Use JPG, PNG ou WebP de até 5 MB.' }, { status: 400 });
  const { data: product } = await client.from('products').select('id').eq('id', productId).single();
  if (!product) return NextResponse.json({ message: 'Produto inválido.' }, { status: 400 });
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const valid = photo.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : photo.type === 'image/png' ? bytes.slice(0,8).join(',') === '137,80,78,71,13,10,26,10' : new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  if (!valid) return NextResponse.json({ message: 'Arquivo de imagem inválido.' }, { status: 400 });
  const path = `${user.id}/${productId}/${crypto.randomUUID()}`;
  const { error } = await client.storage.from('product-photos').upload(path, bytes, { contentType: photo.type });
  if (error) return NextResponse.json({ message: 'Não foi possível enviar a foto.' }, { status: 400 });
  const { error: metadataError } = await client.from('product_photos').insert({ product_id: productId, object_path: path });
  if (metadataError) { await client.storage.from('product-photos').remove([path]); return NextResponse.json({ message: 'Não foi possível salvar a foto.' }, { status: 400 }); }
  return NextResponse.json({ message: 'Foto compartilhada no catálogo.' });
}
