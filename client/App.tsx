import { useQuiz } from './state/QuizProvider';
import { HomeScreen } from './screens/HomeScreen';
import { QuizmasterScreen } from './screens/QuizmasterScreen';
import { QuizmasterCodeScreen } from './screens/QuizmasterCodeScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { ScreenScreen } from './screens/ScreenScreen';
import { MessageBar } from './components/MessageBar';

/**
 * Er is geen router nodig: de gekozen rol bepaalt het scherm, en die keuze
 * wordt onthouden zodat een refresh je niet terug naar start gooit.
 *
 * Uitzondering: /scherm is het publieke scherm voor de HDMI-laptop. Dat is
 * geen "rol" (geen aanmelding, geen opgeslagen keuze) - elk verbonden toestel
 * krijgt toch al de volledige quizstatus, dus dit pad toont gewoon een andere
 * weergave van diezelfde state.
 */
export function App() {
  const { role, state, message, clearMessage, quizmasterReady } = useQuiz();

  const isPublicScreen = window.location.pathname.replace(/\/+$/, '') === '/scherm';

  if (isPublicScreen) {
    return (
      <div className="app app--screen">
        <div className="app__backdrop" aria-hidden="true" />
        <div className="app__content">
          <ScreenScreen />
        </div>
      </div>
    );
  }

  // Het codescherm komt er enkel wanneer de server effectief een code vraagt.
  // Zo flikkert er niets wanneer je gewoon thuis draait zonder code.
  const needsCode =
    role === 'quizmaster' && !quizmasterReady && state?.quizmasterCodeRequired === true;

  const layout = role === 'quizmaster' && !needsCode ? 'quizmaster' : role === 'player' ? 'player' : 'home';

  return (
    <div className={`app app--${layout}`}>
      <div className="app__backdrop" aria-hidden="true" />
      <MessageBar message={message} onClose={clearMessage} />
      <div className="app__content">
        {role === 'quizmaster' && (needsCode ? <QuizmasterCodeScreen /> : <QuizmasterScreen />)}
        {role === 'player' && <PlayerScreen />}
        {!role && <HomeScreen />}
      </div>
    </div>
  );
}
