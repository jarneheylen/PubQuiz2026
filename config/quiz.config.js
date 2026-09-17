/**
 * ============================================================
 *  HET ENIGE BESTAND DAT JE MOET AANPASSEN OM DE QUIZ TE VULLEN
 * ============================================================
 *
 * Hier zet je:
 *   1. de naam van de quiz
 *   2. de lijst met sterke dranken voor het rad
 *   3. de rondes (naam, thema, uitleg, spelregels, rondetype)
 *
 * Rondetypes zijn modulair: 'manual' is de basis (de quizmaster leidt de ronde
 * mondeling, spelers zien thema + uitleg + de drank van het rad).
 * Nieuwe rondetypes voeg je later toe in:
 *   - client/rounds/   (hoe de ronde eruit ziet voor quizmaster + speler)
 *   - server/rounds/   (eventuele serverlogica, bv. antwoorden verzamelen)
 * Zie de README voor een stap-voor-stap uitleg.
 */

/** Naam van de quizavond, zichtbaar bij quizmaster en spelers. */
export const quizName = 'De Grote Pubquiz';

/**
 * Sterke dranken voor het rad. Toevoegen of verwijderen mag vrij.
 * - name  : wat op het rad en in het resultaat staat
 * - emoji : klein icoontje (mag leeg: '')
 * - color : kleur van het vak op het rad
 *
 * Tip: 6 tot 10 dranken ziet het mooiste uit op het rad.
 */
export const drinks = [
  { id: 'vodka', name: 'Vodka', emoji: '\u{1F9CA}', color: '#ded7c6' },
  { id: 'tequila', name: 'Tequila', emoji: '\u{1F335}', color: '#d9a52a' },
  { id: 'rum', name: 'Rum', emoji: '\u{1F965}', color: '#a0521f' },
  { id: 'whisky', name: 'Whisky', emoji: '\u{1F943}', color: '#c1762a' },
  { id: 'jager', name: 'Jagermeister', emoji: '\u{1F98C}', color: '#31663e' },
  { id: 'gin', name: 'Gin', emoji: '\u{1F378}', color: '#78b0c6' },
  { id: 'limoncello', name: 'Limoncello', emoji: '\u{1F34B}', color: '#e0c422' },
  { id: 'sambuca', name: 'Sambuca', emoji: '\u{2615}', color: '#414150' },
];

/**
 * De rondes van de quiz, in volgorde. Het rondenummer wordt automatisch bepaald.
 * - name        : titel van de ronde
 * - theme       : het thema (groot op het scherm)
 * - explanation : korte uitleg die quizmaster en spelers zien
 * - rules       : lijst met spelregels (mag leeg blijven: [])
 * - type        : rondetype-id (voorlopig allemaal 'manual')
 */
export const rounds = [
  {
    name: 'Ronde 1',
    theme: 'Muziek',
    explanation:
      'We starten zacht: muziek door de jaren heen. Luister goed, want de intros zijn kort.',
    rules: ['Geen gsm op tafel', 'Antwoorden worden pas na de ronde overlopen'],
    type: 'manual',
  },
  {
    name: 'Ronde 2',
    theme: 'Film & Series',
    explanation:
      'Van klassiekers tot guilty pleasures: quotes, posters en soundtracks.',
    rules: ['Titels in het Nederlands of Engels mogen allebei'],
    type: 'manual',
  },
  {
    name: 'Ronde 3',
    theme: 'Algemene kennis',
    explanation:
      'De klassieke ronde: een mix van geschiedenis, aardrijkskunde, wetenschap en onzin.',
    rules: [],
    type: 'manual',
  },
  {
    name: 'Ronde 4',
    theme: 'Sport',
    explanation:
      'Voetbal, wielrennen, en die ene sport waar niemand iets van kent.',
    rules: [],
    type: 'manual',
  },
  {
    name: 'Ronde 5',
    theme: 'Mix & finale',
    explanation:
      'De laatste ronde, waar alles nog kan kantelen. Volle inzet gevraagd.',
    rules: ['Dubbele punten in deze ronde'],
    type: 'manual',
  },
];

/** Hoe lang het rad draait (in milliseconden). Groter = meer spanning. */
export const wheelSpinDurationMs = 6500;
