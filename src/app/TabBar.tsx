export type TabId = 'feed' | 'learn' | 'quiz';

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'learn', label: 'Learn' },
  { id: 'quiz', label: 'Quiz' },
];

const INACTIVE_COLOR = '#5f5f6b';

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="flex h-[78px] shrink-0 border-t border-[var(--color-surface-2)] bg-[var(--color-surface)]">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold"
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
  const shape = id === 'quiz' ? 'rounded-full' : 'rounded-md';
  return (
    <span
      className={`h-6 w-6 ${shape}`}
      style={active ? { background: color } : { border: `2px solid ${color}` }}
    />
  );
}
