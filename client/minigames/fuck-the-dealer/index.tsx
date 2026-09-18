/**
 * Minigame 'fuck-the-dealer'. Zie server/minigames/fuckTheDealer.js voor de
 * spelregels en serverlogica.
 */

import { registerMinigameType } from '../registry';
import { QuizmasterView } from './QuizmasterView';
import { PlayerView } from './PlayerView';
import { ScreenView } from './ScreenView';

registerMinigameType({
  id: 'fuck-the-dealer',
  label: 'Fuck the Dealer',
  description: 'Kaartendrankspel: de deler ziet een geheime kaart, de speler gokt de waarde in max. 2 pogingen.',
  QuizmasterView,
  PlayerView,
  ScreenView,
});
