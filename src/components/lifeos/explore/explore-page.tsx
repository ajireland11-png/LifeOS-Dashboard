'use client'

import { useCallback, useEffect, useState } from 'react'
import { Archive, BookOpen, Plus, Trash2 } from 'lucide-react'
import { SectionPage } from '../shared/section-page'

type Subject = {
  id: string
  title: string
  summary?: string | null
  content: string
  archived: boolean
  updatedAt: string
}

function formatDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ExplorePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/explore/subjects')
      const data = response.ok ? await response.json() : []
      setSubjects(Array.isArray(data) ? data : [])
    } catch {
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = subjects.find((s) => s.id === selectedId) ?? null

  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title)
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
      const response = await fetch('/api/explore/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error || "Couldn't create that subject.")
        return
      }
      const created = (await response.json()) as Subject
      setNewTitle('')
      await load()
      setSelectedId(created.id)
    } catch {
      setError("Couldn't reach Explore — check the backend is running.")
    } finally {
      setCreating(false)
    }
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/explore/subjects/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || selected.title,
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
      setError("Couldn't reach Explore — check the backend is running.")
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!selected) return
    try {
      const response = await fetch(`/api/explore/subjects/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      if (response.ok) {
        setSelectedId(null)
        await load()
      }
    } catch {
      // Silent — the row simply stays, which is visible feedback enough.
    }
  }

  async function handleDelete() {
    if (!selected) return
    try {
      const response = await fetch(`/api/explore/subjects/${selected.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSelectedId(null)
        await load()
      }
    } catch {
      // Silent — same reasoning as archive.
    }
  }

  return (
    <SectionPage
      eyebrow="Knowledge & discovery"
      title="Explore"
      description=""
    >
      <div className="grid gap-14 pb-20 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Subject list + new subject */}
        <section>
          <div className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <BookOpen size={14} strokeWidth={1.5} />
            Subjects
          </div>

          <form onSubmit={handleCreate} className="mb-6 flex items-center gap-2 border-b border-[color:var(--lifeos-line)] pb-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Start a new subject…"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/55"
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="flex shrink-0 items-center justify-center border border-white/35 p-1.5 text-foreground/85 transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/85"
              aria-label="Add subject"
            >
              <Plus size={14} strokeWidth={1.75} />
            </button>
          </form>

                     {!loading && subjects.length > 0 && (
             <div className="mb-10 border-y border-[color:var(--lifeos-line)] py-7">
               <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
                 <div>
                   <p className="lifeos-kicker text-[10px] uppercase tracking-[0.2em]">Field guide</p>
                   <p className="mt-1 font-serif text-2xl">Things worth understanding</p>
                   <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                     Subjects can remain open-ended. A curiosity does not need a deadline,
                     a score or a finished outcome.
                   </p>
                 </div>
                 <div className="font-serif text-5xl text-foreground/[0.08] sm:text-7xl">
                   {String(subjects.length).padStart(2, '0')}
                 </div>
               </div>
             </div>
           )}

{loading ? (
            <p className="text-sm italic text-muted-foreground/80">Reading your library…</p>
          ) : subjects.length > 0 ? (
            <div className="lifeos-specimen-grid">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setSelectedId(subject.id)}
                  className={`lifeos-specimen-card group relative block w-full border-[color:var(--lifeos-line)] p-5 text-left transition-all ${
                    subject.id === selectedId ? 'text-foreground' : 'text-foreground/65 hover:bg-white/[0.018] hover:pl-2 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3"><div className="font-serif text-lg">{subject.title}</div>{subject.id === selectedId && <span className="lifeos-kicker text-[9px] uppercase tracking-[0.16em]">open</span>}</div>
                  {subject.summary && (
                    <div className="mt-0.5 truncate text-sm text-muted-foreground">{subject.summary}</div>
                  )}
                  <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/55">
                    {formatDate(subject.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              <button type="button" onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Start a new subject…"]')?.focus()} className="text-sm text-muted-foreground hover:text-foreground">Begin a field note →</button>
            </p>
          )}
        </section>

        {/* Detail / editor */}
        <section className="min-h-[520px] border-t border-[color:var(--lifeos-line)] pt-10 lg:border-t-0 lg:border-l lg:pl-14 lg:pt-0">
          {selected ? (
            <div>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-transparent font-serif text-3xl outline-none"
              />
              <input
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="One-line summary…"
                className="mt-2 w-full bg-transparent text-[15px] text-muted-foreground outline-none placeholder:text-muted-foreground/55"
              />

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="What do you know so far? What are you curious about?"
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
              Select a subject on the left, or start a new one — this space
              is for the substantial explanations, questions and references
              the brief describes; it can start as a single line and grow
              from there.
            </p>
          )}

          {error && <p className="mt-4 text-sm text-red-700/80">{error}</p>}
        </section>
      </div>
    </SectionPage>
  )
}
