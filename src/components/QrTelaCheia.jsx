import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Mostra o endereco da Recepcao como QR code grande, em tela cheia,
// para a Apresentacao escanear de longe.
export default function QrTelaCheia({ redes, onFechar }) {
  const [indice, setIndice] = useState(0);
  const [imagem, setImagem] = useState('');
  const atual = redes[indice] || redes[0];

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(atual.url, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then((data) => { if (!cancelado) setImagem(data); })
      .catch(() => { if (!cancelado) setImagem(''); });
    return () => { cancelado = true; };
  }, [atual.url]);

  return (
    <div className="qr-overlay">
      <button className="botao-link qr-fechar" onClick={onFechar}>Fechar</button>
      <p className="qr-titulo">Aponte a câmera da Apresentação para cá</p>
      {imagem ? (
        <img className="qr-imagem" src={imagem} alt={'QR code de ' + atual.url} />
      ) : (
        <p className="vazio">Gerando QR...</p>
      )}
      <p className="qr-endereco">{atual.url}</p>
      {redes.length > 1 && (
        <div className="qr-redes">
          {redes.map((r, i) => (
            <button
              key={r.url}
              className={i === indice ? 'qr-rede ativa' : 'qr-rede'}
              onClick={() => setIndice(i)}
            >
              {r.interface || r.url}
            </button>
          ))}
          <p className="dica">Escolha a rede do hotspot/Wi-Fi (ap, swlan, wlan), não a de dados móveis (rmnet).</p>
        </div>
      )}
    </div>
  );
}
