/**
 * Het kaartje waarmee vrienden binnenkomen: QR-code + adres.
 * De server kent de netwerkadressen van deze laptop; de client geeft enkel mee
 * op welke poort hij zelf draait. Zijn er meerdere netwerken (wifi, hotspot,
 * VPN), dan kan de quizmaster wisselen tot de juiste werkt.
 */

import { useEffect, useState } from 'react';
import type { JoinAddress, SessionInfo } from '../../shared/types';

export function JoinInfo() {
  const [addresses, setAddresses] = useState<JoinAddress[]>([]);
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    let cancelled = false;

    fetch(`/api/join-info?port=${encodeURIComponent(port)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: SessionInfo | null) => {
        if (!cancelled && data?.addresses?.length) setAddresses(data.addresses);
      })
      .catch(() => {
        /* zonder deze info werkt de quiz gewoon verder */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const current = addresses[selected];
  const url = current?.url || `${window.location.origin}/`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="join-info">
      <h3 className="card__title">🍻 Spelers laten binnenkomen</h3>

      {current?.qr && <img className="join-info__qr" src={current.qr} alt={`QR-code naar ${url}`} />}

      <button type="button" className="join-info__url" onClick={copy} title="Adres kopieren">
        <code>{url}</code>
        <span className="join-info__copy">{copied ? 'gekopieerd!' : 'kopieer'}</span>
      </button>

      {addresses.length > 1 && (
        <div className="join-info__switch">
          <span className="join-info__switch-label">
            Werkt het niet? Probeer een ander netwerk:
          </span>
          <div className="join-info__options">
            {addresses.map((address, index) => (
              <button
                key={address.url}
                type="button"
                className={`join-info__option${index === selected ? ' join-info__option--on' : ''}`}
                onClick={() => setSelected(index)}
              >
                {address.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
