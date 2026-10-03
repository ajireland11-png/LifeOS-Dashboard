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
      description="Your creative environment for inspiration, references, ideas, materials, techniques and things you might one day make. Nothing here has to become a task."
    >
      <div className="grid gap-14 pb-20 lg:grid-cols-[minmax(0,320px)_1fr]">
        {/* List + new item */}
        <section>
          <div className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-black/45">
            <Lightbulb size={14} strokeWidth={1.5} />
            Studio
          </div>

          <form onSubmit={handleCreate} className="mb-4 flex items-center gap-2 border-b border-black/20 pb-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Capture a spark…"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-black/30"
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="flex shrink-0 items-center justify-center border border-black/70 p-1.5 text-black/80 transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-black/80"
              aria-label="Add item"
            >
              <Plus size={14} strokeWidth={1.75} />
            </button>
          </form>

          <select
            value={newKind}
            onChange={(e) => setNewKind(e.target.value)}
            className="mb-6 border-b border-black/10 bg-transparent pb-2 text-[12px] uppercase tracking-[0.1em] text-black/50 outline-none"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                New item will be: {k}
              </option>
            ))}
          </select>

          <div className="mb-5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.1em] text-black/40">
            <button
              type="button"
              onClick={() => setKindFilter('all')}
              className={kindFilter === 'all' ? 'text-black' : 'hover:text-black/70'}
            >
              All
            </button>
            {KIND_OPTIONS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={kindFilter === k ? 'text-black' : 'hover:text-black/70'}
              >
                {k}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm italic text-black/40">Reading the studio…</p>
          ) : visibleItems.length > 0 ? (
            <div className="divide-y divide-black/10">
              {visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`block w-full py-3.5 text-left transition-colors ${
                    item.id === selectedId ? 'text-black' : 'text-black/70 hover:text-black'
                  }`}
                >
                  <div className="font-serif text-lg">{item.title}</div>
                  {item.summary && (
                    <div className="mt-0.5 truncate text-sm text-black/45">{item.summary}</div>
                  )}
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-black/30">
                    {item.kind} · {formatDate(item.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-black/45">
              Nothing here yet — capture something above. It can stay exactly
              as small as it is.
            </p>
          )}
        </section>

        {/* Detail / editor */}
        <section className="border-t border-black/10 pt-10 lg:border-t-0 lg:border-l lg:pl-14 lg:pt-0">
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
                  className="shrink-0 border-b border-black/20 bg-transparent pb-1 text-[12px] uppercase tracking-[0.1em] text-black/50 outline-none"
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
                className="mt-2 w-full bg-transparent text-[15px] text-black/50 outline-none placeholder:text-black/30"
              />

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What is this? Where did it come from? What might it become?"
                rows={14}
                className="mt-6 w-full resize-y bg-transparent text-[15px] leading-7 outline-none placeholder:text-black/30"
              />

              <div className="mt-6 flex items-center gap-3 border-t border-black/10 pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="border border-black/70 px-4 py-2 text-[13px] uppercase tracking-[0.1em] text-black/80 transition-colors hover:bg-black hover:text-white disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  className="flex items-center gap-1.5 px-2 py-2 text-[13px] uppercase tracking-[0.1em] text-black/50 transition-colors hover:text-black"
                >
                  <Archive size={14} strokeWidth={1.5} />
                  Archive
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="ml-auto flex items-center gap-1.5 px-2 py-2 text-[13px] uppercase tracking-[0.1em] text-black/40 transition-colors hover:text-red-700"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-black/45">
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
