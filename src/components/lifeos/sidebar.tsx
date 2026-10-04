'use client'

import {
  Archive,
  BookOpen,
  Compass,
  FolderKanban,
  FlaskConical,
  Home,
  Library,
  Menu,
  Settings,
  Sparkles,
  Warehouse,
} from 'lucide-react'

import { useAppStore, type ModuleId } from '@/stores/app-store'

const navigation: {
  id: ModuleId
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'atlas', label: 'Atlas', icon: Library },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'studio', label: 'Studio', icon: Sparkles },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'house', label: 'House', icon: Warehouse },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'archive', label: 'Archive', icon: Archive },
]

export function Sidebar() {
  const activeModule = useAppStore((state) => state.activeModule)
  const setActiveModule = useAppStore((state) => state.setActiveModule)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  return (
    <aside
      className={`flex h-full flex-col border-r border-[color:var(--lifeos-line)] bg-[var(--lifeos-night-soft)]/90 backdrop-blur-sm transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex h-20 items-center justify-between px-5 border-b border-[color:var(--lifeos-line)]">
        {!sidebarCollapsed && (
          <div>
            <div className="font-serif text-[1.35rem] tracking-[0.08em] text-[var(--lifeos-ivory)]">
              LIFE OS
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.28em] text-[var(--lifeos-muted)]">
              Personal Atlas
            </div>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="rounded-md p-2 text-[var(--lifeos-muted)] transition-colors hover:bg-white/5 hover:text-[var(--lifeos-ivory)]"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="mb-3 px-3 text-[9px] uppercase tracking-[0.28em] text-[var(--lifeos-muted)]">
          Navigate
        </div>

        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = activeModule === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`group relative flex w-full items-center gap-3 relative rounded-md px-3 py-2.5 text-left transition-all duration-200 ${
                  active
                    ? 'bg-white/[0.045] text-[var(--lifeos-ivory)]'
                    : 'text-[var(--lifeos-muted)] hover:bg-white/[0.035] hover:text-[var(--lifeos-ivory)]'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    active ? 'opacity-100' : 'opacity-60'
                  }`}
                />

                {!sidebarCollapsed && (
                  <span className="text-[13px] tracking-[0.01em]">{item.label}</span>
                )}

                {active && !sidebarCollapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-[color:var(--lifeos-line)] p-3">\n        {!sidebarCollapsed && (\n          <div className="px-3 pb-2 text-[9px] uppercase tracking-[0.24em] text-[var(--lifeos-muted)]/70">Quiet tools</div>\n        )}
        <button
          onClick={() => setActiveModule('settings')}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground ${
            activeModule === 'settings'
              ? 'bg-white/10 text-foreground'
              : ''
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />

          {!sidebarCollapsed && (
            <span className="text-sm">Settings</span>
          )}
        </button>
      </div>
    </aside>
  )
}