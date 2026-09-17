/**
 * Hulpjes om te weten via welk adres vrienden op hun gsm kunnen binnenkomen,
 * plus een QR-code zodat ze niets moeten typen.
 */

import os from 'node:os';
import QRCode from 'qrcode';

/** Alle IPv4-adressen van dit toestel op het lokale netwerk. */
export function getLanAddresses() {
  const addresses = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const details of interfaces || []) {
      if (details.family === 'IPv4' && !details.internal) {
        addresses.push(details.address);
      }
    }
  }
  // Thuiswifi (192.168.x.x) eerst, dan gsm-hotspots (172.16-31.x.x), dan de
  // rest. VPN-adapters zitten vaak in 10.x.x.x, dus die staan achteraan.
  // De quizmaster kan in het dashboard altijd zelf een ander adres kiezen.
  return addresses.sort((a, b) => score(a) - score(b));
}

function score(ip) {
  if (ip.startsWith('192.168.')) return 0;
  const [first, second] = ip.split('.').map(Number);
  if (first === 172 && second >= 16 && second <= 31) return 1;
  if (first === 10) return 3;
  return 2;
}

/** Deelname-URLs voor spelers, op basis van de poort waar de app draait. */
export function getJoinUrls(port) {
  return getLanAddresses().map((ip) => `http://${ip}:${port}/`);
}

/** QR-code (data-URL) voor een adres; null als het genereren mislukt. */
export async function createQrDataUrl(url) {
  if (!url) return null;
  try {
    return await QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: { dark: '#1b1410', light: '#f6ead3' },
    });
  } catch {
    return null;
  }
}
