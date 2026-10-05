"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  House,
  Search,
  Sparkles,
} from "lucide-react"
import { SectionPage } from "@/components/lifeos/shared/section-page"
import { useAppStore } from "@/stores/app-store"

type LifeItem = {
  id: string
  title: string
  description?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  dueDate?: string | null
  completed?: boolean
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>

    for (const key of ["items", "data", "results", "tasks", "projects", "notes"]) {
      if (Array.isArray(object[key])) return object[key] as T[]
    }
  }

  return []
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function titleOf(item: LifeItem): string {
  return item.title || "Untitled"
}

function dateValue(item: LifeItem): number {
  const value = item.updatedAt || item.createdAt
  if (!value) return 0

  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function relativeDate(item: LifeItem): string {
  const value = item.updatedAt || item.createdAt
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date)
}

export function HomePage() {
  const setActiveModule = useAppStore((state) => state.setActiveModule)

  const [projects, setProjects] = useState<LifeItem[]>([])
  const [notes, setNotes] = useState<LifeItem[]>([])
  const [tasks, setTasks] = useState<LifeItem[]>([])
  const [subjects, setSubjects] = useState<LifeItem[]>([])
  const [studioItems, setStudioItems] = useState<LifeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const [projectsResponse, notesResponse, tasksResponse, subjectsResponse, studioResponse] =
        await Promise.allSettled([
          fetch("/api/projects"),
          fetch("/api/notes"),
          fetch("/api/tasks"),
          fetch("/api/explore/subjects"),
          fetch("/api/studio/items"),
        ])

      if (cancelled) return

      async function readResponse(
        result: PromiseSettledResult<Response>,
      ): Promise<LifeItem[]> {
        if (result.status !== "fulfilled" || !result.value.ok) return []

        try {
          return asArray<LifeItem>(await result.value.json())
        } catch {
          return []
        }
      }

      const [projectData, noteData, taskData, subjectData, studioData] = await Promise.all([
        readResponse(projectsResponse),
        readResponse(notesResponse),
        readResponse(tasksResponse),
        readResponse(subjectsResponse),
        readResponse(studioResponse),
      ])

      if (!cancelled) {
        setProjects(projectData)
        setNotes(noteData)
        setTasks(taskData)
        setSubjects(subjectData)
        setStudioItems(studioData)
        setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const activeProjects = useMemo(
    () =>
      [...projects]
        .filter((item) => {
          const status = stringValue(item.status).toLowerCase()
          return !["completed", "cancelled", "archived"].includes(status)
        })
        .sort((a, b) => dateValue(b) - dateValue(a))
        .slice(0, 4),
    [projects],
  )

  const recentNotes = useMemo(
    () =>
      [...notes]
        .sort((a, b) => dateValue(b) - dateValue(a))
        .slice(0, 4),
    [notes],
  )

  const currentTasks = useMemo(
    () =>
      [...tasks]
        .filter((item) => {
          const status = stringValue(item.status).toLowerCase()
          return !item.completed && !["done", "completed", "cancelled"].includes(status)
        })
        .sort((a, b) => {
          const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
          const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
          return aDue - bDue
        })
        .slice(0, 5),
    [tasks],
  )

  const recentlyCaptured = useMemo(
    () =>
      [
        ...subjects.map((item) => ({ item, origin: "explore" as const })),
        ...studioItems.map((item) => ({ item, origin: "studio" as const })),
      ]
        .sort((a, b) => dateValue(b.item) - dateValue(a.item))
        .slice(0, 5),
    [subjects, studioItems],
  )

  const searchTerm = search.trim().toLowerCase()

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return activeProjects
    return activeProjects.filter((item) =>
      `${titleOf(item)} ${item.description || ""}`.toLowerCase().includes(searchTerm),
    )
  }, [activeProjects, searchTerm])

  const dueToday = currentTasks.filter((task) => {
    if (!task.dueDate) return false
    const date = new Date(task.dueDate)
    const now = new Date()
    return date.toDateString() === now.toDateString()
  })

  return (
    <SectionPage eyebrow="Your personal space" title="Home" description="">
      <div className="lifeos-home-room pb-16">
        <section className="lifeos-home-welcome">
          <div className="lifeos-home-welcome-copy">
            <span className="lifeos-home-sun" aria-hidden="true" />
            <div>
              <p className="lifeos-home-kicker">Your desk · today</p>
              <h2 className="font-serif">A place to begin.</h2>
              <p className="lifeos-home-hint">Your active things, nearby thoughts, and next places to go.</p>
            </div>
          </div>
          <label className="lifeos-home-search">
            <Search size={16} strokeWidth={1.5} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find something…"
              aria-label="Find something"
            />
          </label>
        </section>

        <section className="lifeos-home-next">
          <div className="lifeos-home-section-heading">
            <div>
              <span className="lifeos-home-number">01</span>
              <h3>Next</h3>
            </div>
            <span className="lifeos-home-section-note">{dueToday.length ? `${dueToday.length} today` : "A clear view of what matters"}</span>
          </div>

          {loading ? (
            <div className="lifeos-home-empty">Opening your desk…</div>
          ) : currentTasks.length === 0 ? (
            <div className="lifeos-home-empty">
              <span>Nothing pressing.</span>
              <button type="button" onClick={() => setActiveModule("projects")}>Browse projects →</button>
            </div>
          ) : (
            <div className="lifeos-home-task-list">
              {currentTasks.map((task, index) => (
                <button key={task.id} type="button" onClick={() => setActiveModule("projects")} className="lifeos-home-task">
                  <span className="lifeos-home-task-index">0{index + 1}</span>
                  <span className="lifeos-home-task-main">
                    <strong>{titleOf(task)}</strong>
                    {task.description && <small>{task.description}</small>}
                  </span>
                  {task.dueDate && <span className="lifeos-home-task-date">{new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(task.dueDate))}</span>}
                  <ArrowUpRight size={15} strokeWidth={1.4} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="lifeos-home-workbench">
          <div className="lifeos-home-workbench-main">
            <div className="lifeos-home-section-heading">
              <div><span className="lifeos-home-number">02</span><h3>In progress</h3></div>
              <button type="button" onClick={() => setActiveModule("projects")}>See all →</button>
            </div>
            {filteredProjects.length === 0 ? (
              <div className="lifeos-home-empty">No active projects. <button type="button" onClick={() => setActiveModule("projects")}>Start one →</button></div>
            ) : (
              <div className="lifeos-home-projects">
                {filteredProjects.map((project, index) => (
                  <button key={project.id} type="button" onClick={() => setActiveModule("projects")} className={`lifeos-home-project lifeos-home-project-${index % 4}`}>
                    <span className="lifeos-home-project-mark" aria-hidden="true" />
                    <span><strong>{titleOf(project)}</strong>{project.description && <small>{project.description}</small>}</span>
                    <ArrowUpRight size={15} strokeWidth={1.4} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="lifeos-home-navigation">
            <span className="lifeos-home-number">03</span>
            <h3>Go somewhere</h3>
            <div className="lifeos-home-doors">
              <button type="button" onClick={() => setActiveModule("explore")} className="lifeos-home-door lifeos-home-door-green"><Compass size={17}/><span>Explore</span><small>Find & collect</small></button>
              <button type="button" onClick={() => setActiveModule("studio")} className="lifeos-home-door lifeos-home-door-rose"><Sparkles size={17}/><span>Studio</span><small>Make & gather</small></button>
              <button type="button" onClick={() => setActiveModule("atlas")} className="lifeos-home-door lifeos-home-door-blue"><NetworkIcon/><span>Atlas</span><small>Connect ideas</small></button>
              <button type="button" onClick={() => setActiveModule("house")} className="lifeos-home-door lifeos-home-door-ochre"><House size={17}/><span>House</span><small>Shape your space</small></button>
            </div>
          </aside>
        </section>

        <section className="lifeos-home-lower">
          <div className="lifeos-home-notes">
            <div className="lifeos-home-section-heading"><div><span className="lifeos-home-number">04</span><h3>Nearby thoughts</h3></div><button type="button" onClick={() => setActiveModule("notes")}>All notes →</button></div>
            {recentNotes.length === 0 ? <button type="button" onClick={() => setActiveModule("notes")} className="lifeos-home-empty">No notes yet — open Notes →</button> : recentNotes.map((note) => (
              <button key={note.id} type="button" onClick={() => setActiveModule("notes")} className="lifeos-home-note">
                <span className="lifeos-home-note-dot" /><span><strong>{titleOf(note)}</strong><small>{relativeDate(note)}</small></span><ArrowUpRight size={14}/>
              </button>
            ))}
          </div>

          <div className="lifeos-home-captures">
            <div className="lifeos-home-section-heading"><div><span className="lifeos-home-number">05</span><h3>Recent finds</h3></div></div>
            {recentlyCaptured.length === 0 ? <button type="button" onClick={() => setActiveModule("explore")} className="lifeos-home-empty">Collect something →</button> : recentlyCaptured.map(({ item, origin }) => (
              <button key={`${origin}-${item.id}`} type="button" onClick={() => setActiveModule(origin)} className="lifeos-home-find">
                <span className={`lifeos-home-find-image lifeos-home-find-${origin}`}><span /></span>
                <span><strong>{titleOf(item)}</strong><small>{origin === "explore" ? "Explore" : "Studio"} · {relativeDate(item)}</small></span>
              </button>
            ))}
          </div>
        </section>

        <section className="lifeos-home-footer">
          <div><BookOpen size={15}/><span>Everything else can wait.</span></div>
          <button type="button" onClick={() => setActiveModule("archive")}>Open Archive →</button>
          <span className="lifeos-home-count">{projects.length} projects · {notes.length} notes · {studioItems.length + subjects.length} collected</span>
        </section>
      </div>
    </SectionPage>
  )
}

function NetworkIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="6" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18" cy="6" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18" cy="18" r="2.25" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 11L15.9 7M8 13L15.9 17"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
