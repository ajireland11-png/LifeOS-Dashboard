'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, BookOpen, Brush, Image, Lightbulb, Plus, Save, Sparkles, Trash2 } from 'lucide-react'

type Item = { id:string; title:string; kind:string; summary?:string|null; content:string; archived:boolean; updatedAt:string }
const KINDS = ['idea','inspiration','material','technique','reference'] as const
const kindLabel:Record<string,string> = { idea:'Ideas', inspiration:'Inspiration', material:'Materials', technique:'Techniques', reference:'References' }

export function StudioPage() {
  const [items,setItems]=useState<Item[]>([])
  const [loading,setLoading]=useState(true)
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const [newTitle,setNewTitle]=useState('')
  const [newKind,setNewKind]=useState('inspiration')
  const [creating,setCreating]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [title,setTitle]=useState('')
  const [kind,setKind]=useState('idea')
  const [summary,setSummary]=useState('')
  const [content,setContent]=useState('')

  const load=useCallback(async()=>{
    setLoading(true)
    try { const r=await fetch('/api/studio/items'); if(!r.ok) throw new Error('Could not open Studio.'); const data=await r.json(); setItems(Array.isArray(data)?data.filter((x:Item)=>!x.archived):[]) }
    catch(e){setError(e instanceof Error?e.message:'Could not load Studio.')} finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[])
  const selected=items.find(x=>x.id===selectedId)||null
  const visible=useMemo(()=>items.filter(x=>(filter==='all'||x.kind===filter)&&`${x.title} ${x.summary||''} ${x.content}`.toLowerCase().includes(search.toLowerCase())),[items,filter,search])
  useEffect(()=>{setTitle(selected?.title||'');setKind(selected?.kind||'idea');setSummary(selected?.summary||'');setContent(selected?.content||'')},[selectedId,selected?.updatedAt])

  async function create(e:React.FormEvent){
    e.preventDefault(); if(!newTitle.trim())return
    setCreating(true);setError('')
    try{const r=await fetch('/api/studio/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle.trim(),kind:newKind})});if(!r.ok)throw new Error('Could not create this entry.');const item=await r.json() as Item;setNewTitle('');await load();setSelectedId(item.id)}
    catch(e){setError(e instanceof Error?e.message:'Could not create this entry.')}finally{setCreating(false)}
  }
  async function save(){
    if(!selected)return
    setSaving(true);setError('')
    try{const r=await fetch('/api/studio/items/'+selected.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim()||selected.title,kind,summary:summary.trim()||null,content})});if(!r.ok)throw new Error('Could not save changes.');await load()}
    catch(e){setError(e instanceof Error?e.message:'Could not save changes.')}finally{setSaving(false)}
  }
  async function archive(){
    if(!selected)return
    try{const r=await fetch('/api/studio/items/'+selected.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({archived:true})});if(!r.ok)throw new Error('Could not archive this entry.');setSelectedId(null);await load()}
    catch(e){setError(e instanceof Error?e.message:'Could not archive this entry.')}
  }
  async function remove(){
    if(!selected||!window.confirm('Permanently delete this entry?'))return
    try{const r=await fetch('/api/studio/items/'+selected.id,{method:'DELETE'});if(!r.ok)throw new Error('Could not delete this entry.');setSelectedId(null);await load()}
    catch(e){setError(e instanceof Error?e.message:'Could not delete this entry.')}
  }

  return <div className="lo-studio">
    <header className="lo-studio-header"><div><div className="lo-overline">LIFEOS / MAKING & COLLECTING</div><h1>Creative Studio.</h1><p>A place for sparks, materials, references and experiments. Not everything here needs to become a task.</p></div><button type="button" className="lo-studio-new-button" onClick={()=>{setNewKind("inspiration");document.getElementById("studio-capture")?.focus()}}><Sparkles size={15}/> Capture inspiration</button></header>
    <div className="lo-studio-main">
      <aside className="lo-studio-library">
        <div className="lo-learn-index-title"><span>COLLECTED MATERIAL</span><span>{items.length.toString().padStart(2,'0')}</span></div>
        <form className="lo-studio-capture" onSubmit={create}><input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Capture a spark…" id="studio-capture"/><button disabled={creating||!newTitle.trim()} aria-label="Create entry"><Plus size={16}/></button></form>
        <label className="lo-studio-kind-select"><span>Collect as</span><select value={newKind} onChange={e=>setNewKind(e.target.value)}>{KINDS.map(k=><option value={k} key={k}>{kindLabel[k]}</option>)}</select></label>
        <label className="lo-learn-search lo-studio-search"><Image size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the workbench"/></label>
        <div className="lo-studio-filters"><button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Everything</button>{KINDS.map(k=><button key={k} type="button" aria-pressed={filter===k} onClick={()=>setFilter(k)}>{kindLabel[k]}</button>)}</div>
        {loading?<p className="lo-studio-muted">Gathering your references…</p>:visible.length?<div>{visible.map((item,i)=><button type="button" key={item.id} aria-current={selectedId===item.id} className="lo-studio-item" onClick={()=>setSelectedId(item.id)}><small>{String(i+1).padStart(2,'0')} / {kindLabel[item.kind]||item.kind} · {item.updatedAt?new Date(item.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'New'}</small><strong>{item.title}</strong>{item.summary&&<small>{item.summary}</small>}</button>)}</div>:<p className="lo-studio-muted">{search?'Nothing matches this search.':'The workbench is empty. Save a thought, material or reference to begin.'}</p>}
      </aside>
      <main className="lo-studio-editor">
        {selected?<><div className="lo-studio-editor-head"><div className="lo-overline">WORKING NOTE / {kindLabel[kind]||kind}</div><select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Entry type">{KINDS.map(k=><option key={k} value={k}>{kindLabel[k]}</option>)}</select></div><input className="lo-studio-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Give this entry a name"/><input className="lo-studio-summary" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="A short description, material, mood or question…"/><textarea className="lo-studio-content" value={content} onChange={e=>setContent(e.target.value)} placeholder="Collect the details here: what caught your eye, where you found it, what you might try, materials, links, or questions…" rows={16}/><div className="lo-studio-actions"><button type="button" className="lo-studio-save" onClick={save} disabled={saving}><Save size={14}/>{saving?'Saving…':'Save entry'}</button><button type="button" onClick={archive}><Archive size={14}/> Archive</button><button type="button" className="lo-studio-delete" onClick={remove}><Trash2 size={14}/> Delete</button></div></>:<div className="lo-studio-empty"><Brush size={30}/><h2>Leave room for the unexpected.</h2><p>Choose something you have collected, or add a new idea. The Studio is a place to follow your curiosity before deciding what it means.</p><button type="button" className="lo-studio-new-button" onClick={()=>{setNewKind('inspiration');document.getElementById('studio-capture')?.focus()}}> <Lightbulb size={15}/> Start with an inspiration</button></div>}
        {error&&<div className="lo-studio-error" role="alert">{error}</div>}
      </main>
    </div>
  </div>
}
