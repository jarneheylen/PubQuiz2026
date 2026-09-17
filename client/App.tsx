import { useQuiz } from './state/QuizProvider';
import { HomeScreen } from './screens/HomeScreen';
import { QuizmasterScreen } from './screens/QuizmasterScreen';
import { QuizmasterCodeScreen } from './screens/QuizmasterCodeScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { MessageBar } from './components/MessageBar';

/**
 * Er is geen router nodig: de gekozen rol bepaalt het scherm, en die keuze
 * wordt onthouden zodat een refresh je niet terug naar start gooit.
 */
export function App() {
  const { role, state, message, clearMessage, quizmasterReady } = useQuiz();

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
