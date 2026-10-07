import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Abre a camera traseira e devolve o texto do primeiro QR lido.
export default function LeitorQr({ onLido, onFechar }) {
  const [erro, setErro] = useState('');
  const lido = useRef(false);

  useEffect(() => {
    let leitor = null;
    let ativo = true;
    try {
      leitor = new Html5Qrcode('leitor-qr', { verbose: false });
      leitor
        .start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: function (w, h) {
              var lado = Math.floor(Math.min(w, h) * 0.9);
              return { width: lado, height: lado };
            }
          },
          (texto) => {
            if (lido.current) return;
            lido.current = true;
            onLido(texto);
          },
          function () {}
        )
        .catch((e) => {
          if (ativo) setErro('Não consegui abrir a câmera. Permita o uso da câmera ou digite o endereço. (' + ((e && e.message) || e) + ')');
        });
    } catch (e) {
      setErro('Câmera indisponível neste aparelho. Digite o endereço.');
    }
    return () => {
      ativo = false;
      if (leitor) {
        leitor.stop().then(() => leitor.clear()).catch(function () {});
      }
    };
  }, []);

  return (
    <div className="qr-overlay">
      <button className="botao-link qr-fechar" onClick={onFechar}>Cancelar</button>
      <p className="qr-titulo">Aponte para o QR code da Recepção</p>
      <div id="leitor-qr" className="leitor-qr" />
      {erro && <p className="erro">{erro}</p>}
    </div>
  );
}
