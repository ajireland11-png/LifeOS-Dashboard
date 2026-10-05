'use client'

import { useCallback, useEffect, useState } from 'react'
import { Archive, CheckCircle2, Circle, FolderKanban, Plus, Trash2 } from 'lucide-react'
import { SectionPage } from '../shared/section-page'

type Task = {
  id: string
  title: string
  status: string
  dueDate?: string | null
}

type GoalRef = {
  id: string
  goal: { id: string; title: string }
}

type Project = {
  id: string
  name: string
  description?: string | null
  color: string
  status: string
  archived: boolean
  updatedAt: string
  _count: { tasks: number }
  goals: GoalRef[]
}

type ProjectDetail = Project & { tasks: Task[] }

const STATUS_OPTIONS = ['active', 'on-hold', 'completed', 'cancelled']
const COLOR_OPTIONS = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899']

function formatDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0])
  const [saving, setSaving] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/projects?archived=false')
      const data = response.ok ? await response.json() : []
      setProjects(Array.isArray(data) ? data : [])
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const response = await fetch(`/api/projects/${id}`)
      if (!response.ok) {
        setDetail(null)
        return
      }
      const data = (await response.json()) as ProjectDetail
      setDetail(data)
      setEditName(data.name)
      setEditDescription(data.description ?? '')
      setEditStatus(data.status)
      setEditColor(data.color)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
    else setDetail(null)
  }, [selectedId, loadDetail])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return

    setCreating(true)
    setError(null)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error || "Couldn't create that project.")
        return
      }
      const created = (await response.json()) as Project
      setNewName('')
      await loadList()
      setSelectedId(created.id)
    } catch {
      setError("Couldn't reach Projects — check the backend is running.")
    } finally {
      setCreating(false)
    }
  }

  async function handleSave() {
    if (!detail) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim() || detail.name,
          description: editDescription.trim() || null,
          status: editStatus,
          color: editColor,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error || "Couldn't save changes.")
        return
      }
      await loadList()
      await loadDetail(detail.id)
    } catch {
      setError("Couldn't reach Projects — check the backend is running.")
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!detail) return
    try {
      const response = await fetch(`/api/projects/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      if (response.ok) {
        setSelectedId(null)
        await loadList()
      }
    } catch {
      // Silent — the row stays, which is visible feedback enough.
    }
  }

  async function handleDelete() {
    if (!detail) return
    try {
      const response = await fetch(`/api/projects/${detail.id}`, { method: 'DELETE' })
      if (response.ok) {
        setSelectedId(null)
        await loadList()
      }
    } catch {
      // Same reasoning as archive.
    }
  }

  return (
    <SectionPage
      eyebrow="Things in motion"
      title="Projects"
      description=""
    >
      <div className="lifeos-project-workshop grid gap-10 pb-20 lg:grid-cols-[minmax(0,300px)_1fr]">
        {/* List + new project */}
        <section>
          <div className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <FolderKanban size={14} strokeWidth={1.5} />
            Projects
          </div>

          <form onSubmit={handleCreate} className="mb-6 flex items-center gap-2 border-b border-[color:var(--lifeos-line)] pb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New project…"
              className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/55"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex shrink-0 items-center justify-center border border-white/35 p-1.5 text-foreground/85 transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/85"
              aria-label="Add project"
            >
              <Plus size={14} strokeWidth={1.75} />
            </button>
          </form>

          {loading ? (
            <p className="text-sm italic text-muted-foreground/80">Reading your projects…</p>
          ) : projects.length > 0 ? (
            <div className="lifeos-project-list">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                  className={`lifeos-project-item ${
                    project.id === selectedId ? 'text-foreground' : 'text-foreground/70 hover:text-foreground'
                  }`}
                  style={{ ['--project-colour' as string]: project.color }}
                  data-selected={project.id === selectedId}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="font-serif text-lg">{project.name}</span>
                  </div>
                  {project.description && (
                    <div className="mt-0.5 truncate pl-[18px] text-sm text-muted-foreground">
                      {project.description}
                    </div>
                  )}
                  <div className="mt-1 pl-[18px] text-[10px] uppercase tracking-[0.12em] text-muted-foreground/55">
                    {project._count.tasks} task{project._count.tasks === 1 ? '' : 's'}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Nothing in motion yet. Start one above when something is ready
              to move beyond an idea.
            </p>
          )}
        </section>

        {/* Detail / editor */}
        <section className="lg:pl-4">
          {detailLoading ? (
            <p className="text-sm italic text-muted-foreground/80">Loading…</p>
          ) : detail ? (
            <div
              className="lifeos-project-material p-7 sm:p-10"
              style={{ ['--project-colour' as string]: editColor }}
            >
              <div className="relative z-10 flex items-start justify-between gap-4">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent font-serif text-3xl outline-none"
                />
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="lifeos-select shrink-0 border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.1em] outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative z-10 mt-4 flex items-center gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`h-5 w-5 rounded-full transition-transform ${
                      editColor === color ? 'scale-110 ring-2 ring-black/30 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Set colour ${color}`}
                  />
                ))}
              </div>

              <div className="relative z-10 mt-7 flex items-center gap-4">
                <div className="lifeos-project-mark">{editName.trim().slice(0,1).toUpperCase() || "P"}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Project workshop</div>
              </div>

              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="What is this project, and what does done look like?"
                rows={4}
                className="relative z-10 mt-7 w-full resize-y bg-transparent text-[15px] leading-7 outline-none placeholder:text-muted-foreground/55"
              />

              <div className="relative z-10 mt-6 flex items-center gap-3 border-t border-[color:var(--lifeos-line)] pt-5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="border border-white/35 px-4 py-2 text-[13px] uppercase tracking-[0.1em] text-foreground/85 transition-colors hover:bg-foreground hover:text-background disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  className="flex items-center gap-1.5 px-2 py-2 text-[13px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Archive size={14} strokeWidth={1.5} />
                  Archive
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="ml-auto flex items-center gap-1.5 px-2 py-2 text-[13px] uppercase tracking-[0.1em] text-muted-foreground/80 transition-colors hover:text-red-700"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Delete
                </button>
              </div>

              {detail.tasks.length > 0 && (
                <div className="relative z-10 mt-10 border-t border-[color:var(--lifeos-line)] pt-8">
                  <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                    Tasks
                  </div>
                  <div>
                    {detail.tasks.map((task) => {
                      const done = task.status === 'done' || task.status === 'completed'
                      return (
                        <div key={task.id} className="lifeos-project-task">
                          {done ? (
                            <CheckCircle2 size={15} strokeWidth={1.5} className="shrink-0 text-muted-foreground/70" />
                          ) : (
                            <Circle size={15} strokeWidth={1.5} className="shrink-0 text-foreground/25" />
                          )}
                          <span className={`text-sm ${done ? 'text-muted-foreground/70 line-through' : 'text-foreground/75'}`}>
                            {task.title}
                          </span>
                          {task.dueDate && (
                            <span className="ml-auto text-xs text-muted-foreground/55">{formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {detail.goals.length > 0 && (
                <div className="relative z-10 mt-8 flex flex-wrap gap-2">
                  {detail.goals.map((g) => (
                    <span
                      key={g.id}
                      className="border border-white/15 px-3 py-1 text-xs text-muted-foreground"
                    >
                      {g.goal.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Select a project on the left, or start a new one.
            </p>
          )}

          {error && <p className="mt-4 text-sm text-red-700/80">{error}</p>}
        </section>
      </div>
    </SectionPage>
  )
}
