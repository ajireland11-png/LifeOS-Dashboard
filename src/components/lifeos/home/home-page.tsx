"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, BookOpen, CalendarDays, Compass, House, Search, Sparkles } from "lucide-react"
import { SectionPage } from "@/components/lifeos/shared/section-page"
import { useAppStore } from "@/stores/app-store"

type LifeItem={id:string;title:string;description?:string;status?:string;createdAt?:string;updatedAt?:string;dueDate?:string|null;completed?:boolean}
const arr=<T,>(v:unknown):T[]=>Array.isArray(v)?v as T[]:v&&typeof v==="object"?Object.values(v as Record<string,unknown>).find(Array.isArray) as T[]||[]:[]
const title=(x:LifeItem)=>x.title||"Untitled"
const stamp=(x:LifeItem)=>{const t=new Date(x.updatedAt||x.createdAt||"").getTime();return Number.isNaN(t)?0:t}
const sameDay=(v:string|null|undefined,d:Date)=>!!v&&!Number.isNaN(new Date(v).getTime())&&new Date(v).toDateString()===d.toDateString()
const NetworkIcon=()=> <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="6" cy="12" r="2.1" stroke="currentColor" strokeWidth="1.35"/><circle cx="18" cy="6" r="2.1" stroke="currentColor" strokeWidth="1.35"/><circle cx="18" cy="18" r="2.1" stroke="currentColor" strokeWidth="1.35"/><path d="M8 11L15.8 7M8 13L15.8 17" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/></svg>

export function HomePage(){
 const setActiveModule=useAppStore(s=>s.setActiveModule),requestNewNote=useAppStore(s=>s.requestNewNote)
 const [projects,setProjects]=useState<LifeItem[]>([]),[notes,setNotes]=useState<LifeItem[]>([]),[tasks,setTasks]=useState<LifeItem[]>([]),[subjects,setSubjects]=useState<LifeItem[]>([]),[studio,setStudio]=useState<LifeItem[]>([]),[search,setSearch]=useState(""),[now,setNow]=useState(()=>new Date()),[loading,setLoading]=useState(true)
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t)},[])
 useEffect(()=>{let dead=false;const load=async()=>{const rs=await Promise.allSettled(["/api/projects","/api/notes","/api/tasks","/api/explore/subjects","/api/studio/items"].map(u=>fetch(u)));const read=async(r:PromiseSettledResult<Response>)=>r.status==="fulfilled"&&r.value.ok?arr<LifeItem>(await r.value.json().catch(()=>[])):[];const [p,n,t,e,s]=await Promise.all(rs.map(read));if(!dead){setProjects(p);setNotes(n);setTasks(t);setSubjects(e);setStudio(s);setLoading(false)}};void load();return()=>{dead=true}},[])
 const active=useMemo(()=>[...projects].filter(x=>!["completed","cancelled","archived"].includes((x.status||"").toLowerCase())).sort((a,b)=>stamp(b)-stamp(a)).slice(0,4),[projects])
 const openTasks=useMemo(()=>[...tasks].filter(x=>!x.completed&&!["done","completed","cancelled"].includes((x.status||"").toLowerCase())).sort((a,b)=>(a.dueDate?new Date(a.dueDate).getTime():Infinity)-(b.dueDate?new Date(b.dueDate).getTime():Infinity)),[tasks])
 const today=useMemo(()=>openTasks.filter(x=>sameDay(x.dueDate,now)),[openTasks,now]), upcoming=useMemo(()=>openTasks.filter(x=>!sameDay(x.dueDate,now)).slice(0,3),[openTasks,now])
 const recentNotes=useMemo(()=>[...notes].sort((a,b)=>stamp(b)-stamp(a)).slice(0,4),[notes])
 const finds=useMemo(()=>[...subjects.map(item=>({item,origin:"explore" as const})),...studio.map(item=>({item,origin:"studio" as const}))].sort((a,b)=>stamp(b.item)-stamp(a.item)).slice(0,4),[subjects,studio])
 const term=search.trim().toLowerCase()
 const results=useMemo(()=>{if(!term)return[];return [...projects.map(item=>({item,module:"projects" as const})),...notes.map(item=>({item,module:"notes" as const})),...tasks.map(item=>({item,module:"tasks" as const})),...subjects.map(item=>({item,module:"explore" as const})),...studio.map(item=>({item,module:"studio" as const}))].filter(x=>`${title(x.item)} ${x.item.description||""}`.toLowerCase().includes(term)).sort((a,b)=>stamp(b.item)-stamp(a.item)).slice(0,7)},[projects,notes,tasks,subjects,studio,term])
 const dateLabel=new Intl.DateTimeFormat(undefined,{weekday:"long",day:"numeric",month:"long"}).format(now),timeLabel=new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(now)
 return <SectionPage eyebrow="Personal atlas" title="Home" description="" plain>
  <div className="lifeos-home-room lifeos-home-rebuild">
   <header className="lifeos-home-rebuild-top">
    <button className="lifeos-home-wordmark" onClick={()=>setActiveModule("home")}><i><Sparkles size={14}/></i><span>LIFE OS</span></button>
    <div className="lifeos-home-date"><span>{dateLabel}</span><strong>{timeLabel}</strong></div>
    <div className="lifeos-home-search-area"><label className="lifeos-home-search-rebuild"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search everything"/></label>{term&&<div className="lifeos-home-search-popover">{results.length?results.map(({item,module})=><button key={module+item.id} onClick={()=>{setActiveModule(module);setSearch("")}}><span><b>{title(item)}</b><small>{module}</small></span><ArrowUpRight size={14}/></button>):<span>Nothing found</span>}</div>}</div>
   </header>
   <div className="lifeos-home-rebuild-grid">
    <aside className="lifeos-home-left-rail">
     <div className="lifeos-home-intro"><span className="lifeos-home-index">01 / HOME</span><h1>Your day,<br/><em>at a glance.</em></h1><p>A quiet starting point for what you are doing, making, learning and noticing.</p></div>
     <nav className="lifeos-home-quick-nav">
      <button onClick={()=>setActiveModule("tasks")}><CalendarDays/><span>Tasks</span><small>{openTasks.length}</small></button>
      <button onClick={requestNewNote}><BookOpen/><span>New note</span><small>+</small></button>
      <button onClick={()=>setActiveModule("explore")}><Compass/><span>Explore</span><small>↗</small></button>
      <button onClick={()=>setActiveModule("studio")}><Sparkles/><span>Studio</span><small>↗</small></button>
      <button onClick={()=>setActiveModule("atlas")}><NetworkIcon/><span>Atlas</span><small>↗</small></button>
      <button onClick={()=>setActiveModule("house")}><House/><span>House</span><small>↗</small></button>
     </nav>
     <div className="lifeos-home-rail-note"><span>THE CABINET</span><p>Collect what catches your attention. Let it become useful later.</p></div>
    </aside>
    <main className="lifeos-home-rebuild-main">
     <section className="lifeos-home-art-stage"><div className="lifeos-home-art-image"/><div className="lifeos-home-art-caption"><span>PERSONAL ATLAS</span><span>FIELD / 01</span></div><button className="lifeos-home-art-action" onClick={()=>setActiveModule("explore")}><Compass size={15}/>Wander</button></section>
     <div className="lifeos-home-workbench">
      <section className="lifeos-home-sheet"><div className="lifeos-home-sheet-heading"><span>Today</span><b>{today.length}</b></div>{loading?<p className="lifeos-home-muted">Gathering your day…</p>:today.length?<div className="lifeos-home-task-lines">{today.slice(0,5).map(x=><button key={x.id} onClick={()=>setActiveModule("tasks")}><i className="lifeos-home-checkbox"/><span>{title(x)}</span><ArrowUpRight size={13}/></button>)}</div>:<button className="lifeos-home-open-line" onClick={()=>setActiveModule("tasks")}><span>The day is open.</span><ArrowUpRight size={13}/></button>}</section>
      <section className="lifeos-home-sheet"><div className="lifeos-home-sheet-heading"><span>In progress</span><button onClick={()=>setActiveModule("projects")}>Projects →</button></div>{active.length?active.map((x,i)=><button key={x.id} className="lifeos-home-project-line" onClick={()=>setActiveModule("projects")}><small>{String(i+1).padStart(2,"0")}</small><span><strong>{title(x)}</strong>{x.description&&<em>{x.description}</em>}</span><ArrowUpRight size={13}/></button>):<button className="lifeos-home-open-line" onClick={()=>setActiveModule("projects")}>Open a project <ArrowUpRight size={13}/></button>}</section>
      <section className="lifeos-home-sheet"><div className="lifeos-home-sheet-heading"><span>Coming up</span></div>{upcoming.length?upcoming.map(x=><button key={x.id} className="lifeos-home-next-line" onClick={()=>setActiveModule("tasks")}><time>{x.dueDate?new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(new Date(x.dueDate)):"—"}</time><span>{title(x)}</span></button>):<p className="lifeos-home-muted">Nothing else is pressing.</p>}</section>
     </div>
     <div className="lifeos-home-bottom-strip">
      <section className="lifeos-home-notes-strip"><div className="lifeos-home-strip-title"><span>Notes</span><button onClick={()=>setActiveModule("notes")}>Notebook →</button></div>{recentNotes.length?recentNotes.map(x=><button key={x.id} onClick={()=>setActiveModule("notes")}><span>{title(x)}</span><time>{new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"}).format(new Date(x.updatedAt||x.createdAt||now))}</time></button>):<button onClick={()=>setActiveModule("notes")}>Write the first note →</button>}</section>
      <section className="lifeos-home-finds-strip"><div className="lifeos-home-strip-title"><span>Recent finds</span><button onClick={()=>setActiveModule("explore")}>Collection →</button></div><div className="lifeos-home-find-list">{finds.length?finds.map(({item,origin})=><button key={origin+item.id} onClick={()=>setActiveModule(origin)}><i className={"lifeos-home-find-dot lifeos-home-find-dot-"+origin}/><span>{title(item)}</span></button>):<button onClick={()=>setActiveModule("explore")}>Find something worth keeping →</button>}</div></section>
     </div>
    </main>
   </div>
   <footer className="lifeos-home-rebuild-footer"><span>Life OS / living · thinking · making</span><div><button onClick={()=>setActiveModule("archive")}>Archive</button><button onClick={()=>setActiveModule("atlas")}>Atlas</button><button onClick={()=>setActiveModule("house")}>House</button></div></footer>
  </div>
 </SectionPage>
}
