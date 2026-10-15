'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/stores/app-store'
import { BookOpen, ChevronRight, ExternalLink, FileImage, FlaskConical, Microscope, Plus, Save, Table2, Trash2, X } from 'lucide-react'

type Checkpoint = { id:string; title:string; done:boolean }
type Figure = { id:string; title:string; dataUrl:string; caption?:string; description?:string; status?:string; checkpoints?:Checkpoint[] }
type TableBlock = { id:string; title:string; cells:string[][] }
type ManuscriptSection = { id:string; title:string; checkpoints:Checkpoint[] }
type Dataset = { id:string; title:string; fileName:string; mimeType:string; dataUrl:string; preview:string[][]; purpose:string; status:string }
type Task = {id:string;title:string;description?:string|null;status:string;priority:string;dueDate?:string|null}
type Paper = {
  id:string; title:string; authors?:string|null; journal?:string|null; year?:number|null; doi?:string|null; sourceUrl?:string|null
  abstractText?:string|null; scientificQuestion?:string|null; background?:string|null; mechanisms?:string|null
  interpretation?:string|null; limitations?:string|null; openQuestions?:string|null; notes?:string|null
  figures:Figure[]; tables:TableBlock[]; status:string; targetJournal?:string|null; submissionDeadline?:string|null; sections:ManuscriptSection[]; datasets:Dataset[]
}
const blank = { title:'', authors:'', journal:'', year:null, doi:'', sourceUrl:'', abstractText:'', scientificQuestion:'', background:'', mechanisms:'', interpretation:'', limitations:'', openQuestions:'', notes:'', status:'reading', targetJournal:'', submissionDeadline:'', sections:[], datasets:[] }
const val=(v?:string|null)=>v??''
const CHECKPOINT_TITLES=['Outline prepared','First draft written','Scientific content checked','References reviewed','Feedback received','Revisions complete']
function defaultSections():ManuscriptSection[]{return ['Abstract','Introduction','Results','Discussion','Methods','Conclusion'].map(title=>({id:crypto.randomUUID(),title,checkpoints:CHECKPOINT_TITLES.slice(0,5).map(label=>({id:crypto.randomUUID(),title:label,done:false}))}))}
function parseCsv(text:string):string[][]{const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++}else if(ch==='"'){quoted=!quoted}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell=''}else cell+=ch}row.push(cell);if(row.some(v=>v!==''))rows.push(row);return rows.slice(0,8).map(r=>r.slice(0,8))}
async function readZipText(buffer:ArrayBuffer,wanted:string):Promise<string>{
 const view=new DataView(buffer);let end=-1
 for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--){if(view.getUint32(i,true)===0x06054b50){end=i;break}}
 if(end<0)throw new Error('Invalid XLSX archive')
 const count=view.getUint16(end+10,true);let offset=view.getUint32(end+16,true);const decoder=new TextDecoder()
 for(let i=0;i<count;i++){
  if(view.getUint32(offset,true)!==0x02014b50)break
  const method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),nameLength=view.getUint16(offset+28,true),extraLength=view.getUint16(offset+30,true),commentLength=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true)
  const name=decoder.decode(new Uint8Array(buffer,offset+46,nameLength))
  if(name===wanted){
   const localName=view.getUint16(local+26,true),localExtra=view.getUint16(local+28,true),begin=local+30+localName+localExtra,data=new Uint8Array(buffer,begin,compressed)
   if(method===0)return decoder.decode(data)
   if(method===8){const bytes=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength) as ArrayBuffer;const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return await new Response(stream).text()}
   throw new Error('Unsupported XLSX compression')
  }
  offset+=46+nameLength+extraLength+commentLength
 }
 throw new Error('XLSX entry not found: '+wanted)
}
async function parseXlsxPreview(file:File):Promise<string[][]>{
 const buffer=await file.arrayBuffer();let shared:string[]=[]
 try{const xml=await readZipText(buffer,'xl/sharedStrings.xml');const doc=new DOMParser().parseFromString(xml,'application/xml');shared=Array.from(doc.getElementsByTagNameNS('*','si')).map(si=>Array.from(si.getElementsByTagNameNS('*','t')).map(t=>t.textContent||'').join(''))}catch{}
 const sheet=await readZipText(buffer,'xl/worksheets/sheet1.xml');const doc=new DOMParser().parseFromString(sheet,'application/xml')
 const colIndex=(ref:string)=>{let n=0;for(const ch of ref.replace(/[0-9]/g,''))n=n*26+ch.charCodeAt(0)-64;return n-1}
 const rows=Array.from(doc.getElementsByTagNameNS('*','row')).slice(0,8).map(row=>{const cells=Array.from(row.getElementsByTagNameNS('*','c'));const result:string[]=[];for(const cell of cells){const ref=cell.getAttribute('r')||'A1',col=colIndex(ref),type=cell.getAttribute('t');const value=cell.getElementsByTagNameNS('*','v')[0]?.textContent||'';const inline=Array.from(cell.getElementsByTagNameNS('*','t')).map(t=>t.textContent||'').join('');result[col]=type==='s'?(shared[Number(value)]||''):type==='inlineStr'?inline:value}return result.slice(0,8).map(v=>v||'')})
 return rows
}

export function ResearchPage(){
  const researchPaperRequest=useAppStore(s=>s.researchPaperRequest)
  const setResearchPaperRequest=useAppStore(s=>s.setResearchPaperRequest)
  const researchAssetRequest=useAppStore(s=>s.researchAssetRequest)
  const setResearchAssetRequest=useAppStore(s=>s.setResearchAssetRequest)
  const [papers,setPapers]=useState<Paper[]>([])
  const [allTasks,setAllTasks]=useState<Task[]>([])
  const [paperTasks,setPaperTasks]=useState<Task[]>([])
  const [taskToLink,setTaskToLink]=useState('')
  const [selected,setSelected]=useState<Paper|null>(null)
  const [pendingAssetFocus,setPendingAssetFocus]=useState<{type:'figure'|'dataset';id:string}|null>(null)
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
  useEffect(()=>{void load();fetch('/api/tasks').then(r=>r.ok?r.json():[]).then(data=>setAllTasks(Array.isArray(data)?data:[])).catch(()=>setAllTasks([]))},[])
  useEffect(()=>{if(!selected||selected.id==='new'){setPaperTasks([]);return}let cancelled=false;fetch('/api/research/papers/'+selected.id+'/tasks').then(r=>r.ok?r.json():[]).then(data=>{if(!cancelled)setPaperTasks(Array.isArray(data)?data:[])}).catch(()=>{if(!cancelled)setPaperTasks([])});return()=>{cancelled=true}},[selected?.id])
  const visible=useMemo(()=>papers.filter(p=>`${p.title} ${p.authors||''} ${p.journal||''} ${p.abstractText||''}`.toLowerCase().includes(query.toLowerCase())),[papers,query])
  const sections=useMemo(()=>[['scientificQuestion','Scientific question'],['abstractText','Abstract'],['background','Background'],['mechanisms','Mechanisms'],['interpretation','Interpretation'],['limitations','Limitations'],['openQuestions','Open questions'],['notes','Reading notes']] as const,[])
  function open(p:Paper){setSelected(p);setDraft({...p,figures:p.figures??[],tables:p.tables??[],sections:p.sections??[],datasets:p.datasets??[],status:p.status||'reading'});setAdding(false);setError('')}
  useEffect(()=>{if(!researchPaperRequest||loading)return;const paper=papers.find(p=>p.id===researchPaperRequest);if(paper)open(paper);setResearchPaperRequest(null)},[researchPaperRequest,loading,papers,setResearchPaperRequest])
  useEffect(()=>{if(!researchAssetRequest||loading)return;const paper=papers.find(p=>p.id===researchAssetRequest.paperId);if(paper){setPendingAssetFocus({type:researchAssetRequest.type,id:researchAssetRequest.itemId});open(paper)}setResearchAssetRequest(null)},[researchAssetRequest,loading,papers,setResearchAssetRequest])
  useEffect(()=>{if(!pendingAssetFocus||!draft||draft.id!==selected?.id)return;const target=document.getElementById('research-'+pendingAssetFocus.type+'-'+pendingAssetFocus.id);target?.scrollIntoView({behavior:'smooth',block:'center'});setPendingAssetFocus(null)},[pendingAssetFocus,draft?.id,selected?.id])
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
    reader.onload=async()=>{let preview:string[][]=[];if(file.name.toLowerCase().endsWith('.csv')){try{preview=parseCsv(await file.text())}catch{preview=[]}}else if(file.name.toLowerCase().endsWith('.xlsx')){try{preview=await parseXlsxPreview(file)}catch{preview=[]}};patch('datasets',[...(draft.datasets??[]),{id:crypto.randomUUID(),title:file.name.replace(/\.[^/.]+$/,''),fileName:file.name,mimeType:file.type||'application/octet-stream',dataUrl:String(reader.result),preview,purpose:'',status:'source'}])}
    reader.readAsDataURL(file)
  }
  function updateSection(id:string,fn:(s:ManuscriptSection)=>ManuscriptSection){if(draft)patch('sections',draft.sections.map(s=>s.id===id?fn(s):s))}
  function addSection(){if(draft)patch('sections',[...draft.sections,{id:crypto.randomUUID(),title:'New section',checkpoints:CHECKPOINT_TITLES.slice(0,3).map(title=>({id:crypto.randomUUID(),title,done:false}))}])}
  async function linkTask(e:React.FormEvent){e.preventDefault();if(!selected||selected.id==='new'||!taskToLink)return;try{const r=await fetch('/api/research/papers/'+selected.id+'/tasks/'+taskToLink,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw new Error('Could not link task');const res=await fetch('/api/research/papers/'+selected.id+'/tasks');setPaperTasks(res.ok?await res.json():[]);setTaskToLink('')}catch(e){setError(e instanceof Error?e.message:'Could not link task')}}
  async function unlinkTask(id:string){if(!selected)return;try{const r=await fetch('/api/research/papers/'+selected.id+'/tasks/'+id,{method:'DELETE'});if(!r.ok)throw new Error('Could not unlink task');setPaperTasks(old=>old.filter(t=>t.id!==id))}catch(e){setError(e instanceof Error?e.message:'Could not unlink task')}}
  const availableTasks=allTasks.filter(t=>!paperTasks.some(x=>x.id===t.id)&&!['done','cancelled'].includes(t.status))

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
                {(draft.figures??[]).map(f=><div key={f.id} id={'research-figure-'+f.id} className="lo-figure-specimen"><div className="lo-figure-image-wrap"><img src={f.dataUrl} alt={f.title}/><button type="button" onClick={()=>patch('figures',draft.figures.filter(x=>x.id!==f.id))} aria-label="Remove figure"><X size={12}/></button></div><input className="lo-figure-title" value={f.title} onChange={e=>updateFigure(f.id,x=>({...x,title:e.target.value}))} placeholder="Figure title"/><textarea value={f.caption||''} onChange={e=>updateFigure(f.id,x=>({...x,caption:e.target.value}))} placeholder="Caption / figure legend" rows={2}/><textarea value={f.description||''} onChange={e=>updateFigure(f.id,x=>({...x,description:e.target.value}))} placeholder="What does this figure show? Evidence, interpretation, limitations…" rows={3}/><label className="lo-figure-status-label">FIGURE STATUS<select value={f.status||'draft'} onChange={e=>updateFigure(f.id,x=>({...x,status:e.target.value}))}><option value="draft">Draft</option><option value="analysis">Analysis in progress</option><option value="verified">Data verified</option><option value="final">Final for manuscript</option></select></label><div className="lo-figure-checkpoints">{(f.checkpoints||[]).map(cp=><label key={cp.id}><input type="checkbox" checked={cp.done} onChange={e=>updateFigure(f.id,x=>({...x,checkpoints:(x.checkpoints||[]).map(y=>y.id===cp.id?{...y,done:e.target.checked}:y)}))}/><span>{cp.title}</span></label>)}</div><button type="button" className="lo-manuscript-add-checkpoint" onClick={()=>updateFigure(f.id,x=>({...x,checkpoints:[...(x.checkpoints||[]),{id:crypto.randomUUID(),title:'New figure checkpoint',done:false}]}))}><Plus size={12}/> Add figure checkpoint</button></div>)}
                <button type="button" className="lo-dropzone" onClick={()=>fileInput.current?.click()}><FileImage size={22}/><strong>Add figure</strong><span>PNG, JPG, WEBP · up to 8 MB</span></button>
              </div><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e=>{const f=e.target.files?.[0];if(f)addFigure(f);e.currentTarget.value=''}}/></section>
              <section className="lo-lab-module"><div className="lo-module-heading"><span>Tables</span><i/></div><div className="lo-table-stack">
                {(draft.tables??[]).map(t=><div className="lo-table-specimen" key={t.id}><div className="lo-table-title"><input value={t.title} onChange={e=>updateTable(t.id,x=>({...x,title:e.target.value}))}/><button type="button" onClick={()=>patch('tables',draft.tables.filter(x=>x.id!==t.id))} aria-label="Remove table"><X size={12}/></button></div><div className="lo-mini-table">{t.cells.map((row,ri)=>row.map((cell,ci)=><input key={ri+'-'+ci} aria-label={`Row ${ri+1}, column ${ci+1}`} value={cell} onChange={e=>updateTable(t.id,x=>{const cells=x.cells.map(r=>[...r]);cells[ri][ci]=e.target.value;return {...x,cells}})}/>) )}</div><div className="lo-table-dimensions"><button type="button" onClick={()=>updateTable(t.id,x=>({...x,cells:[...x.cells,Array(x.cells[0]?.length||1).fill('')]}))}>+ Row</button><button type="button" onClick={()=>updateTable(t.id,x=>({...x,cells:x.cells.map(row=>[...row,''])}))}>+ Column</button></div></div>)}
                <button type="button" className="lo-add-module" onClick={addTable}><Table2 size={15}/> Add table</button>
              </div></section>
              <section className="lo-lab-module lo-dataset-module"><div className="lo-module-heading"><span>Source datasets</span><i/></div><p className="lo-module-hint">Original files stay intact. CSV previews are derived for inspection; source files are kept separately from any edited tables.</p>
                {draft.datasets.map(d=><article className="lo-dataset-card" key={d.id} id={'research-dataset-'+d.id}><div className="lo-dataset-card-head"><strong>{d.title}</strong><a href={d.dataUrl} download={d.fileName}>Download source</a><button type="button" onClick={()=>patch('datasets',draft.datasets.filter(x=>x.id!==d.id))} aria-label="Remove dataset"><X size={12}/></button></div><input className="lo-dataset-title" value={d.title} onChange={e=>patch('datasets',draft.datasets.map(x=>x.id===d.id?{...x,title:e.target.value}:x))} aria-label="Dataset title"/><label>Purpose<input value={d.purpose} onChange={e=>patch('datasets',draft.datasets.map(x=>x.id===d.id?{...x,purpose:e.target.value}:x))} placeholder="What does this dataset support?"/></label><label>Analysis state<select value={d.status} onChange={e=>patch('datasets',draft.datasets.map(x=>x.id===d.id?{...x,status:e.target.value}:x))}><option value="source">Source / unmodified</option><option value="quality-check">Quality check</option><option value="analysing">Analysis in progress</option><option value="derived">Derived data produced</option><option value="used">Used in manuscript</option></select></label><small className="lo-dataset-source-name">Original file: {d.fileName} · {Math.round(d.dataUrl.length*0.75/1024)} KB encoded</small>{d.preview.length>0?<div className="lo-dataset-preview"><table><tbody>{d.preview.map((row,ri)=><tr key={ri}>{row.map((cell,ci)=><td key={ci}>{cell}</td>)}</tr>)}</tbody></table><small>CSV preview · first {d.preview.length} rows, up to 8 columns</small></div>:<p className="lo-dataset-no-preview">The original workbook is preserved. Inline preview could not be read from this workbook; the original file is still preserved.</p>}</article>)}
                <button type="button" className="lo-dropzone lo-dataset-dropzone" onClick={()=>datasetInput.current?.click()}><Table2 size={20}/><strong>Add CSV / Excel source</strong><span>CSV or XLSX · original file retained · up to 8 MB</span></button><input ref={datasetInput} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={e=>{const file=e.target.files?.[0];if(file)void addDataset(file);e.currentTarget.value=''}}/>
              </section>
              <section className="lo-lab-module lo-paper-task-module"><div className="lo-module-heading"><span>Tasks for this paper</span><i/></div><p className="lo-module-hint">Link canonical LifeOS tasks here; progress stays shared with the main task list.</p>
                {paperTasks.map(t=><div className="lo-paper-task-row" key={t.id}><span className={'lo-paper-task-mark status-'+t.status}/><span><strong>{t.title}</strong><small>{t.status.replace('-',' ')} · {t.priority}</small></span><button type="button" onClick={()=>unlinkTask(t.id)} aria-label="Unlink task"><X size={12}/></button></div>)}
                {paperTasks.length===0&&<p className="lo-dataset-no-preview">No tasks linked to this paper yet.</p>}
                {draft.id!=='new'&&<form className="lo-paper-task-link" onSubmit={linkTask}><select value={taskToLink} onChange={e=>setTaskToLink(e.target.value)}><option value="">Choose an existing task…</option>{availableTasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select><button type="submit" disabled={!taskToLink}><Plus size={13}/> Link task</button></form>}
                {draft.id==='new'&&<p className="lo-dataset-no-preview">Save this paper first to link existing tasks.</p>}
              </section>
            </div>
          </div>
          {error&&<div className="lo-lab-error" role="alert">{error}</div>}
        </>}
      </main>
    </div>
    {error&&!draft&&<div className="lo-lab-error" role="alert">{error}</div>}
  </div>
}
