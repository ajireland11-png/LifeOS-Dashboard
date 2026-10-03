"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Flame,
  FolderKanban,
  House,
  Lightbulb,
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

function HomeLink({
  children,
  onClick,
  icon: Icon = ArrowUpRight,
}: {
  children: React.ReactNode
  onClick?: () => void
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between border-b border-[color:var(--lifeos-line)] py-4 text-left transition-colors hover:border-white/20"
    >
      <span className="text-[15px] text-foreground/75 group-hover:text-foreground">
        {children}
      </span>
      <Icon
        size={16}
        strokeWidth={1.5}
        className="text-muted-foreground/55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground/70"
      />
    </button>
  )
}

function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
}) {
  return (
    <div className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      <Icon size={14} strokeWidth={1.5} />
      {children}
    </div>
  )
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

  return (
    <SectionPage
      eyebrow="Personal operating environment"
      title="Home"
      description="A quiet view of what is alive in your world — the things you are working on, learning, noticing, and returning to."
    >
      <div className="space-y-16">
        <section className="border-y border-[color:var(--lifeos-line)] py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                The present
              </p>
              <h2 className="text-3xl font-light tracking-[-0.03em] text-foreground sm:text-4xl">
                Your life, without the dashboard noise.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
                Home is not a command centre for every minute of the day. It is
                the place where the different parts of Life OS briefly meet.
              </p>
            </div>

            <label className="flex w-full max-w-sm items-center gap-3 border-b border-[color:var(--lifeos-line)] pb-2">
              <Search size={16} strokeWidth={1.5} className="text-muted-foreground/70" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find something in your current world"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/55"
              />
            </label>
          </div>
        </section>

        <section>
          <SectionLabel icon={FolderKanban}>Active threads</SectionLabel>

          {loading ? (
            <p className="text-sm text-muted-foreground/80">Gathering your current threads…</p>
          ) : filteredProjects.length === 0 ? (
            <div className="border border-dashed border-black/15 px-6 py-8">
              <p className="text-sm text-muted-foreground">
                Nothing is currently marked as an active project.
              </p>
              <HomeLink
                icon={ArrowUpRight}
                onClick={() => setActiveModule("projects")}
              >
                Open Projects
              </HomeLink>
            </div>
          ) : (
            <div className="grid gap-x-10 gap-y-0 md:grid-cols-2">
              {filteredProjects.map((project) => (
                <HomeLink
                  key={project.id}
                  onClick={() => setActiveModule("projects")}
                >
                  <span>
                    <span className="block">{titleOf(project)}</span>
                    {project.description && (
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground/80">
                        {project.description}
                      </span>
                    )}
                  </span>
                </HomeLink>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <SectionLabel icon={Sparkles}>Recent discoveries</SectionLabel>

            {recentNotes.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground/80">
                Your recent notes and discoveries will appear here as Life OS
                begins to accumulate your history.
              </p>
            ) : (
              <div>
                {recentNotes.map((note) => (
                  <HomeLink
                    key={note.id}
                    onClick={() => setActiveModule("notes")}
                  >
                    <span>
                      <span className="block">{titleOf(note)}</span>
                      <span className="mt-1 block text-xs text-muted-foreground/70">
                        {relativeDate(note)}
                      </span>
                    </span>
                  </HomeLink>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionLabel icon={Lightbulb}>A place to return to</SectionLabel>
            <div className="border-l border-black/15 pl-6">
              <p className="text-lg font-light leading-8 text-foreground/70">
                Explore is where curiosity can remain curiosity — something you
                can follow deeply without turning every interest into a task.
              </p>
              <button
                type="button"
                onClick={() => setActiveModule("explore")}
                className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Continue exploring
                <ArrowUpRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <SectionLabel icon={Compass}>What is close at hand</SectionLabel>

          {currentTasks.length === 0 ? (
            <div className="border border-[color:var(--lifeos-line)] px-6 py-8">
              <p className="text-sm text-muted-foreground">
                There is nothing currently demanding attention here.
              </p>
            </div>
          ) : (
            <div className="grid gap-x-10 md:grid-cols-2">
              {currentTasks.map((task) => (
                <HomeLink
                  key={task.id}
                  onClick={() => setActiveModule("projects")}
                >
                  <span>
                    <span className="block">{titleOf(task)}</span>
                    {task.dueDate && (
                      <span className="mt-1 block text-xs text-muted-foreground/70">
                        {new Intl.DateTimeFormat(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        }).format(new Date(task.dueDate))}
                      </span>
                    )}
                  </span>
                </HomeLink>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionLabel icon={Flame}>Recently captured</SectionLabel>

          {recentlyCaptured.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground/80">
              Subjects from Explore and sparks from Studio will show up here
              as soon as you start capturing them.
            </p>
          ) : (
            <div className="grid gap-x-10 gap-y-0 md:grid-cols-2">
              {recentlyCaptured.map(({ item, origin }) => (
                <HomeLink
                  key={`${origin}-${item.id}`}
                  icon={origin === "explore" ? Compass : Sparkles}
                  onClick={() => setActiveModule(origin)}
                >
                  <span>
                    <span className="block">{titleOf(item)}</span>
                    <span className="mt-1 block text-xs text-muted-foreground/70">
                      {origin === "explore" ? "Explore" : "Studio"} · {relativeDate(item)}
                    </span>
                  </span>
                </HomeLink>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-10 border-t border-[color:var(--lifeos-line)] pt-10 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveModule("atlas")}
            className="text-left transition-opacity hover:opacity-60"
          >
            <NetworkIcon />
            <h3 className="mt-4 text-base text-foreground/85">Atlas</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              See the relationships between interests, things, questions and projects.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveModule("studio")}
            className="text-left transition-opacity hover:opacity-60"
          >
            <Lightbulb size={18} strokeWidth={1.4} className="text-muted-foreground" />
            <h3 className="mt-4 text-base text-foreground/85">Studio</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep inspiration, ideas, materials and making close together.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveModule("house")}
            className="text-left transition-opacity hover:opacity-60"
          >
            <House size={18} strokeWidth={1.4} className="text-muted-foreground" />
            <h3 className="mt-4 text-base text-foreground/85">House</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Gradually connect the digital environment with the physical home.
            </p>
          </button>
        </section>

        <section className="border-t border-[color:var(--lifeos-line)] pt-8">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs text-muted-foreground/70">
            <span>{projects.length} projects</span>
            <span>{notes.length} notes</span>
            <span>{tasks.length} tasks</span>
            <span>{subjects.length} subjects</span>
            <span>{studioItems.length} studio items</span>
            <button
              type="button"
              onClick={() => setActiveModule("archive")}
              className="inline-flex items-center gap-1 transition-colors hover:text-foreground/70"
            >
              <BookOpen size={13} strokeWidth={1.5} />
              Your history remains in Archive
            </button>
          </div>
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
