export interface TabItem {
  key: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="border-b border-ruled">
      <nav className="flex gap-6 overflow-x-auto" aria-label="Abas">
        {items.map((item) => {
          const isActive = item.key === activeKey
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-petrol text-petrol-700'
                  : 'border-transparent text-ink-muted hover:border-ruled hover:text-ink'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
