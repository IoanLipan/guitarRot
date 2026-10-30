import { addDays } from '@/progress';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayName(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? '';
}

/** The seven local dates ending on `today`, oldest first. */
export function lastSevenDays(today: string): string[] {
  return [6, 5, 4, 3, 2, 1, 0].map((back) => addDays(today, -back));
}

/**
 * The week as a stretch of fretboard: seven frets, an inlay dot in each. A
 * day you practised is lit amber, a day you did not is a dark pearl, and today
 * wears a ring so you can see whether it is still there to light.
 */
export function StreakStrip({ today, practiceDays }: { today: string; practiceDays: readonly string[] }) {
  const practised = new Set(practiceDays);
  const days = lastSevenDays(today);

  return (
    <div>
      <ol
        aria-label="The last seven days"
        className="grid grid-cols-7 overflow-hidden rounded-2xl bg-wood shadow-[inset_0_2px_10px_rgba(0,0,0,0.45)]"
      >
        {days.map((day, index) => {
          const lit = practised.has(day);
          const isToday = day === today;
          return (
            <li
              key={day}
              data-testid={`day-${day}`}
              data-lit={lit}
              data-today={isToday}
              aria-label={`${dayName(day)}${isToday ? ', today' : ''}, ${lit ? 'practised' : 'not practised'}`}
              className={`flex h-14 items-center justify-center ${index > 0 ? 'border-l-2 border-fret/35' : ''}`}
            >
              <span
                className={`flex h-[26px] w-[26px] items-center justify-center rounded-full ${
                  isToday ? 'ring-2 ring-ink/90 ring-offset-2 ring-offset-wood' : ''
                }`}
              >
                <span
                  className="h-[18px] w-[18px] rounded-full"
                  style={
                    lit
                      ? {
                          background: 'radial-gradient(circle at 35% 30%, #ffe3a1, var(--color-accent) 55%, #c9781a)',
                        }
                      : {
                          background: 'radial-gradient(circle at 35% 30%, #5a493a, #2f241b 70%)',
                        }
                  }
                />
              </span>
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="mt-1.5 grid grid-cols-7 text-center text-xs">
        {days.map((day) => (
          <span key={day} className={day === today ? 'font-bold text-ink' : 'text-ink-dim'}>
            {day === today ? 'Today' : dayName(day)}
          </span>
        ))}
      </div>
    </div>
  );
}
