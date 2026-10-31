import { createContext, useContext, type ReactNode } from 'react';
import { GUITAR, getInstrument, type Instrument, type InstrumentId } from '@/music';

/**
 * The instrument the player is learning, for everything on screen that has no
 * content of its own to take one from: the tuner, the quizzes' fretboards, the
 * explorer. Content that carries an `instrument` (a chord, a riff, a lesson)
 * is drawn for that one regardless.
 *
 * With no provider above (a component rendered alone, as in most tests) it is
 * the guitar, which is also what the app was before there was a choice.
 */
const InstrumentContext = createContext<Instrument>(GUITAR);

export function InstrumentProvider({ id, children }: { id: InstrumentId; children: ReactNode }) {
  return <InstrumentContext.Provider value={getInstrument(id)}>{children}</InstrumentContext.Provider>;
}

export function useInstrument(): Instrument {
  return useContext(InstrumentContext);
}
