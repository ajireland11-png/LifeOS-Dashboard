'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Compass, FlaskConical, Plus, Sparkles, Target } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

type Item = { id: string; title?: string; name?: string; description?: string | null; summary?: string | null; status?: string; priority?: string; dueDate?: string | null; updatedAt?: string; createdAt?: string; completed?: boolean; archived?: boolean }
function list<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['items', 'data', 'results', 'tasks', 'projects', 'papers', 'subjects']) if (Array.isArray(obj[key])) return obj[key] as T[]
  }
  return []
}
function label(item: Item) { return item.title || item.name || 'Untitled' }
function dateMs(item: Item) { const v = new Date(item.updatedAt || item.createdAt || '').getTime(); return Number.isFinite(v) ? v : 0 }
function isOpen(item: Item) { return !item.completed && !item.archived && !['done','completed','cancelled','archived'].includes((item.status || '').toLowerCase()) }

export function OverviewPage() {
  const setActiveModule = useAppStore(s => s.setActiveModule)
  const requestNewNote = useAppStore(s => s.requestNewNote)
  const [tasks,setTasks]=useState<Item[]>([])
  const [projects,setProjects]=useState<Item[]>([])
  const [papers,setPapers]=useState<Item[]>([])
  const [studio,setStudio]=useState<Item[]>([])
  const [subjects,setSubjects]=useState<Item[]>([])
  const [loading,setLoading]=useState(true)
  const [now,setNow]=useState(()=>new Date())

  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60_000);return()=>clearInterval(timer)},[])
  useEffect(()=>{
    let cancelled=false
    const endpoints=['/api/tasks','/api/projects','/api/research/papers','/api/studio/items','/api/explore/subjects']
    Promise.all(endpoints.map(async url=>{try{const res=await fetch(url);return res.ok?list<Item>(await res.json()):[]}catch{return []}})).then(([t,p,r,s,l])=>{
      if(cancelled)return
      setTasks(t);setProjects(p);setPapers(r);setStudio(s);setSubjects(l);setLoading(false)
    })
    return()=>{cancelled=true}
  },[])

  const openTasks=useMemo(()=>tasks.filter(isOpen).sort((a,b)=>{
    const da=a.dueDate?new Date(a.dueDate).getTime():Number.MAX_SAFE_INTEGER
    const db=b.dueDate?new Date(b.dueDate).getTime():Number.MAX_SAFE_INTEGER
    return da-db
  }),[tasks])
  const activeProjects=useMemo(()=>projects.filter(isOpen).sort((a,b)=>dateMs(b)-dateMs(a)).slice(0,3),[projects])
  const activePapers=useMemo(()=>papers.filter(isOpen).sort((a,b)=>dateMs(b)-dateMs(a)).slice(0,3),[papers])
  const recentStudio=useMemo(()=>studio.filter(x=>!x.archived).sort((a,b)=>dateMs(b)-dateMs(a)).slice(0,4),[studio])
  const greeting=now.getHours()<12?'Good morning':now.getHours()<18?'Good afternoon':'Good evening'
  const date=new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long'}).format(now)
  const dueSoon=openTasks.filter(x=>x.dueDate && new Date(x.dueDate).getTime()>=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime()).slice(0,4)

  return <div className="lo-overview">
    <header className="lo-overview-welcome">
      <div><div className="lo-overline">LIFEOS / OVERVIEW <span>·</span> {date.toUpperCase()}</div><h1>{greeting}.<br/><em>Your world, in progress.</em></h1><p>A considered view of what you're studying, making, learning and carrying forward.</p></div>
      <div className="lo-overview-actions"><button type="button" onClick={()=>setActiveModule('tasks')}><Plus size={15}/> Add a task</button><button type="button" className="lo-overview-action-quiet" onClick={requestNewNote}><BookOpen size={15}/> Capture a thought</button></div>
    </header>
    <div className="lo-overview-rule"><span>THE CURRENT LANDSCAPE</span><i/></div>
    <section className="lo-overview-landscape" aria-label="Life areas">
      <button className="lo-overview-area lo-area-research" onClick={()=>setActiveModule('research')}><div className="lo-area-head"><FlaskConical size={17}/><span>01 / RESEARCH</span><ArrowUpRight size={15}/></div><h2>Questions worth<br/>working through.</h2><div className="lo-area-foot"><strong>{papers.length.toString().padStart(2,'0')}</strong><span>papers in the lab</span><i/></div></button>
      <button className="lo-overview-area lo-area-studio" onClick={()=>setActiveModule('studio')}><div className="lo-area-head"><Sparkles size={17}/><span>02 / CREATIVE STUDIO</span><ArrowUpRight size={15}/></div><h2>Things worth<br/>making.</h2><div className="lo-area-foot"><strong>{studio.length.toString().padStart(2,'0')}</strong><span>saved ideas & references</span><i/></div></button>
      <button className="lo-overview-area lo-area-learn" onClick={()=>setActiveModule('learn')}><div className="lo-area-head"><BookOpen size={17}/><span>03 / LEARN</span><ArrowUpRight size={15}/></div><h2>Build a deeper<br/>understanding.</h2><div className="lo-area-foot"><strong>{subjects.length.toString().padStart(2,'0')}</strong><span>living subjects</span><i/></div></button>
      <button className="lo-overview-area lo-area-atlas" onClick={()=>setActiveModule('atlas')}><div className="lo-area-head"><Compass size={17}/><span>04 / ATLAS</span><ArrowUpRight size={15}/></div><h2>Find the threads<br/>between things.</h2><div className="lo-area-foot"><strong>↗</strong><span>connected knowledge</span><i/></div></button>
    </section>
    <section className="lo-overview-lower">
      <div className="lo-overview-focus">
        <div className="lo-overview-section-heading"><div><span className="lo-overline">IN MOTION</span><h2>Current focus</h2></div><button onClick={()=>setActiveModule('projects')}>All projects <ArrowRight size={14}/></button></div>
        {loading ? <p className="lo-overview-empty">Gathering your current work…</p> : activeProjects.length ? <div className="lo-overview-projects">{activeProjects.map((item,i)=><button key={item.id} onClick={()=>setActiveModule('projects')}><span className="lo-overview-count">{String(i+1).padStart(2,'0')}</span><span className="lo-overview-project-copy"><strong>{label(item)}</strong><small>{item.description || item.summary || 'Open project workspace'}</small></span><ArrowUpRight size={15}/></button>)}</div> : <button className="lo-overview-empty-action" onClick={()=>setActiveModule('projects')}>Create your first project <ArrowUpRight size={14}/></button>}
        <div className="lo-overview-section-heading lo-overview-paper-heading"><div><span className="lo-overline">ON THE BENCH</span><h2>Research pulse</h2></div><button onClick={()=>setActiveModule('research')}>Open research <ArrowRight size={14}/></button></div>
        {activePapers.length ? activePapers.map(item=><button key={item.id} className="lo-overview-paper" onClick={()=>setActiveModule('research')}><BookOpen size={15}/><span>{label(item)}</span><small>{item.status || 'In progress'}</small><ArrowUpRight size={14}/></button>) : <p className="lo-overview-empty">Your research workspace will appear here as you add papers.</p>}
      </div>
      <div className="lo-overview-commitments">
        <div className="lo-overview-section-heading"><div><span className="lo-overline">NEXT IN LINE</span><h2>Commitments</h2></div><button onClick={()=>setActiveModule('tasks')}>All tasks <ArrowRight size={14}/></button></div>
        <div className="lo-overview-task-summary"><strong>{openTasks.length.toString().padStart(2,'0')}</strong><span>open tasks</span><Target size={17}/></div>
        {dueSoon.length ? <div className="lo-overview-task-list">{dueSoon.map(item=><button key={item.id} onClick={()=>setActiveModule('tasks')}><span className="lo-overview-task-mark"/><span>{label(item)}</span><time>{item.dueDate?new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(item.dueDate)):'—'}</time></button>)}</div> : <p className="lo-overview-empty">No dated commitments coming up. Leave room for curiosity.</p>}
        <div className="lo-overview-inspiration"><div className="lo-overline">RECENTLY COLLECTED</div><h3>A little inspiration<br/><em>for the next thing.</em></h3>{recentStudio.length ? recentStudio.map(item=><button key={item.id} onClick={()=>setActiveModule('studio')}><Sparkles size={14}/><span>{label(item)}</span><ArrowDownRight size={14}/></button>) : <p>Your saved references will gather here.</p>}<button className="lo-overview-discover" onClick={()=>setActiveModule('studio')}>Visit Creative Studio <ArrowUpRight size={14}/></button></div>
      </div>
    </section>
  </div>
}
