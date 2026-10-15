'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BookOpen, ChevronRight, Edit3, Plus, Search, Save, X } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

type Subject = { id: string; title: string; summary?: string | null; content: string; archived: boolean; updatedAt?: string }

function headingId(value: string) {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function lessonBlocks(content: string) {
  return content.split(/\n{2,}/).map(block => block.trim()).filter(Boolean)
}

export function LearnPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const setActiveModule = useAppStore(s => s.setActiveModule)

  const load = useCallback(async (preferId?: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/explore/subjects')
      if (!response.ok) throw new Error('Could not load your library.')
      const data = await response.json()
      const items = Array.isArray(data) ? data as Subject[] : []
      setSubjects(items)
      setSelectedId(current => preferId || (current && items.some(item => item.id === current) ? current : items[0]?.id || null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your library.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  const selected = subjects.find(item => item.id === selectedId) ?? null
  useEffect(() => {
    setTitle(selected?.title ?? '')
    setSummary(selected?.summary ?? '')
    setContent(selected?.content ?? '')
    setEditing(false)
  }, [selectedId, selected?.updatedAt])

  const filtered = useMemo(() => subjects.filter(item => `${item.title} ${item.summary ?? ''} ${item.content}`.toLowerCase().includes(query.toLowerCase())), [subjects, query])
  const readingBlocks = useMemo(() => lessonBlocks(selected?.content ?? ''), [selected?.content])
  const headings = useMemo(() => readingBlocks.flatMap(block => {
    const match = block.match(/^(#{1,3})\s+(.+)$/)
    return match ? [{ title: match[2].trim(), id: headingId(match[2].trim()), level: match[1].length }] : []
  }), [readingBlocks])

  async function createSubject(event: React.FormEvent) {
    event.preventDefault()
    const nextTitle = newTitle.trim()
    if (!nextTitle) return
    setCreating(true); setError('')
    try {
      const response = await fetch('/api/explore/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: nextTitle }) })
      if (!response.ok) throw new Error('Could not create this subject.')
      const created = await response.json() as Subject
      setNewTitle('')
      await load(created.id)
      setEditing(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create this subject.') }
    finally { setCreating(false) }
  }

  async function saveSubject() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/explore/subjects/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() || selected.title, summary: summary.trim() || null, content }) })
      if (!response.ok) throw new Error('Could not save changes.')
      await load(selected.id)
      setEditing(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save changes.') }
    finally { setSaving(false) }
  }

  return (
    <div className="lo-learn-page">
      <header className="lo-learn-header">
        <div><div className="lo-overline">PERSONAL ENCYCLOPEDIA / LEARN</div><h1>A world to understand.</h1><p>Build a living reference library for the things you want to know deeply.</p></div>
        <button type="button" className="lo-learn-back" onClick={() => setActiveModule('atlas')}><ArrowUpRight size={15}/> Explore connections</button>
      </header>
      <div className="lo-learn-workspace">
        <aside className="lo-learn-index">
          <div className="lo-learn-index-title"><span>YOUR LIBRARY</span><span>{subjects.length.toString().padStart(2, '0')}</span></div>
          <label className="lo-learn-search"><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a subject"/></label>
          <div className="lo-learn-subject-list">
            {loading && <p className="lo-learn-muted">Opening the shelves…</p>}
            {!loading && filtered.length === 0 && <p className="lo-learn-muted">No subjects yet. Start with something you want to understand.</p>}
            {filtered.map((item, index) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`lo-learn-subject ${selectedId === item.id ? 'is-selected' : ''}`}>
              <span className="lo-learn-subject-no">{String(index + 1).padStart(2, '0')}</span><span className="lo-learn-subject-text"><strong>{item.title}</strong><small>{item.summary || 'A subject in your personal encyclopedia'}</small></span><ChevronRight size={14}/>
            </button>)}
          </div>
          <form className="lo-learn-create" onSubmit={createSubject}><label htmlFor="lo-learn-new">Add a subject</label><div><input id="lo-learn-new" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Phase separation"/><button type="submit" disabled={creating || !newTitle.trim()} aria-label="Create subject"><Plus size={16}/></button></div></form>
        </aside>
        <main className="lo-learn-reader">
          {error && <div className="lo-learn-error" role="alert">{error}</div>}
          {!selected && !loading ? <div className="lo-learn-empty"><BookOpen size={28}/><h2>Begin your own reference book.</h2><p>Create a subject to collect explanations, questions, notes and useful references in one place.</p></div> : selected && <>
            <div className="lo-learn-reader-toolbar"><span><BookOpen size={14}/> FIELD NOTES <span className="lo-learn-slash">/</span> {String(Math.max(0, filtered.findIndex(x => x.id === selected.id) + 1)).padStart(2, '0')}</span>{editing ? <div><button type="button" onClick={() => { setEditing(false); setTitle(selected.title); setSummary(selected.summary ?? ''); setContent(selected.content) }}><X size={14}/> Cancel</button><button type="button" className="lo-learn-save" disabled={saving} onClick={saveSubject}><Save size={14}/>{saving ? 'Saving…' : 'Save changes'}</button></div> : <button type="button" onClick={() => setEditing(true)}><Edit3 size={14}/> Edit entry</button>}</div>
            {editing ? <div className="lo-learn-editor"><label>Subject title<input value={title} onChange={e => setTitle(e.target.value)}/></label><label>Short introduction<textarea rows={3} value={summary} onChange={e => setSummary(e.target.value)} placeholder="What is this subject about?"/></label><label>Reading notes<textarea rows={16} value={content} onChange={e => setContent(e.target.value)} placeholder="Write your explanation, key ideas, questions, examples and references here…"/></label></div> : <article className="lo-learn-article">
              <div className="lo-learn-article-meta">PERSONAL FIELD GUIDE <span>·</span> UPDATED {selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase() : 'RECENTLY'}</div>
              <h2>{selected.title}</h2>
              {selected.summary && <p className="lo-learn-deck">{selected.summary}</p>}
              <div className="lo-learn-rule"/>
              {selected.content?.trim() ? <div className="lo-learn-reading-layout">
                {headings.length > 0 && <nav className="lo-learn-toc" aria-label="On this page"><span>ON THIS PAGE</span>{headings.map(item => <a key={item.id} href={'#' + item.id} className={'lo-learn-toc-level-' + item.level}>{item.title}</a>)}</nav>}
                <div className="lo-learn-body">{readingBlocks.map((block, i) => {
                  const heading = block.match(/^(#{1,3})\s+(.+)$/)
                  if (heading) {
                    const id = headingId(heading[2].trim())
                    if (heading[1].length === 1) return <h3 id={id} key={i}>{heading[2]}</h3>
                    if (heading[1].length === 2) return <h4 id={id} key={i}>{heading[2]}</h4>
                    return <h5 id={id} key={i}>{heading[2]}</h5>
                  }
                  const fence = String.fromCharCode(96).repeat(3)
                  if (block.startsWith(fence) && block.endsWith(fence)) return <pre key={i}><code>{block.slice(3, -3).replace(/^\w+\n/, '')}</code></pre>
                  const lines = block.split('\n')
                  if (lines.every(line => /^[-*]\s+/.test(line))) return <ul key={i}>{lines.map((line, j) => <li key={j}>{line.replace(/^[-*]\s+/, '')}</li>)}</ul>
                  if (lines.every(line => /^\d+\.\s+/.test(line))) return <ol key={i}>{lines.map((line, j) => <li key={j}>{line.replace(/^\d+\.\s+/, '')}</li>)}</ol>
                  if (block.startsWith('> ')) return <blockquote key={i}>{block.replace(/^>\s?/gm, '')}</blockquote>
                  return <p key={i}>{block}</p>
                })}</div>
              </div> : <div className="lo-learn-first-note"><BookOpen size={20}/><div><strong>This page is ready to grow.</strong><p>Use headings to build a proper field guide: Intuitive explanation, Mechanism, Technical detail, Worked examples, Open questions and Further reading. Use Edit entry to begin.</p></div><button type="button" onClick={() => setEditing(true)}>Write this entry <ArrowUpRight size={14}/></button></div>}
              <footer className="lo-learn-article-footer"><span>KEEP FOLLOWING THE QUESTION</span><button type="button" onClick={() => setActiveModule('atlas')}>See related knowledge <ArrowUpRight size={14}/></button></footer>
            </article>}
          </>}
        </main>
      </div>
    </div>
  )
}
