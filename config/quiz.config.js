/**
 * ============================================================
 *  HET ENIGE BESTAND DAT JE MOET AANPASSEN OM DE QUIZ TE VULLEN
 * ============================================================
 *
 * Hier zet je:
 *   1. de naam van de quiz
 *   2. de vaste lijst met spelers
 *   3. de lijst met sterke dranken voor het rad
 *   4. de rondes (naam, thema, uitleg, spelregels, rondetype)
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
 * De vaste gastenlijst. Een speler kiest bij het aanmelden zijn naam uit deze
 * lijst (geen vrije tekst meer) - zo kan iedereen bij verlies van verbinding
 * gewoon zijn naam opnieuw aantikken en verdergaan waar hij gebleven was. De
 * quizmaster (Jarne) staat hier expliciet niet bij: die meldt zich aan met de
 * quizmaster-knop, niet als speler.
 */
export const players = [
  'Yentl Stroobants',
  'Franc Balliu',
  'Jens Weyen',
  'Kevin Coertjens',
  'Ruben Vanderborght',
  'Kobe Verheyden',
  'Jordy Haesen',
  'Ralph Vandyck',
];

/**
 * Sterke dranken voor het rad. Toevoegen of verwijderen mag vrij - dit kan
 * ook rechtstreeks tijdens de avond via het scorebord-paneel van de
 * quizmaster (kaart "Dranken"), zonder de server te herstarten.
 * - name  : wat op het rad en in het resultaat staat
 * - emoji : klein icoontje (mag leeg: '')
 * - color : kleur van het vak op het rad
 * - abv   : alcoholpercentage, enkel gebruikt voor het scorebord
 *
 * Tip: 6 tot 10 dranken ziet het mooiste uit op het rad.
 */
export const drinks = [
  { id: 'jenever', name: 'Jenever', emoji: '\u{1F943}', color: '#c9d6d9', abv: 35 },
  { id: 'amaretto', name: 'Amaretto', emoji: '\u{1F330}', color: '#8a4a1f', abv: 28 },
  { id: 'limoncello', name: 'Limoncello', emoji: '\u{1F34B}', color: '#e0c422', abv: 30 },
  { id: 'jager', name: 'Jagermeister', emoji: '\u{1F98C}', color: '#31663e', abv: 35 },
  { id: 'kruidenbitter', name: 'Kruidenbitter', emoji: '\u{1F33F}', color: '#5c3a21', abv: 30 },
  { id: 'sambuca', name: 'Sambuca', emoji: '\u{2615}', color: '#3a2a4a', abv: 38 },
];

/**
 * De rondes van de quiz, in volgorde. Het rondenummer wordt automatisch bepaald.
 * - name        : titel van de ronde
 * - theme       : het thema (groot op het scherm)
 * - explanation : korte uitleg die quizmaster en spelers zien (mag leeg: '')
 * - rules       : lijst met spelregels (mag leeg blijven: [])
 * - type        : rondetype-id (voorlopig allemaal 'manual')
 *
 * Uitleg en spelregels blijven hier bewust leeg: de quizmaster geeft dat
 * mondeling per ronde.
 *
 * Fuck the Dealer (het kaartendrankspel) is GEEN ronde: de quizmaster start
 * dat los van deze lijst, zo vaak hij wil tijdens de avond (knop op het
 * dashboard). Zie server/minigames/ en client/minigames/.
 */
export const rounds = [
  { name: 'Ronde 1', theme: 'Muziek', explanation: '', rules: [], type: 'manual' },
  { name: 'Ronde 2', theme: 'Film & Series', explanation: '', rules: [], type: 'manual' },
  { name: 'Ronde 3', theme: 'Algemene kennis', explanation: '', rules: [], type: 'manual' },
  { name: 'Ronde 4', theme: 'Sport', explanation: '', rules: [], type: 'manual' },
  { name: 'Ronde 5', theme: 'Mix & finale', explanation: '', rules: [], type: 'manual' },
];

/** Hoe lang het rad draait (in milliseconden). Groter = meer spanning. */
export const wheelSpinDurationMs = 6500;
