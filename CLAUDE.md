# Werkafspraken voor dit project

Privé pubquiz-app voor een avond met vrienden: één quizmaster bestuurt de avond,
spelers doen mee via hun gsm, en voor elke ronde draait een rad dat bepaalt welke
sterke drank die ronde op tafel komt. Geen commercieel product, geen accounts,
geen database - gebruiksgemak en sfeer gaan voor op volledigheid.

Uitgebreide uitleg staat in [README.md](README.md). Dit bestand bevat enkel de
afspraken die je moet kennen voor je iets wijzigt.

## De belangrijkste regel: rondes komen één per één

De eigenaar (Jarne) legt elke ronde later afzonderlijk uit ("voor ronde 1 wil ik
dat spelers ..."). **Bouw geen vragen, spelregels of rondespellen die hij nog
niet beschreven heeft** en loop niet vooruit op ongevraagde functionaliteit.
Bij twijfel over hoe een ronde moet werken: vragen, niet verzinnen.

Een nieuwe ronde is dus: een rondetype registreren in `client/rounds/` (en enkel
indien nodig in `server/rounds/`), en `type` zetten bij die ronde in
`config/quiz.config.js`. De bestaande lobby, statusflow, het rad en de navigatie
tussen rondes blijven daarbij ongemoeid. Stap-voor-stap: README, sectie 6.

## Architectuur in het kort

- **De server is de baas.** `server/quizStore.js` houdt de volledige quizstatus
  bij (in het geheugen) en bepaalt ook waar het rad stopt. Na elke wijziging gaat
  de hele `QuizState` naar alle clients. Clients tonen enkel; ze beslissen niets.
- `shared/protocol.js` (fases, statussen, socket-events) en `shared/types.ts`
  (datastructuur) zijn de gedeelde taal tussen server en client. Wijzig events
  altijd op die ene plek.
- De client haalt alles uit `client/state/QuizProvider.tsx` via `useQuiz()`.
- Rondetypes zijn modulair via een register aan beide kanten
  (`client/rounds/registry.ts`, `server/rounds/registry.js`).
- Eén socketverbinding per client; spelers keren na een refresh automatisch
  terug (rol en naam zitten in session/localStorage).

## Commando's

```bash
npm run dev            # alles op http://localhost:3001 (client herbouwt bij wijziging)
npm run quiz           # zoals een quizavond: bouwen + serveren op één poort
npm run test:flow      # speelt een volledige quiz door (server moet draaien)
npm run check:online -- https://pubquiz-k69m.onrender.com   # de gehoste versie nakijken
npm run typecheck
```

Na een wijziging in `server/` moet je herstarten: `npm run dev` bewaakt enkel de
client.

Op deze Windows-pc staat `npm` niet op de PATH van programma's die al open
stonden voor Node geïnstalleerd werd. Daarom roept `.claude/launch.json`
`C:\Program Files\nodejs\node.exe` met een volledig pad aan. Werkt de preview
niet op een andere machine, pas dan dat pad aan.

## Online versie

- Vaste link: <https://pubquiz-k69m.onrender.com> (Render, gratis plan)
- Render bouwt automatisch bij elke push naar `main`; instellingen staan in
  [render.yaml](render.yaml).
- De **quizmastercode** zit in de omgevingsvariabele `QUIZMASTER_CODE` in het
  Render-dashboard, bewust niet in deze repo. Lokaal is er geen code ingesteld,
  dus dan vraagt de app er ook niet naar.
- Gratis plan: valt na 15 minuten zonder bezoekers in slaapstand (eerste
  bezoeker wacht ~30 s), en een herstart of nieuwe versie wist de lopende quiz.

## Stijl

- **Nederlands** in de interface, in code-commentaar en in commitberichten.
- Commentaar legt uit *waarom*, niet *wat*; geen commentaar bij wat het zelf al
  zegt.
- Donkere pub-sfeer, grote typografie, speelse animaties. Mobile-first voor
  spelers, desktop/tablet voor de quizmaster. Geen zakelijke uitstraling.
- Houd het eenvoudig: bij een technische keuze de eenvoudigste betrouwbare
  oplossing voor een privéquiz met vrienden.
