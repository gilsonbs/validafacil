'use client';
import { useState } from 'react';
export function Photo({ productId }: { productId: string }) {
  const [message, setMessage] = useState('');
  return <form onSubmit={async e => {
    e.preventDefault(); setMessage('Enviando foto…');
    try { const response = await fetch('/api/photos', { method: 'POST', body: new FormData(e.currentTarget) }); const result = await response.json(); setMessage(result.message); if (response.ok) window.location.reload(); } catch { setMessage('Falha de conexão. Tente novamente.'); }
  }}><input type="hidden" name="product_id" value={productId}/><label>Foto do produto<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" required/></label><button>Compartilhar foto</button><small role="status">{message}</small></form>;
}
