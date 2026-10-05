'use client'

import { useCallback, useEffect, useState } from 'react'
import { Archive, Lightbulb, Plus, Trash2 } from 'lucide-react'
import { SectionPage } from '../shared/section-page'

type Item = {
  id: string
  title: string
  kind: string
  summary?: string | null
  content: string
  archived: boolean
  updatedAt: string
}

const KIND_OPTIONS = ['idea', 'inspiration', 'material', 'technique', 'reference']

function formatDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function StudioPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<string>('all')

  const [newTitle, setNewTitle] = useState('')
  const [newKind, setNewKind] = useState('idea')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editTitle, setEditTitle] = useState('')
  const [editKind, setEditKind] = useState('idea')
  const [editSummary, setEditSummary] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/studio/items')
      const data = response.ok ? await response.json() : []
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = items.find((i) => i.id === selectedId) ?? null
  const visibleItems = kindFilter === 'all' ? items : items.filter((i) => i.kind === kindFilter)

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title)
      setEditKind(selected.kind)
      setEditSummary(selected.summary ?? '')
      setEditContent(selected.content)
    }
  }, [selected])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return

    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/studio/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, kind: newKind }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error || "Couldn't save that.")
        return
      }
      const created = (await response.json()) as Item
      setNewTitle('')
      await load()
      setSelectedId(created.id)
    } catch {
      setError("Couldn't reach Studio — check the backend is running.")
    } finally {
      setCreating(false)
    }
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/studio/items/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || selected.title,
          kind: editKind,
          summary: editSummary.trim() || null,
          content: editContent,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error || "Couldn't save changes.")
        return
      }
      await load()
    } catch {
      setError("Couldn't reach Studio — check the backend is running.")
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!selected) return
    try {
      const response = await fetch(`/api/studio/items/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      if (response.ok) {
        setSelectedId(null)
        await load()
      }
    } catch {
      // Silent — the row stays, which is visible feedback enough.
    }
  }

  async function handleDelete() {
    if (!selected) return
    try {
      const response = await fetch(`/api/studio/items/${selected.id}`, { method: 'DELETE' })
      if (response.ok) {
        setSelectedId(null)
        await load()
      }
    } catch {
      // Same reasoning as archive.
    }
  }

  return (
    <SectionPage
      eyebrow="Ideas & making"
      title="Studio"
      description=""
    >
      <div className="grid gap-14 pb-20 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* List + new item */}
        <section>
          <div className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Lightbulb size={14} strokeWidth={1.5} />
            Studio
          </div>

          <form onSubmit={handleCreate} className="mb-4 flex items-center gap-2 border-b border-[color:var(--lifeos-line)] pb-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Capture a spark…"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/55"
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="flex shrink-0 items-center justify-center border border-white/35 p-1.5 text-foreground/85 transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/85"
              aria-label="Add item"
            >
              <Plus size={14} strokeWidth={1.75} />
            </button>
          </form>

          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value)}
            className="mb-6 border-b border-[color:var(--lifeos-line)] bg-transparent pb-2 text-[12px] uppercase tracking-[0.1em] text-muted-foreground outline-none"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                New item will be: {k}
              </option>
            ))}
          </select>

          <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground/80">
            <button
              type="button"
              onClick={() => setKindFilter('all')}
              className={kindFilter === 'all' ? 'text-foreground' : 'hover:text-foreground/70'}
            >
              All
            </button>
            {KIND_OPTIONS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={kindFilter === k ? 'text-foreground' : 'hover:text-foreground/70'}
              >
                {k}
              </button>
            ))}
          </div>

                     {!loading && visibleItems.length > 0 && (
             <div className="mb-10 border-y border-[color:var(--lifeos-line)] py-7">
               <div className="mb-5 flex items-center justify-between gap-4">
                 <div>
                   <p className="lifeos-kicker text-[10px] uppercase tracking-[0.2em]">The workbench</p>
                   <p className="mt-1 font-serif text-2xl">Loose threads worth keeping</p>
                 </div>
                 <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/55">
                   {visibleItems.length} {visibleItems.length === 1 ? 'piece' : 'pieces'}
                 </span>
               </div>
               <div className="lifeos-specimen-grid lifeos-studio-grid">
                 {visibleItems.slice(0, 4).map((item, index) => (
                   <button
                     key={item.id}
                     type="button"
                     onClick={() => setSelectedId(item.id)}
                     className="lifeos-specimen-card group relative min-h-[150px] overflow-hidden p-5 text-left transition-all duration-300"
                   >
                     <span className="absolute right-4 top-4 font-serif text-3xl text-foreground/[0.07]">{String(index + 1).padStart(2, '0')}</span>
                     <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60">{item.kind}</span>
                     <span className="mt-7 block max-w-[18rem] font-serif text-xl leading-tight text-foreground/85 group-hover:text-foreground">{item.title}</span>
                     {item.summary && <span className="mt-2 block max-w-sm text-xs leading-5 text-muted-foreground">{item.summary}</span>}
                   </button>
                 ))}
               </div>
             </div>
           )}

{loading ? (
            <p className="text-sm italic text-muted-foreground/80">Reading the studio…</p>
          ) : visibleItems.length > 0 ? (
            <div className="divide-y divide-white/10">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`group block w-full border-b border-[color:var(--lifeos-line)] py-4 pr-4 text-left transition-all ${
                    item.id === selectedId ? 'bg-white/[0.018] text-foreground' : 'text-foreground/65 hover:bg-white/[0.012] hover:pl-2 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3"><div className="font-serif text-lg">{item.title}</div>{item.id === selectedId && <span className="lifeos-kicker text-[9px] uppercase tracking-[0.16em]">open</span>}</div>
                  {item.summary && (
                    <div className="mt-0.5 truncate text-sm text-muted-foreground">{item.summary}</div>
                  )}
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/55">
                    {item.kind} · {formatDate(item.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Nothing here yet — capture something above. It can stay exactly
              as small as it is.
            </p>
          )}
        </section>

        {/* Detail / editor */}
        <section className="min-h-[520px] border-t border-[color:var(--lifeos-line)] pt-10 lg:border-t-0 lg:border-l lg:pl-14 lg:pt-0">
          {selected ? (
            <div>
              <div className="flex items-start justify-between gap-4">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-transparent font-serif text-3xl outline-none"
                />
                <select
                  value={editKind}
                  onChange={(e) => setEditKind(e.target.value)}
                  className="shrink-0 border-b border-[color:var(--lifeos-line)] bg-transparent pb-1 text-[12px] uppercase tracking-[0.1em] text-muted-foreground outline-none"
                >
                  {KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <input
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="One-line summary…"
                className="mt-2 w-full bg-transparent text-[15px] text-muted-foreground outline-none placeholder:text-muted-foreground/55"
              />

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What is this? Where did it come from? What might it become?"
                rows={14}
                className="mt-6 w-full resize-y bg-transparent text-[15px] leading-7 outline-none placeholder:text-muted-foreground/55"
              />

              <div className="mt-6 flex items-center gap-3 border-t border-[color:var(--lifeos-line)] pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="border border-white/35 px-4 py-2 text-[13px] uppercase tracking-[0.1em] text-foreground/85 transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  className="flex items-center gap-1.5 px-2 py-2 text-[13px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Archive size={14} strokeWidth={1.5} />
                  Archive
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="ml-auto flex items-center gap-1.5 px-2 py-2 text-[13px] uppercase tracking-[0.1em] text-muted-foreground/80 transition-colors hover:text-red-700"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Select something on the left, or capture a new spark — an
              inspiration item is allowed to just stay an inspiration item.
            </p>
          )}

          {error && <p className="mt-4 text-sm text-red-700/80">{error}</p>}
        </section>
      </div>
    </SectionPage>
  )
}
