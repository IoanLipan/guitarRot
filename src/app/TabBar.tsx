import { tapHaptic } from './haptics';

export type TabId = 'feed' | 'songs' | 'learn' | 'quiz';

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'songs', label: 'Songs' },
  { id: 'learn', label: 'Learn' },
  { id: 'quiz', label: 'Quiz' },
];

const INACTIVE_COLOR = '#5f5f6b';

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="flex shrink-0 border-t border-surface-2 bg-surface pb-[env(safe-area-inset-bottom)]">
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
            className="flex h-[78px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold active:scale-95"
            style={{ color: isActive ? 'var(--color-accent)' : INACTIVE_COLOR }}
          >
            <TabIcon id={tab.id} active={isActive} />
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
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      {id === 'feed' && <rect x="4" y="4" width="16" height="16" rx="4" fill={fill} {...common} />}
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
      {id === 'quiz' && <circle cx="12" cy="12" r="8" fill={fill} {...common} />}
    </svg>
  );
}
