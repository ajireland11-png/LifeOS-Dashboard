'use client'

import {
  Archive,
  BookOpen,
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

const primaryNavigation: {
  id: ModuleId
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'home', label: 'Overview', icon: Home },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'studio', label: 'Creative Studio', icon: Sparkles },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'atlas', label: 'Atlas', icon: Library },
]

const otherSpaces: {
  id: ModuleId
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'house', label: 'House', icon: Warehouse },
  { id: 'archive', label: 'Archive', icon: Archive },
]

export function Sidebar() {
  const activeModule = useAppStore((state) => state.activeModule)
  const setActiveModule = useAppStore((state) => state.setActiveModule)
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)

  const renderItem = (item: (typeof primaryNavigation)[number] | (typeof otherSpaces)[number]) => {
    const Icon = item.icon
    const active = activeModule === item.id
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActiveModule(item.id)}
        aria-current={active ? 'page' : undefined}
        aria-label={sidebarCollapsed ? item.label : undefined}
        title={sidebarCollapsed ? item.label : undefined}
        className={`lifeos-nav-item relative flex w-full items-center gap-3 px-3 py-2.5 text-left ${active ? 'is-active' : ''}`}
      >
        <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.55} />
        {!sidebarCollapsed && <span className="min-w-0 truncate text-[13px]">{item.label}</span>}
        {active && !sidebarCollapsed && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lo-brass)]" />}
      </button>
    )
  }

  return (
    <aside className={`lifeos-sidebar flex h-full shrink-0 flex-col border-r transition-[width] duration-200 ${sidebarCollapsed ? 'w-[72px]' : 'w-[248px]'}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-[color:var(--lo-line)] px-4">
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="lifeos-sidebar-brand font-serif">LIFEOS</div>
            <div className="lifeos-sidebar-caption mt-1 uppercase">A personal world</div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-sm p-2 text-[var(--lo-muted)] transition-colors hover:bg-white/[.05] hover:text-[var(--lo-parchment)]"
          aria-label={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={sidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <Menu className="h-[17px] w-[17px]" strokeWidth={1.5} />
        </button>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5">
        {!sidebarCollapsed && <div className="lifeos-sidebar-caption mb-3 px-3 uppercase">Your world</div>}
        <div className="space-y-1">{primaryNavigation.map(renderItem)}</div>
        <div className="my-5 border-t border-[color:var(--lo-line)]" />
        {!sidebarCollapsed && <div className="lifeos-sidebar-caption mb-3 px-3 uppercase">Other spaces</div>}
        <div className="space-y-1">{otherSpaces.map(renderItem)}</div>
      </nav>

      <div className="border-t border-[color:var(--lo-line)] p-3">
        <button
          type="button"
          onClick={() => setActiveModule('settings')}
          aria-current={activeModule === 'settings' ? 'page' : undefined}
          title={sidebarCollapsed ? 'Settings' : undefined}
          className="lifeos-nav-item flex w-full items-center gap-3 px-3 py-2.5 text-left"
        >
          <Settings className="h-[17px] w-[17px] shrink-0" strokeWidth={1.55} />
          {!sidebarCollapsed && <span className="text-[13px]">Settings</span>}
        </button>
      </div>
    </aside>
  )
}
