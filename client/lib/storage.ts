/**
 * Kleine wrapper rond de browseropslag: onthoudt je rol en spelersnaam, zodat
 * een herladen pagina of een gsm die even in slaap valt niet opnieuw moet
 * aanmelden. Alles is optioneel: werkt de opslag niet (privémodus), dan werkt
 * de app nog steeds.
 *
 * Rol en speler-id gaan naar sessionStorage (per tabblad) met localStorage als
 * terugvalpositie. Zo kan je op dezelfde laptop een quizmaster-tabblad en een
 * spelers-tabblad openen zonder dat ze elkaar overschrijven, en word je na het
 * volledig afsluiten van de browser toch nog herkend.
 */

const KEYS = {
  role: 'pubquiz.role',
  playerId: 'pubquiz.playerId',
  playerName: 'pubquiz.playerName',
  sound: 'pubquiz.sound',
  quizmasterCode: 'pubquiz.quizmasterCode',
} as const;

function readFrom(store: 'session' | 'local', key: string): string | null {
  try {
    return (store === 'session' ? sessionStorage : localStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeTo(store: 'session' | 'local', key: string, value: string | null): void {
  try {
    const target = store === 'session' ? sessionStorage : localStorage;
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
  } catch {
    /* geen opslag beschikbaar: niet erg */
  }
}

/** Dit tabblad eerst, daarna de browser als geheel. */
function read(key: string): string | null {
  return readFrom('session', key) ?? readFrom('local', key);
}

function write(key: string, value: string | null): void {
  writeTo('session', key, value);
  writeTo('local', key, value);
}

export const storage = {
  getRole: () => read(KEYS.role) as 'quizmaster' | 'player' | null,
  setRole: (role: 'quizmaster' | 'player' | null) => write(KEYS.role, role),

  getPlayerId: () => read(KEYS.playerId),
  setPlayerId: (id: string | null) => write(KEYS.playerId, id),

  getPlayerName: () => read(KEYS.playerName),
  setPlayerName: (name: string | null) => write(KEYS.playerName, name),

  getSound: () => readFrom('local', KEYS.sound) !== 'off',
  setSound: (on: boolean) => writeTo('local', KEYS.sound, on ? 'on' : 'off'),

  /** Onthouden quizmastercode, zodat je die niet bij elke refresh moet intypen. */
  getQuizmasterCode: () => read(KEYS.quizmasterCode),
  setQuizmasterCode: (code: string | null) => write(KEYS.quizmasterCode, code),
};
