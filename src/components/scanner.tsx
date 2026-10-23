'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
export function Scanner({ lookup = false }: { lookup?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const [running, setRunning] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => { controls.current?.stop(); }, []);
  async function start() {
    setError(''); setRunning(true);
    try {
      const reader = new BrowserMultiFormatReader();
      controls.current = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (result, _error, scannerControls) => {
        if (result) {
          const scanned = result.getText();
          if (!/^\d{8,14}$/.test(scanned)) return;
          setCode(scanned); scannerControls.stop(); setRunning(false);
          if (lookup) window.location.assign('/painel?barcode=' + encodeURIComponent(scanned));
        }
      });
    } catch { setError('Não foi possível abrir a câmera. Digite o código abaixo.'); setRunning(false); }
  }
  return <><video ref={video} muted playsInline hidden={!running}/><button type="button" onClick={running ? () => { controls.current?.stop(); setRunning(false); } : start}>{running ? 'Fechar câmera' : 'Escanear código de barras'}</button>{error && <p role="alert">{error}</p>}<label>Código de barras<input name="barcode" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} required pattern="[0-9]{8,14}"/></label><small>O código consulta o catálogo compartilhado. Produtos novos precisam de nome no primeiro cadastro.</small></>;
}
