'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export function Scanner({ lookup = false }: { lookup?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const starting = useRef(false);
  const [running, setRunning] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  function stop() {
    controls.current?.stop();
    controls.current = null;
    starting.current = false;
    if (video.current?.srcObject) {
      (video.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      video.current.srcObject = null;
    }
    setRunning(false);
  }

  useEffect(() => () => {
    controls.current?.stop();
    if (video.current?.srcObject) {
      (video.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  }, []);

  async function start() {
    if (starting.current || running) return;
    setError('');
    setStatus('Posicione o código de barras inteiro dentro da imagem, com boa iluminação.');
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setError('A câmera exige HTTPS (ou localhost) e um navegador compatível. Digite o código manualmente.');
      return;
    }
    starting.current = true;
    setRunning(true);
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E, BarcodeFormat.ITF, BarcodeFormat.CODE_128
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 });
      const scanner = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        video.current!,
        (result, _scanError, scannerControls) => {
          if (!result) return;
          const scanned = result.getText().trim();
          if (!/^\d{8,14}$/.test(scanned)) {
            setStatus('Código identificado em formato não aceito. Tente outro código ou digite manualmente.');
            return;
          }
          setCode(scanned);
          scannerControls.stop();
          controls.current = null;
          setRunning(false);
          setStatus('Código lido: ' + scanned);
          if (lookup) window.location.assign('/painel?barcode=' + encodeURIComponent(scanned));
        }
      );
      controls.current = scanner;
      starting.current = false;
    } catch (cause) {
      stop();
      const name = cause instanceof Error ? cause.name : '';
      setError(name === 'NotAllowedError'
        ? 'Permissão da câmera negada. Autorize a câmera nas configurações do navegador.'
        : name === 'NotFoundError' || name === 'OverconstrainedError'
          ? 'Não foi encontrada uma câmera compatível. Digite o código manualmente.'
          : 'Não foi possível iniciar a leitura. Feche outros aplicativos que usam a câmera e tente novamente.');
    }
  }

  return <>
    <div style={{ marginBottom: 12 }}>
      <video ref={video} muted playsInline autoPlay
        style={{ display: running ? 'block' : 'none', width: '100%', maxWidth: 480, maxHeight: 320, objectFit: 'contain', background: '#111', borderRadius: 12 }} />
      <button type="button" onClick={running ? stop : start}>
        {running ? 'Fechar câmera' : 'Escanear código de barras'}
      </button>
    </div>
    {running && <p role="status">{status}</p>}
    {!running && status && !error && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
    <label>Código de barras
      <input name="barcode" inputMode="numeric" value={code}
        onChange={e => setCode(e.target.value)} required pattern="[0-9]{8,14}" />
    </label>
    <small>Se a leitura falhar, aproxime ou afaste o celular, evite reflexos e mantenha o código inteiro visível. Você também pode digitar o código.</small>
    <small>O código consulta o catálogo compartilhado. Produtos novos precisam de nome no primeiro cadastro.</small>
  </>;
}
