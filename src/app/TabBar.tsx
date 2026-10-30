import { tapHaptic } from './haptics';

export type TabId = 'feed' | 'songs' | 'learn' | 'quiz' | 'you';

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'songs', label: 'Songs' },
  { id: 'learn', label: 'Learn' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'you', label: 'You' },
];

const INACTIVE_COLOR = '#5f5f6b';

/** Which way moving from one tab to another goes, by their order in the bar. */
export function tabDirection(from: TabId, to: TabId): 'forward' | 'back' {
  return TABS.findIndex((tab) => tab.id === to) >= TABS.findIndex((tab) => tab.id === from) ? 'forward' : 'back';
}

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.id === active),
  );
  return (
    <nav className="relative flex shrink-0 border-t border-surface-2 bg-surface pb-[env(safe-area-inset-bottom)]">
      {/* One pill that slides to the active tab, instead of one per tab fading in and out. */}
      <span
        aria-hidden="true"
        data-testid="tab-indicator"
        className="tab-indicator pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+7px)] left-0 flex w-1/5 justify-center"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      >
        <span className="h-1 w-6 rounded-full bg-accent shadow-[0_0_10px_rgba(255,176,32,0.7)]" />
      </span>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              tapHaptic();
              onChange(tab.id);
            }}
            aria-current={isActive ? 'page' : undefined}
            // 78px on an ordinary phone; 64px where every pixel above it counts (see `tight:` in index.css).
            className="press press-tile flex h-[78px] flex-1 flex-col items-center justify-center gap-1 pb-1 text-xs font-bold tight:h-16 tight:gap-0.5"
            style={{ color: isActive ? 'var(--color-accent)' : INACTIVE_COLOR }}
          >
            {/* Keyed by state: becoming active remounts the icon, which replays its pop. */}
            <span key={isActive ? 'on' : 'off'} className={`flex ${isActive ? 'tab-icon-pop' : ''}`}>
              <TabIcon id={tab.id} active={isActive} />
            </span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  const color = active ? 'var(--color-accent)' : INACTIVE_COLOR;
  const fill = active ? color : 'none';
  // Marks drawn on top of a filled shape take the tab bar's colour so they stay legible.
  const knockout = active ? 'var(--color-surface)' : color;
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      {id === 'feed' && (
        <>
          {/* A card with a play mark on it, and the edge of the next card behind it. */}
          <path d="M7 3.5h10" {...common} />
          <rect x="3.5" y="7" width="17" height="13.5" rx="3.5" fill={fill} {...common} />
          <path d="M10.5 10.6v6.3l5-3.15z" fill={knockout} stroke={knockout} strokeWidth={1.2} strokeLinejoin="round" />
        </>
      )}
      {id === 'songs' && (
        <>
          <path d="M9 18V6l10-2v12" fill={fill} {...common} />
          <circle cx="6.5" cy="18" r="2.5" fill={fill} {...common} />
          <circle cx="16.5" cy="16" r="2.5" fill={fill} {...common} />
        </>
      )}
      {id === 'learn' && (
        <path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" fill={fill} {...common} />
      )}
      {id === 'you' && (
        <>
          {/* The guitar pick (the logo's shape), with a peak in it: where you stand, and the way up. */}
          <path
            d="M12 3.2c3.9 0 7.5 1.1 7.5 4.7 0 4.6-4.1 9.5-6.2 11.7q-1.3 1.3-2.6 0C8.6 17.4 4.5 12.5 4.5 7.9 4.5 4.3 8.1 3.2 12 3.2Z"
            fill={fill}
            {...common}
          />
          <path d="M9.2 12.4 12 9.6l2.8 2.8" fill="none" stroke={knockout} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {id === 'quiz' && (
        <>
          <circle cx="12" cy="12" r="9" fill={fill} {...common} />
          {/* A question mark. */}
          <path
            d="M9.4 9.6a2.6 2.6 0 1 1 3.9 2.25c-.8.45-1.3 1-1.3 1.9"
            fill="none"
            stroke={knockout}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.6" r="1.1" fill={knockout} />
        </>
      )}
    </svg>
  );
}
