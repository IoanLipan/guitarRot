import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { QuizDifficulty } from '@/progress';
import type { AudioEngine } from '@/audio';
import type { ProgressHandle } from '@/app/useProgress';
import type { QuizLayer } from '@/app/useBackButton';
import { ConfirmDialog } from '@/game/ConfirmDialog';
import { FreePractice } from './FreePractice';
import { ModeSelect } from './ModeSelect';
import { QuizRun, type RunPhase } from './QuizRun';

/** What the app shell can ask of the Quiz tab, for the Back button and for leaving mid-run. */
export type QuizApi = {
  /** Peels one layer: results or practice back to the mode select, and a run only after asking. */
  back: () => void;
  /**
   * Called before the tab is left. With a run in progress it asks first and
   * returns true, calling `proceed` only if the answer is to quit; otherwise
   * it returns false and the caller carries on.
   */
  guardLeave: (proceed: () => void) => boolean;
};

type View = { name: 'select' } | { name: 'practice' } | { name: 'run'; difficulty: QuizDifficulty; round: number };

/**
 * The Quiz tab. It opens on the choice of Easy, Medium or Hard (a scored ten-
 * question run) or free practice (the endless quiz). Where it is goes up to the
 * shell through `onLayerChange`, which is what makes it hold back toasts during
 * a run and lets Back step out of one.
 */
export function Quiz({
  engine,
  progress,
  onLayerChange,
  apiRef,
}: {
  engine: AudioEngine;
  progress: ProgressHandle;
  onLayerChange?: (layer: QuizLayer) => void;
  apiRef?: MutableRefObject<QuizApi | null>;
}) {
  const [view, setView] = useState<View>({ name: 'select' });
  const [runPhase, setRunPhase] = useState<RunPhase>('run');
  /** A question waiting on an answer: what to do if the player says yes. */
  const [confirm, setConfirm] = useState<{ proceed: () => void } | null>(null);

  const layer: QuizLayer = view.name === 'run' ? runPhase : view.name;
  const running = view.name === 'run' && runPhase === 'run';

  const report = useRef(onLayerChange);
  report.current = onLayerChange;
  useEffect(() => {
    report.current?.(layer);
  }, [layer]);
  // Leaving the tab ends whatever it was holding.
  useEffect(() => () => report.current?.('select'), []);

  const toSelect = useCallback(() => {
    setView({ name: 'select' });
    setRunPhase('run');
  }, []);

  const askToQuit = useCallback((proceed: () => void) => setConfirm({ proceed }), []);

  useEffect(() => {
    if (apiRef === undefined) return;
    apiRef.current = {
      back: () => {
        if (running) askToQuit(toSelect);
        else toSelect();
      },
      guardLeave: (proceed) => {
        if (!running) return false;
        askToQuit(() => {
          toSelect();
          proceed();
        });
        return true;
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, running, askToQuit, toSelect]);

  return (
    <>
      {view.name === 'select' && (
        <ModeSelect
          state={progress.state}
          onChoose={(difficulty) => {
            setRunPhase('run');
            setView({ name: 'run', difficulty, round: 1 });
          }}
          onPractice={() => setView({ name: 'practice' })}
        />
      )}
      {view.name === 'practice' && <FreePractice engine={engine} progress={progress} onExit={toSelect} />}
      {view.name === 'run' && (
        <QuizRun
          // A new round is a new run: nothing carries over from the last one.
          key={view.round}
          difficulty={view.difficulty}
          engine={engine}
          progress={progress}
          onQuit={() => askToQuit(toSelect)}
          onAgain={() => {
            setRunPhase('run');
            setView({ name: 'run', difficulty: view.difficulty, round: view.round + 1 });
          }}
          onChangeDifficulty={toSelect}
          onPhaseChange={setRunPhase}
        />
      )}

      {confirm !== null && (
        <ConfirmDialog
          title="Quit this run?"
          body="Your score so far will not count. The XP you have already earned stays."
          keepLabel="Keep playing"
          confirmLabel="Quit run"
          onKeep={() => setConfirm(null)}
          onConfirm={() => {
            const { proceed } = confirm;
            setConfirm(null);
            proceed();
          }}
        />
      )}
    </>
  );
}

export default Quiz;
