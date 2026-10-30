import { QUIZ_DIFFICULTIES, type ProgressState, type QuizDifficulty } from '@/progress';
import { tapHaptic } from '@/app/haptics';
import { MiniPicks } from '@/game/MiniPicks';
import { ChevronRightIcon } from '@/ui/icons';
import { stagger } from '@/ui/motion';
import { describeDifficulty, DIFFICULTY_NAME } from './difficultyCopy';

/**
 * How loudly each difficulty is drawn. They climb: easy sits quietly on the
 * ground, medium is a step brighter with a blue edge, and hard is the one
 * light card on a dark screen, in the heaviest type, so the choice of how much
 * to take on can be read from across the room. All three are flat: a card
 * lifts only when it is pressed (the PlayStation site's rule for its cards),
 * and the climb is in tone, edge and type, not in glow.
 */
const LOOK: Record<
  QuizDifficulty,
  { card: string; name: string; line: string; dim: string }
> = {
  easy: {
    card: 'bg-surface border-2 border-[#262631]',
    name: 'text-[30px] font-extrabold text-ink',
    line: 'text-ink-dim',
    dim: 'text-ink-dim',
  },
  medium: {
    card: 'bg-surface-2 border-2 border-quiz/70',
    name: 'text-[34px] font-black text-ink',
    line: 'text-ink/80',
    dim: 'text-ink-dim',
  },
  hard: {
    card: 'bg-ink border-2 border-ink',
    name: 'text-[40px] font-black text-ground',
    line: 'text-ground/75',
    dim: 'text-ground/60',
  },
};

function DifficultyCard({
  difficulty,
  best,
  index,
  onChoose,
}: {
  difficulty: QuizDifficulty;
  best: ProgressState['quizBests'][QuizDifficulty];
  index: number;
  onChoose: (difficulty: QuizDifficulty) => void;
}) {
  const look = LOOK[difficulty];
  const played = best.runs > 0;
  return (
    <button
      type="button"
      data-testid={`mode-${difficulty}`}
      onClick={() => {
        tapHaptic();
        onChoose(difficulty);
      }}
      style={stagger(index + 1, 70)}
      className={`rise-in press press-soft flex w-full flex-col gap-1.5 rounded-3xl px-4 py-3.5 text-left tight:gap-1 tight:py-3 ${look.card}`}
    >
      <span className="flex items-center gap-2.5">
        <span className={`font-display leading-none ${look.name}`}>{DIFFICULTY_NAME[difficulty]}</span>
        <span className="ml-auto flex items-center gap-2.5">
          {played ? (
            <>
              <span
                className={`font-display text-[34px] leading-none font-black tabular-nums ${difficulty === 'hard' ? 'text-ground' : 'text-ink'}`}
              >
                {best.best}
                <span className="sr-only"> best score</span>
              </span>
              <MiniPicks filled={best.stars} size={20} />
            </>
          ) : (
            <span className={`text-xs leading-tight ${look.dim}`}>Not played yet</span>
          )}
        </span>
      </span>
      <span className={`text-[13px] leading-snug ${look.line}`}>{describeDifficulty(difficulty)}</span>
    </button>
  );
}

/**
 * The Quiz tab's front door: three runs, stacked from calm to fierce, each
 * saying in a line what it asks and what you have scored there; and under them
 * the endless quiz, which the tab used to be.
 */
export function ModeSelect({
  state,
  onChoose,
  onPractice,
}: {
  state: ProgressState;
  onChoose: (difficulty: QuizDifficulty) => void;
  onPractice: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto" data-testid="mode-select">
      <div className="mx-auto flex max-w-md flex-col gap-3 px-5 pt-8 pb-8 tight:gap-2.5 tight:pt-5 tight:pb-5">
        <header className="rise-in flex flex-col gap-1 pr-11">
          <h1 className="font-display text-5xl leading-none font-black">Quiz</h1>
          <p className="text-sm text-ink-dim">Ten questions, then a score.</p>
        </header>

        {QUIZ_DIFFICULTIES.map((difficulty, index) => (
          <DifficultyCard
            key={difficulty}
            difficulty={difficulty}
            best={state.quizBests[difficulty]}
            index={index}
            onChoose={onChoose}
          />
        ))}

        <button
          type="button"
          data-testid="mode-practice"
          onClick={() => {
            tapHaptic();
            onPractice();
          }}
          style={stagger(4, 70)}
          className="rise-in press press-soft mt-1 flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 text-left"
        >
          <span className="flex flex-col">
            <span className="text-base font-bold">Free practice</span>
            <span className="text-[13px] text-ink-dim">Endless questions, no score.</span>
          </span>
          <ChevronRightIcon size={20} className="shrink-0 text-ink-dim" />
        </button>
      </div>
    </div>
  );
}
