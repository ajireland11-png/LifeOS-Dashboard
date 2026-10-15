'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronRight, ExternalLink, FileImage, FlaskConical, Microscope, Plus, Save, Table2, Trash2, X } from 'lucide-react'

type Checkpoint = { id:string; title:string; done:boolean }
type Figure = { id:string; title:string; dataUrl:string; caption?:string; description?:string; status?:string; checkpoints?:Checkpoint[] }
type TableBlock = { id:string; title:string; cells:string[][] }
type ManuscriptSection = { id:string; title:string; checkpoints:Checkpoint[] }
type Dataset = { id:string; title:string; fileName:string; mimeType:string; dataUrl:string; preview:string[][]; purpose:string; status:string }
type Paper = {
  id:string; title:string; authors?:string|null; journal?:string|null; year?:number|null; doi?:string|null; sourceUrl?:string|null
  abstractText?:string|null; scientificQuestion?:string|null; background?:string|null; mechanisms?:string|null
  interpretation?:string|null; limitations?:string|null; openQuestions?:string|null; notes?:string|null
  figures:Figure[]; tables:TableBlock[]
}
const blank = { title:'', authors:'', journal:'', year:null, doi:'', sourceUrl:'', abstractText:'', scientificQuestion:'', background:'', mechanisms:'', interpretation:'', limitations:'', openQuestions:'', notes:'', status:'reading', targetJournal:'', submissionDeadline:'', sections:[], datasets:[] }
const val=(v?:string|null)=>v??''
const CHECKPOINT_TITLES=['Outline prepared','First draft written','Scientific content checked','References reviewed','Feedback received','Revisions complete']
function defaultSections():ManuscriptSection[]{return ['Abstract','Introduction','Results','Discussion','Methods','Conclusion'].map(title=>({id:crypto.randomUUID(),title,checkpoints:CHECKPOINT_TITLES.slice(0,5).map(label=>({id:crypto.randomUUID(),title:label,done:false}))}))}
function parseCsv(text:string):string[][]{const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"'){quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell=''}else cell+=ch}row.push(cell);if(row.some(v=>v!==''))rows.push(row);return rows.slice(0,8).map(r=>r.slice(0,8))}

export function ResearchPage(){
  const [papers,setPapers]=useState<Paper[]>([])
  const [selected,setSelected]=useState<Paper|null>(null)
  const [draft,setDraft]=useState<Paper|null>(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [adding,setAdding]=useState(false)
  const [query,setQuery]=useState('')
  const [error,setError]=useState('')
  const fileInput=useRef<HTMLInputElement>(null)
  const datasetInput=useRef<HTMLInputElement>(null)

  async function load(){
    setLoading(true)
    try{const r=await fetch('/api/research/papers');if(!r.ok)throw new Error('Could not load your paper library.');const data=await r.json();setPapers(Array.isArray(data)?data:[])}
    catch(e){setError(e instanceof Error?e.message:'Could not load papers.')}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])
  const visible=useMemo(()=>papers.filter(p=>`${p.title} ${p.authors||''} ${p.journal||''} ${p.abstractText||''}`.toLowerCase().includes(query.toLowerCase())),[papers,query])
  const sections=useMemo(()=>[['scientificQuestion','Scientific question'],['abstractText','Abstract'],['background','Background'],['mechanisms','Mechanisms'],['interpretation','Interpretation'],['limitations','Limitations'],['openQuestions','Open questions'],['notes','Reading notes']] as const,[])
  function open(p:Paper){setSelected(p);setDraft({...p,figures:p.figures??[],tables:p.tables??[],sections:p.sections??[],datasets:p.datasets??[],status:p.status||'reading'});setAdding(false);setError('')}
  function startNew(){const p={...blank,id:'new',figures:[],tables:[],sections:defaultSections(),datasets:[]} as Paper;setSelected(p);setDraft(p);setAdding(true);setError('')}
  function patch<K extends keyof Paper>(key:K,value:Paper[K]){setDraft(d=>d?({...d,[key]:value}):d)}
  async function save(){
    if(!draft?.title.trim())return
    setSaving(true);setError('')
    try{
      const r=await fetch(draft.id==='new'?'/api/research/papers':'/api/research/papers/'+draft.id,{method:draft.id==='new'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,abstract:draft.abstractText})})
      if(!r.ok)throw new Error('Could not save this paper. Check the required fields and try again.')
      const p=await r.json() as Paper;await load();open(p)
    }catch(e){setError(e instanceof Error?e.message:'Could not save paper.')}finally{setSaving(false)}
  }
  async function remove(){
    if(!draft||draft.id==='new'||!window.confirm('Permanently delete this paper?'))return
    try{const r=await fetch('/api/research/papers/'+draft.id,{method:'DELETE'});if(!r.ok)throw new Error('Could not delete this paper.');setSelected(null);setDraft(null);await load()}
    catch(e){setError(e instanceof Error?e.message:'Could not delete paper.')}
  }
  function addFigure(file:File){
    if(!draft)return
    if(file.size>8*1024*1024){setError('Please choose an image smaller than 8 MB.');return}
    const reader=new FileReader()
    reader.onload=()=>patch('figures',[...(draft.figures??[]),{id:crypto.randomUUID(),title:file.name.replace(/\.[^/.]+$/,''),dataUrl:String(reader.result),caption:'',description:'',status:'draft',checkpoints:[{id:crypto.randomUUID(),title:'Data verified',done:false},{id:crypto.randomUUID(),title:'Analysis complete',done:false},{id:crypto.randomUUID(),title:'Visual styling finalised',done:false},{id:crypto.randomUUID(),title:'Caption written',done:false},{id:crypto.randomUUID(),title:'Manuscript placement confirmed',done:false}]}])
    reader.readAsDataURL(file)
  }
  async function addDataset(file:File){
    if(!draft)return
    if(file.size>8*1024*1024){setError('Please choose a dataset smaller than 8 MB.');return}
    const reader=new FileReader()
    reader.onload=async()=>{let preview:string[][]=[];if(file.name.toLowerCase().endsWith('.csv')){try{preview=parseCsv(await file.text())}catch{preview=[]}};patch('datasets',[...(draft.datasets??[]),{id:crypto.randomUUID(),title:file.name.replace(/\.[^/.]+$/,''),fileName:file.name,mimeType:file.type||'application/octet-stream',dataUrl:String(reader.result),preview,purpose:'',status:'source'}])}
    reader.readAsDataURL(file)
  }
  function updateSection(id:string,fn:(s:ManuscriptSection)=>ManuscriptSection){if(draft)patch('sections',draft.sections.map(s=>s.id===id?fn(s):s))}
  function addSection(){if(draft)patch('sections',[...draft.sections,{id:crypto.randomUUID(),title:'New section',checkpoints:CHECKPOINT_TITLES.slice(0,3).map(title=>({id:crypto.randomUUID(),title,done:false}))}])}
  function addTable(){if(draft)patch('tables',[...(draft.tables??[]),{id:crypto.randomUUID(),title:'New table',cells:[['Column 1','Column 2'],['','']]}])}
  function updateTable(id:string,fn:(t:TableBlock)=>TableBlock){if(draft)patch('tables',draft.tables.map(t=>t.id===id?fn(t):t))}
  function updateFigure(id:string,fn:(f:Figure)=>Figure){if(draft)patch('figures',draft.figures.map(f=>f.id===id?fn(f):f))}
  const checkpointTotal=draft?.sections.reduce((n,s)=>n+s.checkpoints.length,0)||0
  const checkpointDone=draft?.sections.reduce((n,s)=>n+s.checkpoints.filter(c=>c.done).length,0)||0
  const progress=checkpointTotal?Math.round(checkpointDone/checkpointTotal*100):0

  return <div className="lo-research-page">
    <header className="lo-research-header">
      <div><div className="lo-overline">LIFEOS / SCIENTIFIC WORK</div><h1>Research.</h1><p>A working laboratory for papers, mechanisms, evidence, figures and unanswered questions.</p></div>
      <button type="button" className="lo-research-new" onClick={startNew}><Plus size={16}/> New paper</button>
    </header>
    <div className="lo-research-layout">
      <aside className="lo-paper-shelf">
        <div className="lo-shelf-title"><BookOpen size={15}/> PAPER LIBRARY <span>{visible.length.toString().padStart(2,'0')}</span></div>
        <label className="lo-research-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a paper"/></label>
        {loading&&<div className="lo-shelf-empty">Opening the shelves…</div>}
        {!loading&&visible.length===0&&<button type="button" className="lo-first-specimen" onClick={startNew}><Plus size={20}/><span>{query?'No papers match. Create a new entry.':'Begin with your first paper'}</span></button>}
        {visible.map((p,i)=><button type="button" key={p.id} onClick={()=>open(p)} className="lo-paper-spine" data-selected={selected?.id===p.id}><span className="lo-paper-index">{String(i+1).padStart(2,'0')}</span><span><strong>{p.title}</strong><small>{p.journal||'Uncatalogued'}{p.year?' · '+p.year:''}</small></span><ChevronRight size={14}/></button>)}
      </aside>
      <main className="lo-lab-bench">
        {!draft?<div className="lo-lab-empty"><Microscope size={34}/><strong>Read beyond the abstract.</strong><span>Keep the question, mechanism, evidence and limitations in view as you work through a paper.</span><button type="button" onClick={startNew}>Add a paper <ChevronRight size={14}/></button></div>:<>
          <div className="lo-paper-header">
            <div className="lo-paper-heading-copy"><div className="lo-overline">{adding?'NEW PAPER / LAB NOTE':'PAPER / READING NOTES'}</div><input className="lo-paper-title" value={draft.title} onChange={e=>patch('title',e.target.value)} placeholder="Paper title…"/><div className="lo-paper-meta"><input value={val(draft.authors)} onChange={e=>patch('authors',e.target.value)} placeholder="Authors"/><input value={val(draft.journal)} onChange={e=>patch('journal',e.target.value)} placeholder="Journal"/><input value={draft.year??''} onChange={e=>patch('year',e.target.value?Number(e.target.value):null)} placeholder="Year" type="number"/></div><div className="lo-paper-workflow-meta"><label>Stage<select value={draft.status||'reading'} onChange={e=>patch('status',e.target.value)}><option value="reading">Reading</option><option value="analysing">Analysing</option><option value="drafting">Drafting</option><option value="review">In review</option><option value="submitted">Submitted</option><option value="published">Published</option></select></label><label>Target journal<input value={val(draft.targetJournal)} onChange={e=>patch('targetJournal',e.target.value)} placeholder="Optional"/></label><label>Target submission<input type="date" value={val(draft.submissionDeadline)} onChange={e=>patch('submissionDeadline',e.target.value)}/></label></div></div>
            <div className="lo-paper-actions"><button type="button" onClick={save} disabled={saving||!draft.title.trim()}><Save size={14}/>{saving?'Saving…':'Save'}</button>{draft.id!=='new'&&<button type="button" className="lo-icon-danger" onClick={remove} aria-label="Delete paper"><Trash2 size={14}/></button>}<button type="button" onClick={()=>{setDraft(null);setSelected(null)}} aria-label="Close paper"><X size={14}/></button></div>
          </div>
          <div className="lo-paper-progress"><div className="lo-paper-progress-ring" style={{background:'conic-gradient(#c6a56b '+(progress*3.6)+'deg, #343a33 0deg)'}}><span>{progress}%</span></div><div className="lo-paper-progress-copy"><strong>Manuscript progress</strong><small>{checkpointDone} of {checkpointTotal} configured checkpoints complete</small><div className="lo-paper-progress-track"><span style={{width:progress+'%'}}/></div></div><span className={'lo-paper-status status-'+(draft.status||'reading')}>{(draft.status||'reading').replace('-',' ')}</span></div>
          <div className="lo-paper-grid">
            <div className="lo-lab-column">
              {sections.map(([key,label])=><section key={key} className="lo-lab-module"><div className="lo-module-heading"><span>{label}</span><i/></div><textarea value={val(draft[key])} onChange={e=>patch(key,e.target.value as never)} placeholder={key==='scientificQuestion'?'What is the paper trying to explain or test?':'Capture '+label.toLowerCase()+'…'} rows={key==='abstractText'?7:5}/></section>)}
              <section className="lo-lab-module lo-manuscript-module"><div className="lo-module-heading"><span>Manuscript sections & checkpoints</span><i/></div><p className="lo-module-hint">Keep the source material and the writing process distinct. Rename sections and tune the checklist to this paper.</p>
                {draft.sections.map((s,i)=><div className="lo-manuscript-section" key={s.id}><div className="lo-manuscript-section-head"><span>SECTION {String(i+1).padStart(2,'0')}</span><button type="button" onClick={()=>patch('sections',draft.sections.filter(x=>x.id!==s.id))} aria-label="Remove section"><Trash2 size={12}/></button></div><input className="lo-manuscript-section-title" value={s.title} onChange={e=>updateSection(s.id,x=>({...x,title:e.target.value}))}/><div className="lo-manuscript-checkpoints">{s.checkpoints.map(cp=><label key={cp.id}><input type="checkbox" checked={cp.done} onChange={e=>updateSection(s.id,x=>({...x,checkpoints:x.checkpoints.map(y=>y.id===cp.id?{...y,done:e.target.checked}:y)}))}/><input value={cp.title} onChange={e=>updateSection(s.id,x=>({...x,checkpoints:x.checkpoints.map(y=>y.id===cp.id?{...y,title:e.target.value}:y)}))}/><button type="button" onClick={()=>updateSection(s.id,x=>({...x,checkpoints:x.checkpoints.filter(y=>y.id!==cp.id)}))} aria-label="Remove checkpoint"><X size={11}/></button></label>)}</div><button type="button" className="lo-manuscript-add-checkpoint" onClick={()=>updateSection(s.id,x=>({...x,checkpoints:[...x.checkpoints,{id:crypto.randomUUID(),title:'New checkpoint',done:false}]}))}><Plus size={12}/> Add checkpoint</button></div>)}
                <button type="button" className="lo-add-module" onClick={addSection}><Plus size={14}/> Add manuscript section</button>
              </section>
              <section className="lo-lab-module"><div className="lo-module-heading"><span>Source details</span><i/></div><div className="lo-source-row"><input value={val(draft.doi)} onChange={e=>patch('doi',e.target.value)} placeholder="DOI"/><input value={val(draft.sourceUrl)} onChange={e=>patch('sourceUrl',e.target.value)} placeholder="Paper URL"/>{draft.sourceUrl&&<a href={draft.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open source"><ExternalLink size={14}/></a>}</div></section>
            </div>
            <div className="lo-lab-column">
              <section className="lo-lab-module"><div className="lo-module-heading"><span>Figures & evidence</span><i/></div><p className="lo-module-hint">Add figure images and label what each one demonstrates. Images are kept with this paper.</p><div className="lo-figure-grid">
                {(draft.figures??[]).map(f=><div key={f.id} className="lo-figure-specimen"><img src={f.dataUrl} alt={f.title}/><input value={f.title} onChange={e=>patch('figures',draft.figures.map(x=>x.id===f.id?{...x,title:e.target.value}:x))}/><button type="button" onClick={()=>patch('figures',draft.figures.filter(x=>x.id!==f.id))} aria-label="Remove figure"><X size={12}/></button></div>)}
                <button type="button" className="lo-dropzone" onClick={()=>fileInput.current?.click()}><FileImage size={22}/><strong>Add figure</strong><span>PNG, JPG, WEBP · up to 8 MB</span></button>
              </div><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{const f=e.target.files?.[0];if(f)addFigure(f);e.currentTarget.value=''}}/></section>
              <section className="lo-lab-module"><div className="lo-module-heading"><span>Tables</span><i/></div><div className="lo-table-stack">
                {(draft.tables??[]).map(t=><div className="lo-table-specimen" key={t.id}><div className="lo-table-title"><input value={t.title} onChange={e=>updateTable(t.id,x=>({...x,title:e.target.value}))}/><button type="button" onClick={()=>patch('tables',draft.tables.filter(x=>x.id!==t.id))} aria-label="Remove table"><X size={12}/></button></div><div className="lo-mini-table">{t.cells.map((row,ri)=>row.map((cell,ci)=><input key={ri+'-'+ci} aria-label={`Row ${ri+1}, column ${ci+1}`} value={cell} onChange={e=>updateTable(t.id,x=>{const cells=x.cells.map(r=>[...r]);cells[ri][ci]=e.target.value;return {...x,cells}})}/>) )}</div></div>)}
                <button type="button" className="lo-add-module" onClick={addTable}><Table2 size={15}/> Add table</button>
              </div></section>
            </div>
          </div>
          {error&&<div className="lo-lab-error" role="alert">{error}</div>}
        </>}
      </main>
    </div>
    {error&&!draft&&<div className="lo-lab-error" role="alert">{error}</div>}
  </div>
}
