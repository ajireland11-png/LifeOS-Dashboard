'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpRight, Bookmark, BookOpen, ChevronDown, ChevronRight, Edit3, Link2, Plus, Search, Save, X } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

type Reference = {id:string;title:string;url:string;kind:string}\ntype Subject = { id: string; title: string; summary?: string | null; content: string; parentId?:string|null; kind:string; status:string; bookmarked:boolean; position:number; prerequisites:string[]; related:string[]; references:Reference[]; layers:Record<string,string>; archived: boolean; updatedAt?: string }

function headingId(value: string) {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function lessonBlocks(content: string) {
  return content.split(/\n{2,}/).map(block => block.trim()).filter(Boolean)
}
const LEARN_KINDS = ['subject','domain','topic','concept','lesson','subsection'] as const
const LEARN_STATUSES = [{value:'not-started',label:'Not started'},{value:'read',label:'Read'},{value:'practised',label:'Practised'},{value:'understood',label:'Understood'}]
const LAYER_FIELDS = [{key:'intuitive',label:'Intuitive explanation',hint:'The core idea without specialist assumptions.'},{key:'mechanism',label:'Underlying mechanism',hint:'What causes what, and why.'},{key:'technical',label:'Formal / technical detail',hint:'Equations, assumptions, definitions and derivations.'},{key:'examples',label:'Worked examples',hint:'Step-by-step examples or applications.'},{key:'applications',label:'Practical applications',hint:'Where this knowledge is useful.'},{key:'advanced',label:'Advanced notes & open questions',hint:'Limitations, unresolved questions and further depth.'}]
function flattenSubjectTree(items:Subject[],expanded:Set<string>,query:string){
 const byParent=new Map<string|null,Subject[]>()
 items.forEach(item=>{const parent=item.parentId||null;const arr=byParent.get(parent)||[];arr.push(item);byParent.set(parent,arr)})
 byParent.forEach(arr=>arr.sort((a,b)=>(a.position||0)-(b.position||0)||a.title.localeCompare(b.title)))
 if(query.trim()){
  const matches=items.filter(item=>(item.title+' '+(item.summary||'')+' '+item.content).toLowerCase().includes(query.toLowerCase()))
  return matches.map(item=>{let depth=0,p=item.parentId;while(p&&depth<20){depth++;p=items.find(x=>x.id===p)?.parentId||null}return {item,depth,hasChildren:(byParent.get(item.id)||[]).length>0,expanded:expanded.has(item.id)}})
 }
 const out:{item:Subject;depth:number;hasChildren:boolean;expanded:boolean}[]=[]
 const walk=(parent:string|null,depth:number)=>{for(const item of byParent.get(parent)||[]){const children=byParent.get(item.id)||[];out.push({item,depth,hasChildren:children.length>0,expanded:expanded.has(item.id)});if(children.length&&expanded.has(item.id))walk(item.id,depth+1)}}
 walk(null,0);return out
}

export function LearnPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedIds,setExpandedIds]=useState<Set<string>>(new Set())
  const [kind,setKind]=useState('subject')
  const [parentId,setParentId]=useState('')
  const [status,setStatus]=useState('not-started')
  const [bookmarked,setBookmarked]=useState(false)
  const [prerequisites,setPrerequisites]=useState<string[]>([])
  const [related,setRelated]=useState<string[]>([])
  const [references,setReferences]=useState<Reference[]>([])
  const [layers,setLayers]=useState<Record<string,string>>({})
  const [newKind,setNewKind]=useState('subject')
  const [newParentId,setNewParentId]=useState('')
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
      setExpandedIds(current => current.size ? current : new Set(items.filter(item=>!item.parentId).map(item=>item.id)))
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
    setKind(selected?.kind||'subject')
    setParentId(selected?.parentId||'')
    setStatus(selected?.status||'not-started')
    setBookmarked(!!selected?.bookmarked)
    setPrerequisites(selected?.prerequisites||[])
    setRelated(selected?.related||[])
    setReferences(selected?.references||[])
    setLayers(selected?.layers||{})
    setEditing(false)
  }, [selectedId, selected?.updatedAt])

  const filtered = useMemo(() => flattenSubjectTree(subjects,expandedIds,query), [subjects,expandedIds,query])
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
      const response = await fetch('/api/explore/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: nextTitle, kind:newKind, parentId:newParentId||null, status:'not-started', bookmarked:false }) })
      if (!response.ok) throw new Error('Could not create this subject.')
      const created = await response.json() as Subject
      setNewTitle('')
      if(newParentId)setExpandedIds(current=>new Set([...current,newParentId]))
      await load(created.id)
      setEditing(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create this subject.') }
    finally { setCreating(false) }
  }

  async function saveSubject() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/explore/subjects/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim() || selected.title, summary: summary.trim() || null, content, kind, parentId:parentId||null, status, bookmarked, prerequisites, related, references, layers }) })
      if (!response.ok) throw new Error('Could not save changes.')
      await load(selected.id)
      setEditing(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save changes.') }
    finally { setSaving(false) }
  }


  async function setLearningStatus(next:string){if(!selected)return;try{const r=await fetch('/api/explore/subjects/'+selected.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:next})});if(!r.ok)throw new Error('Could not update learning status.');setStatus(next);setSubjects(old=>old.map(x=>x.id===selected.id?{...x,status:next}:x))}catch(e){setError(e instanceof Error?e.message:'Could not update learning status.')}}
  async function toggleBookmark(){if(!selected)return;const next=!bookmarked;try{const r=await fetch('/api/explore/subjects/'+selected.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookmarked:next})});if(!r.ok)throw new Error('Could not update bookmark.');setBookmarked(next);setSubjects(old=>old.map(x=>x.id===selected.id?{...x,bookmarked:next}:x))}catch(e){setError(e instanceof Error?e.message:'Could not update bookmark.')}}
  function toggleExpanded(id:string){setExpandedIds(old=>{const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);return next})}
  async function moveSubject(item:Subject,direction:-1|1){const siblings=subjects.filter(x=>(x.parentId||'')===(item.parentId||'')).sort((a,b)=>(a.position||0)-(b.position||0)||a.title.localeCompare(b.title));const i=siblings.findIndex(x=>x.id===item.id),j=i+direction;if(j<0||j>=siblings.length)return;const next=[...siblings];[next[i],next[j]]=[next[j],next[i]];try{await Promise.all(next.map((x,pos)=>fetch('/api/explore/subjects/'+x.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({position:pos})})));await load(selectedId||undefined)}catch(e){setError(e instanceof Error?e.message:'Could not reorder subjects.')}}
  function toggleRelation(list:string[],setList:(v:string[])=>void,id:string,checked:boolean){setList(checked?[...list.filter(x=>x!==id),id]:list.filter(x=>x!==id))}

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
            {filtered.map((row, index) => <div className="lo-learn-tree-row" key={row.item.id} style={{paddingLeft:(row.depth*14)+'px'}}>{row.hasChildren?<button type="button" className="lo-learn-tree-toggle" onClick={()=>toggleExpanded(row.item.id)} aria-label={row.expanded?'Collapse branch':'Expand branch'}>{row.expanded?<ChevronDown size={13}/>:<ChevronRight size={13}/>}</button>:<span className="lo-learn-tree-spacer"/>}<button type="button" onClick={()=>setSelectedId(row.item.id)} className={'lo-learn-subject '+(selectedId===row.item.id?'is-selected':'')}><span className="lo-learn-subject-no">{String(index+1).padStart(2,'0')}</span><span className="lo-learn-subject-text"><strong>{row.item.title}</strong><small>{row.item.kind} · {row.item.summary||'A subject in your personal encyclopedia'}</small></span>{row.item.bookmarked&&<Bookmark size={12} className="lo-learn-bookmark-mark"/>}</button><div className="lo-learn-reorder"><button type="button" title="Move up" aria-label="Move subject up" onClick={()=>void moveSubject(row.item,-1)}><ArrowUp size={10}/></button><button type="button" title="Move down" aria-label="Move subject down" onClick={()=>void moveSubject(row.item,1)}><ArrowDown size={10}/></button></div></div>)}
          </div>
          <form className="lo-learn-create" onSubmit={createSubject}><label htmlFor="lo-learn-new">Add to the encyclopedia</label><input id="lo-learn-new" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="A subject, concept or lesson…" required/><div className="lo-learn-create-options"><select value={newKind} onChange={e=>setNewKind(e.target.value)} aria-label="New item type">{LEARN_KINDS.map(k=><option key={k} value={k}>{k}</option>)}</select><select value={newParentId} onChange={e=>setNewParentId(e.target.value)} aria-label="Parent item"><option value="">Top-level subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></div><button type="submit" disabled={creating||!newTitle.trim()} aria-label="Create subject"><Plus size={15}/> Create item</button></form>
        </aside>
        <main className="lo-learn-reader">
          {error && <div className="lo-learn-error" role="alert">{error}</div>}
          {!selected && !loading ? <div className="lo-learn-empty"><BookOpen size={28}/><h2>Begin your own reference book.</h2><p>Create a subject to collect explanations, questions, notes and useful references in one place.</p></div> : selected && <>
            <div className="lo-learn-reader-toolbar"><span><BookOpen size={14}/> FIELD NOTES <span className="lo-learn-slash">/</span> {String(Math.max(0, filtered.findIndex(x => x.item.id === selected.id) + 1)).padStart(2, '0')}</span>{editing ? <div><button type="button" onClick={() => { setEditing(false); setTitle(selected.title); setSummary(selected.summary ?? ''); setContent(selected.content); setKind(selected.kind||'subject'); setParentId(selected.parentId||''); setStatus(selected.status||'not-started'); setBookmarked(!!selected.bookmarked); setPrerequisites(selected.prerequisites||[]); setRelated(selected.related||[]); setReferences(selected.references||[]); setLayers(selected.layers||{}) }}><X size={14}/> Cancel</button><button type="button" className="lo-learn-save" disabled={saving} onClick={saveSubject}><Save size={14}/>{saving ? 'Saving…' : 'Save changes'}</button></div> : <div className="lo-learn-reader-actions"><select value={status} onChange={e=>void setLearningStatus(e.target.value)} aria-label="Learning status">{LEARN_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select><button type="button" className={bookmarked?'is-bookmarked':''} onClick={()=>void toggleBookmark()} aria-label={bookmarked?'Remove bookmark':'Bookmark this item'}><Bookmark size={14}/>{bookmarked?'Bookmarked':'Bookmark'}</button><button type="button" onClick={() => setEditing(true)}><Edit3 size={14}/> Edit entry</button></div>}</div>
            {editing ? <div className="lo-learn-editor"><div className="lo-learn-edit-grid"><label>Entry title<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Entry type<select value={kind} onChange={e=>setKind(e.target.value)}>{LEARN_KINDS.map(k=><option key={k} value={k}>{k}</option>)}</select></label><label>Parent item<select value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">Top-level item</option>{subjects.filter(s=>s.id!==selected.id).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><label>Learning status<select value={status} onChange={e=>setStatus(e.target.value)}>{LEARN_STATUSES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label><label className="lo-learn-wide">Short introduction<textarea rows={3} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="What is this subject about?"/></label><label className="lo-learn-wide">Main reading notes<textarea rows={12} value={content} onChange={e=>setContent(e.target.value)} placeholder="Use Markdown-style headings, lists, quotations and code fences for the main field guide…"/></label></div>
                <div className="lo-learn-layer-editor"><div className="lo-learn-edit-section-heading"><strong>Layers of explanation</strong><small>Use only the layers that suit this topic.</small></div>{LAYER_FIELDS.map(layer=><label key={layer.key}>{layer.label}<small>{layer.hint}</small><textarea rows={3} value={layers[layer.key]||''} onChange={e=>setLayers(old=>({...old,[layer.key]:e.target.value}))} placeholder={layer.hint}/></label>)}</div>
                <div className="lo-learn-relations-editor"><div className="lo-learn-edit-section-heading"><strong>Prerequisites</strong><small>What should be understood first?</small></div><div className="lo-learn-relation-list">{subjects.filter(s=>s.id!==selected.id).map(s=><label key={s.id}><input type="checkbox" checked={prerequisites.includes(s.id)} onChange={e=>toggleRelation(prerequisites,setPrerequisites,s.id,e.target.checked)}/><span>{s.title}</span></label>)}</div></div>
                <div className="lo-learn-relations-editor"><div className="lo-learn-edit-section-heading"><strong>Related concepts</strong><small>Cross-reference this record without duplicating it.</small></div><div className="lo-learn-relation-list">{subjects.filter(s=>s.id!==selected.id).map(s=><label key={s.id}><input type="checkbox" checked={related.includes(s.id)} onChange={e=>toggleRelation(related,setRelated,s.id,e.target.checked)}/><span>{s.title}</span></label>)}</div></div>
                <div className="lo-learn-references-editor"><div className="lo-learn-edit-section-heading"><strong>References & further reading</strong><button type="button" onClick={()=>setReferences(old=>[...old,{id:crypto.randomUUID(),title:'',url:'',kind:'reference'}])}><Plus size={13}/> Add reference</button></div>{references.map(ref=><div className="lo-learn-reference-edit-row" key={ref.id}><input value={ref.title} onChange={e=>setReferences(old=>old.map(x=>x.id===ref.id?{...x,title:e.target.value}:x))} placeholder="Reference title"/><input value={ref.url} onChange={e=>setReferences(old=>old.map(x=>x.id===ref.id?{...x,url:e.target.value}:x))} placeholder="DOI or URL"/><button type="button" onClick={()=>setReferences(old=>old.filter(x=>x.id!==ref.id))} aria-label="Remove reference"><X size={12}/></button></div>)}</div>
                <label className="lo-learn-bookmark-toggle"><input type="checkbox" checked={bookmarked} onChange={e=>setBookmarked(e.target.checked)}/> Bookmark this item for later</label>
              </div> : <article className="lo-learn-article">
              <div className="lo-learn-article-meta">PERSONAL FIELD GUIDE <span>·</span> UPDATED {selected.updatedAt ? new Date(selected.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase() : 'RECENTLY'}</div>
              <h2>{selected.title}</h2>
              {selected.summary && <p className="lo-learn-deck">{selected.summary}</p>}
              <div className="lo-learn-rule"/>{LAYER_FIELDS.filter(layer=>selected.layers?.[layer.key]?.trim()).length>0&&<section className="lo-learn-layer-reading"><div className="lo-learn-reading-label">CHOOSE YOUR DEPTH</div>{LAYER_FIELDS.filter(layer=>selected.layers?.[layer.key]?.trim()).map(layer=><details key={layer.key}><summary>{layer.label}</summary><p>{selected.layers[layer.key]}</p></details>)}</section>}
              {(selected.content?.trim() || LAYER_FIELDS.some(layer=>selected.layers?.[layer.key]?.trim())) ? <div className="lo-learn-reading-layout">
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
              {(selected.prerequisites||[]).length>0&&<section className="lo-learn-linked-records"><span>PREREQUISITES</span>{selected.prerequisites.map(id=>subjects.find(s=>s.id===id)).filter(Boolean).map(s=><button type="button" key={s!.id} onClick={()=>{setSelectedId(s!.id);let parent=s!.parentId;const next=new Set(expandedIds);while(parent){next.add(parent);parent=subjects.find(x=>x.id===parent)?.parentId||null}setExpandedIds(next)}}><ChevronRight size={13}/>{s!.title}</button>)}</section>}{(selected.related||[]).length>0&&<section className="lo-learn-linked-records"><span>RELATED CONCEPTS</span>{selected.related.map(id=>subjects.find(s=>s.id===id)).filter(Boolean).map(s=><button type="button" key={s!.id} onClick={()=>{setSelectedId(s!.id);let parent=s!.parentId;const next=new Set(expandedIds);while(parent){next.add(parent);parent=subjects.find(x=>x.id===parent)?.parentId||null}setExpandedIds(next)}}><Link2 size={13}/>{s!.title}</button>)}</section>}{(selected.references||[]).filter(ref=>ref.title&&ref.url).length>0&&<section className="lo-learn-reference-reading"><span>REFERENCES & FURTHER READING</span>{selected.references.filter(ref=>ref.title&&ref.url).map(ref=><a key={ref.id} href={ref.url.startsWith('http://')||ref.url.startsWith('https://')?ref.url:ref.url.startsWith('10.')?'https://doi.org/'+ref.url:undefined} target="_blank" rel="noreferrer"><strong>{ref.title}</strong><small>{ref.url}</small><ArrowUpRight size={12}/></a>)}</section>}<footer className="lo-learn-article-footer"><span>KEEP FOLLOWING THE QUESTION</span><button type="button" onClick={() => setActiveModule('atlas')}>See related knowledge <ArrowUpRight size={14}/></button></footer>
            </article>}
          </>}
        </main>
      </div>
    </div>
  )
}
