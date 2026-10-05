"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
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

function sameDay(value: string | null | undefined, reference: Date): boolean {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toDateString() === reference.toDateString()
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
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

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

  const todayTasks = useMemo(
    () => currentTasks.filter((task) => sameDay(task.dueDate, now)),
    [currentTasks, now],
  )

  const upcomingTasks = useMemo(
    () => currentTasks.filter((task) => !sameDay(task.dueDate, now)).slice(0, 3),
    [currentTasks, now],
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

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now)

  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(now)

  return (
    <SectionPage eyebrow="Personal dashboard" title="Home" description="">
      <div className="lifeos-home-room pb-12">
        <header className="lifeos-home-header">
          <div className="lifeos-home-header-photo" aria-hidden="true" />
          <div className="lifeos-home-header-content">
            <div className="lifeos-home-clock">{timeLabel}</div>
            <div className="lifeos-home-date-large">{dateLabel}</div>
          </div>
          <label className="lifeos-home-search">
            <Search size={16} strokeWidth={1.5} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects…"
              aria-label="Search your life"
            />
          </label>
        </header>

        <nav className="lifeos-home-actions" aria-label="Home shortcuts">
          <button type="button" onClick={() => setActiveModule("tasks")}><CalendarDays size={18} /><span>Tasks</span></button>
          <button type="button" onClick={() => setActiveModule("notes")}><BookOpen size={18} /><span>New note</span></button>
          <button type="button" onClick={() => setActiveModule("explore")}><Compass size={18} /><span>Explore</span></button>
          <button type="button" onClick={() => setActiveModule("studio")}><Sparkles size={18} /><span>Studio</span></button>
          <button type="button" onClick={() => setActiveModule("atlas")}><NetworkIcon /><span>Atlas</span></button>
          <button type="button" onClick={() => setActiveModule("house")}><House size={18} /><span>House</span></button>
        </nav>

        <main className="lifeos-home-dashboard">
          <section className="lifeos-home-today-panel">
            <div className="lifeos-home-panel-head">
              <div>
                <span className="lifeos-home-panel-kicker">TODAY</span>
                <h2>Today</h2>
              </div>
              <span className="lifeos-home-today-count">{todayTasks.length}</span>
            </div>
            {loading ? (
              <div className="lifeos-home-empty">Loading your day…</div>
            ) : todayTasks.length ? (
              <div className="lifeos-home-checklist">
                {todayTasks.map((task) => (
                  <button key={task.id} type="button" onClick={() => setActiveModule("tasks")}>
                    <span className="lifeos-home-check" />
                    <span><strong>{titleOf(task)}</strong>{task.description && <small>{task.description}</small>}</span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="lifeos-home-empty-action" onClick={() => setActiveModule("tasks")}>
                <span>No tasks due today.</span><ArrowUpRight size={15} />
              </button>
            )}
          </section>

          <section className="lifeos-home-focus-panel">
            <div className="lifeos-home-panel-head">
              <div>
                <span className="lifeos-home-panel-kicker">IN PROGRESS</span>
                <h2>In progress</h2>
              </div>
              <button type="button" onClick={() => setActiveModule("projects")}>All projects →</button>
            </div>
            {filteredProjects.length ? (
              <div className="lifeos-home-focus-list">
                {filteredProjects.map((project) => (
                  <button key={project.id} type="button" onClick={() => setActiveModule("projects")}>
                    <span className="lifeos-home-focus-image" aria-hidden="true" />
                    <span><strong>{titleOf(project)}</strong>{project.description && <small>{project.description}</small>}</span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="lifeos-home-empty-action" onClick={() => setActiveModule("projects")}>
                <span>Start or open a project.</span><ArrowUpRight size={15} />
              </button>
            )}
          </section>

          <section className="lifeos-home-next-panel">
            <div className="lifeos-home-panel-head">
              <div>
                <span className="lifeos-home-panel-kicker">UP NEXT</span>
                <h2>Coming up</h2>
              </div>
            </div>
            {upcomingTasks.length ? (
              <div className="lifeos-home-next-list">
                {upcomingTasks.map((task) => (
                  <button key={task.id} type="button" onClick={() => setActiveModule("tasks")}>
                    <span className="lifeos-home-next-date">
                      {task.dueDate ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(task.dueDate)) : "—"}
                    </span>
                    <span><strong>{titleOf(task)}</strong>{task.description && <small>{task.description}</small>}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="lifeos-home-empty">Nothing else is pressing.</div>
            )}
          </section>
        </main>

        <section className="lifeos-home-lower-grid">
          <div>
            <div className="lifeos-home-panel-head compact">
              <div><span className="lifeos-home-panel-kicker">NOTES</span><h2>Recent notes</h2></div>
              <button type="button" onClick={() => setActiveModule("notes")}>Notes →</button>
            </div>
            {recentNotes.length ? recentNotes.map((note) => (
              <button key={note.id} type="button" onClick={() => setActiveModule("notes")} className="lifeos-home-note-row">
                <span><strong>{titleOf(note)}</strong><small>{relativeDate(note)}</small></span><ArrowUpRight size={14} />
              </button>
            )) : (
              <button type="button" className="lifeos-home-empty-action" onClick={() => setActiveModule("notes")}>Write a note →</button>
            )}
          </div>

          <div>
            <div className="lifeos-home-panel-head compact">
              <div><span className="lifeos-home-panel-kicker">RECENT</span><h2>Recent finds</h2></div>
              <button type="button" onClick={() => setActiveModule("explore")}>Explore →</button>
            </div>
            {recentlyCaptured.length ? (
              <div className="lifeos-home-find-grid">
                {recentlyCaptured.slice(0, 4).map(({ item, origin }) => (
                  <button key={`${origin}-${item.id}`} type="button" onClick={() => setActiveModule(origin)} className="lifeos-home-find-tile">
                    <span className={`lifeos-home-find-image lifeos-home-find-${origin}`} />
                    <strong>{titleOf(item)}</strong>
                    <small>{origin === "explore" ? "Explore" : "Studio"}</small>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="lifeos-home-empty-action" onClick={() => setActiveModule("explore")}>Find something →</button>
            )}
          </div>
        </section>

        <section className="lifeos-home-bottom-actions">
          <button type="button" onClick={() => setActiveModule("archive")}><BookOpen size={17} /><span>Open Archive</span></button>
          <button type="button" onClick={() => setActiveModule("atlas")}><NetworkIcon /><span>Browse Atlas</span></button>
          <button type="button" onClick={() => setActiveModule("house")}><House size={17} /><span>Work on the house</span></button>
          <span>{projects.length} projects · {notes.length} notes · {studioItems.length + subjects.length} collected</span>
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
