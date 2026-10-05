'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronRight, ExternalLink, FileImage, FlaskConical, Microscope, Plus, Save, Table2, Trash2, X } from 'lucide-react'
import { SectionPage } from '../shared/section-page'

type Figure = { id: string; title: string; dataUrl: string }
type TableBlock = { id: string; title: string; cells: string[][] }
type Paper = {
  id:string; title:string; authors?:string|null; journal?:string|null; year?:number|null; doi?:string|null; sourceUrl?:string|null
  abstractText?:string|null; scientificQuestion?:string|null; background?:string|null; mechanisms?:string|null
  interpretation?:string|null; limitations?:string|null; openQuestions?:string|null; notes?:string|null
  figures:Figure[]; tables:TableBlock[]
}
const emptyPaper = { title:'', authors:'', journal:'', year:null, doi:'', sourceUrl:'', abstractText:'', scientificQuestion:'', background:'', mechanisms:'', interpretation:'', limitations:'', openQuestions:'', notes:'' }
const text = (v?:string|null) => v ?? ''

export function ResearchPage() {
  const [papers,setPapers]=useState<Paper[]>([])
  const [selected,setSelected]=useState<Paper|null>(null)
  const [draft,setDraft]=useState<Paper|null>(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [adding,setAdding]=useState(false)
  const [error,setError]=useState('')
  const figureInput=useRef<HTMLInputElement>(null)

  async function load(){
    setLoading(true)
    try { const r=await fetch('/api/research/papers'); const data=await r.json(); setPapers(Array.isArray(data)?data:[]) }
    catch { setPapers([]) } finally { setLoading(false) }
  }
  useEffect(()=>{ void load() },[])

  const sections = useMemo(()=>[
    ['scientificQuestion','Scientific question'],['abstractText','Abstract'],['background','Background'],
    ['mechanisms','Mechanisms'],['interpretation','Interpretation'],['limitations','Limitations'],
    ['openQuestions','Open questions'],['notes','Notes']
  ] as const,[])

  function open(p:Paper){setSelected(p);setDraft({...p,figures:p.figures??[],tables:p.tables??[]});setAdding(false)}
  function startNew(){const p={...emptyPaper,id:'new',figures:[],tables:[]} as Paper;setSelected(p);setDraft(p);setAdding(true)}
  function patch<K extends keyof Paper>(key:K,value:Paper[K]){setDraft(d=>d?({...d,[key]:value}):d)}

  async function save(){
    if(!draft?.title.trim()) return
    setSaving(true);setError('')
    try {
      const r=await fetch(draft.id==='new'?'/api/research/papers':'/api/research/papers/'+draft.id,{
        method:draft.id==='new'?'POST':'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...draft,abstract:draft.abstractText})
      })
      if(!r.ok) throw new Error('Could not save paper')
      const p=await r.json(); await load(); open(p)
    } catch(e){setError(e instanceof Error?e.message:'Could not save paper')} finally {setSaving(false)}
  }
  async function remove(){
    if(!draft||draft.id==='new') return
    if(!confirm('Delete this paper?')) return
    await fetch('/api/research/papers/'+draft.id,{method:'DELETE'});setSelected(null);setDraft(null);await load()
  }
  function addFigure(file:File){
    if(!draft)return
    const reader=new FileReader()
    reader.onload=()=>patch('figures',[...(draft.figures??[]),{id:crypto.randomUUID(),title:file.name.replace(/\.[^/.]+$/,''),dataUrl:String(reader.result)}])
    reader.readAsDataURL(file)
  }
  function addTable(){if(draft)patch('tables',[...(draft.tables??[]),{id:crypto.randomUUID(),title:'New table',cells:[['Column 1','Column 2'],['','']]}])}
  function updateTable(id:string,fn:(t:TableBlock)=>TableBlock){if(draft)patch('tables',draft.tables.map(t=>t.id===id?fn(t):t))}

  return <SectionPage eyebrow="Scientific work" title="Research" description="">
    <div className="lifeos-lab">
      <div className="lifeos-lab-toolbar">
        <div className="lifeos-lab-stamp"><FlaskConical size={18}/><span>LABORATORY</span></div>
        <button className="lifeos-lab-add" onClick={startNew}><Plus size={16}/> New paper</button>
      </div>
      <div className="lifeos-lab-layout">
        <aside className="lifeos-paper-shelf">
          <div className="lifeos-shelf-title"><BookOpen size={15}/> Papers <span>{papers.length}</span></div>
          {loading && <div className="lifeos-shelf-empty">Loading…</div>}
          {!loading && papers.length===0 && <button className="lifeos-first-specimen" onClick={startNew}><Plus size={20}/><span>Place the first paper on the shelf</span></button>}
          {papers.map((p,i)=><button key={p.id} onClick={()=>open(p)} className={'lifeos-paper-spine'} data-selected={selected?.id===p.id}>
            <span className="lifeos-paper-index">{String(i+1).padStart(2,'0')}</span>
            <span><strong>{p.title}</strong><small>{p.journal||'Uncatalogued'}{p.year ? ' · '+p.year : ''}</small></span><ChevronRight size={14}/>
          </button>)}
        </aside>
        <main className="lifeos-lab-bench">
          {!draft ? <div className="lifeos-lab-empty"><Microscope size={42}/><strong>Choose a specimen</strong><span>Open a paper, or begin a new one.</span><button onClick={startNew}>Add new paper <ChevronRight size={14}/></button></div> : <>
            <div className="lifeos-paper-header">
              <div>
                <span className="lifeos-kicker">{adding?'NEW SPECIMEN':'PAPER'}</span>
                <input value={draft.title} onChange={e=>patch('title',e.target.value)} placeholder="Paper title…" className="lifeos-paper-title"/>
                <div className="lifeos-paper-meta">
                  <input value={text(draft.authors)} onChange={e=>patch('authors',e.target.value)} placeholder="Authors"/>
                  <input value={text(draft.journal)} onChange={e=>patch('journal',e.target.value)} placeholder="Journal"/>
                  <input value={draft.year??''} onChange={e=>patch('year',e.target.value?Number(e.target.value):null)} placeholder="Year" type="number"/>
                </div>
              </div>
              <div className="lifeos-paper-actions">
                <button onClick={save} disabled={saving||!draft.title.trim()}><Save size={15}/>{saving?'Saving':'Save'}</button>
                {draft.id!=='new'&&<button onClick={remove} className="lifeos-icon-danger" title="Delete"><Trash2 size={15}/></button>}
                <button onClick={()=>{setDraft(null);setSelected(null)}} title="Close"><X size={15}/></button>
              </div>
            </div>
            <div className="lifeos-paper-grid">
              <div className="lifeos-lab-column">
                {sections.map(([key,label])=><section key={key} className="lifeos-lab-module">
                  <div className="lifeos-module-heading"><span>{label}</span><i/></div>
                  <textarea value={text(draft[key])} onChange={e=>patch(key,e.target.value as never)} placeholder={'Add '+label.toLowerCase()+'…'} rows={key==='abstractText'?7:5}/>
                </section>)}
                <section className="lifeos-lab-module">
                  <div className="lifeos-module-heading"><span>Source</span><i/></div>
                  <div className="lifeos-source-row"><input value={text(draft.doi)} onChange={e=>patch('doi',e.target.value)} placeholder="DOI"/><input value={text(draft.sourceUrl)} onChange={e=>patch('sourceUrl',e.target.value)} placeholder="Paper URL"/>{draft.sourceUrl&&<a href={draft.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/></a>}</div>
                </section>
              </div>
              <div className="lifeos-lab-column">
                <section className="lifeos-lab-module lifeos-evidence-module">
                  <div className="lifeos-module-heading"><span>Figures & evidence</span><i/></div>
                  <div className="lifeos-figure-grid">
                    {draft.figures.map(f=><div key={f.id} className="lifeos-figure-specimen">
                      <img src={f.dataUrl} alt={f.title}/><input value={f.title} onChange={e=>patch('figures',draft.figures.map(x=>x.id===f.id?{...x,title:e.target.value}:x))}/><button onClick={()=>patch('figures',draft.figures.filter(x=>x.id!==f.id))}><X size={12}/></button>
                    </div>)}
                    <button className="lifeos-dropzone" onClick={()=>figureInput.current?.click()}><FileImage size={22}/><strong>Add figure</strong><span>PNG, JPG, WEBP</span></button>
                  </div>
                  <input ref={figureInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{const f=e.target.files?.[0];if(f)addFigure(f);e.currentTarget.value=''}}/>
                </section>
                <section className="lifeos-lab-module">
                  <div className="lifeos-module-heading"><span>Tables</span><i/></div>
                  <div className="lifeos-table-stack">
                    {draft.tables.map(t=><div className="lifeos-table-specimen" key={t.id}>
                      <div className="lifeos-table-title"><input value={t.title} onChange={e=>updateTable(t.id,x=>({...x,title:e.target.value}))}/><button onClick={()=>patch('tables',draft.tables.filter(x=>x.id!==t.id))}><X size={12}/></button></div>
                      <div className="lifeos-mini-table">{t.cells.map((row,ri)=>row.map((cell,ci)=><input key={ri+'-'+ci} value={cell} onChange={e=>updateTable(t.id,x=>{const cells=x.cells.map(r=>[...r]);cells[ri][ci]=e.target.value;return {...x,cells}})}/>) )}</div>
                    </div>)}
                    <button className="lifeos-add-module" onClick={addTable}><Table2 size={15}/> Add table</button>
                  </div>
                </section>
              </div>
            </div>
            {error&&<div className="lifeos-lab-error">{error}</div>}
          </>}
        </main>
      </div>
    </div>
  </SectionPage>
}
