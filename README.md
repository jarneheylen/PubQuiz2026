# De Pubquiz

Een kleine, realtime pubquiz-app voor een avond met vrienden.
Eén **quizmaster** (laptop of tablet) bestuurt de avond, de **spelers** doen mee
via hun eigen gsm. Voor elke ronde draait er een **rad** dat bepaalt welke sterke
drank die ronde op tafel komt.

Privé-app, geen accounts, geen database: de quiz leeft in het geheugen van de
server zolang die draait.

---

## 1. Eenmalig: installeren

Je hebt **Node.js 20 of nieuwer** nodig (staat op deze pc: Node 24).
Op een andere computer: download de LTS-versie via
[nodejs.org](https://nodejs.org/) en installeer die.

Daarna, in deze map:

```bash
npm install
```

## 2. Starten

**Voor een quizavond** (alles op één poort, ook bereikbaar voor gsm's):

```bash
npm run quiz
```

De app bouwt en start dan op `http://localhost:3001`. In de terminal zie je ook
het netwerkadres (bv. `http://192.168.0.12:3001/`) dat je vrienden nodig hebben.
Op Windows kan de eerste keer een firewall-melding komen: sta toe voor het
privé-netwerk, anders kunnen de gsm's er niet bij.

**Tijdens het ontwikkelen** (alles op `http://localhost:3001/`, client wordt bij
elke wijziging opnieuw gebouwd — pagina verversen volstaat):

```bash
npm run dev
```

Dit is ook wat de preview in Claude Code start (zie `.claude/launch.json`).
Die configuratie roept `node.exe` met een volledig pad aan in plaats van `npm`:
programma's die al open stonden voor Node geïnstalleerd werd, kennen `npm` nog
niet op hun PATH.

Werk je aan de vormgeving en wil je echte hot reload, dan kan het ook in twee
processen (Vite op 5173 met een proxy naar de server op 3001):

```bash
npm run dev:hot
```

## 3. Online zetten (gratis, met een vaste link)

Draait de app op je laptop, dan moeten je vrienden op hetzelfde wifi-netwerk
zitten - en dat loopt vaak mis (firewall, VPN, hotspot). Online gehost is er
niets van dat: één vaste link die werkt op wifi én op 4G.

Dit is eenmalig werk van ongeveer een kwartier. Je hebt een **GitHub**-account en
een **Render**-account nodig (beide gratis, geen kredietkaart).

**Stap 1 - de code naar GitHub**

De repo is hier al aangemaakt en vastgelegd. Maak een leeg project op
[github.com/new](https://github.com/new) (naam bv. `pubquiz`, mag **private**
staan; vink géén README of .gitignore aan) en koppel het:

```bash
git remote add origin https://github.com/JOUW-GEBRUIKERSNAAM/pubquiz.git
```

```bash
git push -u origin main
```

De eerste push vraagt je om in te loggen bij GitHub (er opent een venster).

**Stap 2 - Render laten bouwen**

1. Ga naar [render.com](https://render.com/) en meld je aan **met GitHub**.
2. Klik **New** → **Blueprint** en kies je `pubquiz`-repo.
3. Render leest [`render.yaml`](render.yaml) en weet zo alles al: gratis plan,
   regio Frankfurt, hoe te bouwen en te starten.
4. Render vraagt één ding: **QUIZMASTER_CODE**. Vul daar je eigen code in (bv.
   `shotjes2026`). Die code heb jij straks nodig om het dashboard te openen; je
   vrienden hebben ze niet nodig.
5. Klik **Apply** en wacht tot de build klaar is (± 3 minuten).

Je krijgt dan een vast adres, bv. `https://pubquiz-a1b2.onrender.com`. Dat adres
blijft altijd hetzelfde, dus je kan het vooraf doorsturen.

**Stap 3 - gebruiken**

Open de link, kies **Quizmaster**, geef je code in en je zit in het dashboard.
De QR-code in het dashboard verwijst automatisch naar het publieke adres, dus
je vrienden scannen en spelen mee - waar ze ook zitten.

**Twee dingen om te weten bij het gratis plan**

- **Slaapstand.** Na 15 minuten zonder bezoekers valt de dienst in slaap. Wie
  daarna als eerste de link opent, wacht ongeveer een halve minuut. Tip: open de
  link zelf een paar minuten voor de quiz, dan is hij wakker. Tijdens de quiz
  blijft hij wakker.
- **Een herstart wist de quiz.** De stand zit in het geheugen van de server.
  Herstart Render de dienst (of zet je een nieuwe versie online), dan is de lobby
  leeg en melden de spelers zich opnieuw aan.

**Later iets wijzigen?** Commit en push, Render zet de nieuwe versie automatisch
online:

```bash
git add -A
```

```bash
git commit -m "Ronde 1 aangepast"
```

```bash
git push
```

## 4. Hoe een avond verloopt

1. Jij opent de app en kiest **Quizmaster**.
2. Je vrienden openen hetzelfde adres op hun gsm (of scannen de QR-code in je
   dashboard) en kiezen **Speler**.
3. Ze geven hun naam in en verschijnen meteen in jouw **lobby**.
4. Als iedereen binnen is: **START QUIZ**.
5. Per ronde: thema en uitleg komen op het scherm → **DRAAI HET RAD** → het rad
   draait en stopt op een sterke drank → **START RONDE** → je stelt je vragen →
   **BEËINDIG RONDE** → **VOLGENDE RONDE**.
6. Na de laatste ronde volgt het eindoverzicht. Met **Nieuwe quiz** begin je
   opnieuw zonder dat de spelers zich moeten heraanmelden.

Alles gebeurt realtime: de spelers zien de lobby, de ronde, de uitleg en het rad
op hetzelfde moment als jij.

## 5. De quiz aanpassen

Alles wat je normaal wil wijzigen staat in **[`config/quiz.config.js`](config/quiz.config.js)**:

- `quizName` — naam van de avond
- `drinks` — de sterke dranken op het rad (naam, emoji, kleur)
- `rounds` — de rondes met naam, thema, uitleg, spelregels en rondetype
- `wheelSpinDurationMs` — hoe lang het rad draait

Na een wijziging: herstart de server (`npm run quiz`).

## 6. Later: een nieuw rondetype toevoegen

De rondes zijn modulair. Elke ronde heeft een `type`; dat type bepaalt welke
module de inhoud tekent. Vandaag bestaat er één type: `manual` (de quizmaster
stelt de vragen mondeling, de app toont enkel het kader).

Een nieuw rondetype toevoegen gaat zo:

1. **Client** — maak `client/rounds/MijnRonde.tsx`:

   ```tsx
   import { registerRoundType, type PlayerRoundProps, type QuizmasterRoundProps } from './registry';

   function QuizmasterView({ round, players }: QuizmasterRoundProps) { /* ... */ }
   function PlayerView({ round, me, sendAction }: PlayerRoundProps) { /* ... */ }

   registerRoundType({
     id: 'mijn-ronde',
     label: 'Mijn ronde',
     QuizmasterView,
     PlayerView,
   });
   ```

2. Importeer dat bestand in `client/rounds/index.ts`.

3. **Server** (alleen als de ronde logica nodig heeft, bv. antwoorden
   verzamelen) — maak `server/rounds/mijnRonde.js`:

   ```js
   import { registerRoundType } from './registry.js';

   registerRoundType({
     id: 'mijn-ronde',
     onPlayerAction({ round, player, action, payload }) {
       if (action === 'answer') {
         round.data.answers = { ...(round.data.answers || {}), [player.id]: payload };
       }
     },
   });
   ```

   en importeer het in `server/rounds/index.js`.

4. Zet `type: 'mijn-ronde'` bij de juiste ronde in `config/quiz.config.js`.

De rest van de app (lobby, statusbalk, rad, navigatie tussen rondes) blijft
onaangeroerd.

## 7. Structuur

```
config/quiz.config.js     de quiz zelf: rondes + dranken            <- pas dit aan
shared/
  protocol.js             fases, statussen, socket-events, statuslabel
  types.ts                datastructuur (Quiz, Player, Round, WheelState, QuizState)
server/
  index.js                Express + Socket.IO, serveert ook de gebouwde app
  quizStore.js            de centrale quiz-state en alle overgangen
  socket.js               socket-events <-> quiz-state
  network.js              netwerkadressen + QR-code voor spelers
  quizmasterCode.js       de code voor het dashboard (QUIZMASTER_CODE)
  rounds/                 rondetypes aan serverzijde (registry + 'manual')
client/
  App.tsx                 kiest scherm op basis van de rol
  state/QuizProvider.tsx  socketverbinding + quiz-state voor heel de app
  screens/                HomeScreen, QuizmasterScreen, QuizmasterCodeScreen,
                          PlayerScreen
  components/             Wheel, PlayerList, RoundInfo, RoundProgress, JoinInfo, ...
  rounds/                 rondetypes aan clientzijde (registry + 'manual')
  lib/                    socket, localStorage, geluid van het rad
  styles/                 thema, bouwstenen, rad, schermen
scripts/dev.mjs           bouwt + bewaakt de client en start de server (1 proces)
scripts/flow-test.mjs     speelt een volledige quiz door als controle
render.yaml               instellingen voor de gratis hosting op Render
start-quiz.cmd            dubbelklik-starter voor Windows
.claude/launch.json       preview-configuratie voor Claude Code
```

De server is altijd de baas: hij beslist de fase van de quiz en waar het rad
stopt, en stuurt na elke wijziging de volledige quizstatus naar alle clients.
Zo kan een gsm die even wegvalt gewoon opnieuw meelopen.

## 8. Zelf even nakijken of alles werkt

Met de server aan (`npm start` of `npm run quiz`) in een tweede terminal:

```bash
npm run test:flow
```

Dat script speelt een volledige quiz via de server (spelers laten binnenkomen,
quiz starten, rad draaien, alle rondes doorlopen, resetten) en meldt onderaan
`ALLES OK` als elke stap klopt.

En om de **online** versie na te kijken (bereikbaarheid, websockets, QR-adres,
quizmastercode, spelers zonder code):

```bash
npm run check:online -- https://pubquiz-k69m.onrender.com
```

Dat raakt een lopende quiz niet aan: de testspeler meldt zich meteen weer af.

## 9. Kleine dingen die handig zijn om te weten

- **Herladen mag.** Je rol en spelersnaam worden lokaal onthouden; je komt terug
  waar je was.
- **Spelers verwijderen** kan met het kruisje naast een naam in het dashboard.
- **Geluid** (tikkend rad + jingle) staat aan bij de quizmaster en kan uit met de
  luidsprekerknop.
- **Server herstarten wist de quiz.** Dat is met opzet: een avond = een sessie.
- **Quizmastercode.** Enkel nodig wanneer de omgevingsvariabele
  `QUIZMASTER_CODE` ingesteld is (dus online op Render, niet thuis op je laptop).
  Je toestel onthoudt de code, dus je moet ze niet bij elke refresh intypen.
- **Code wijzigen op Render:** dashboard → je service → *Environment* →
  `QUIZMASTER_CODE` aanpassen → *Save*. De dienst herstart dan even.
