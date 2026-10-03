"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  Link2,
  Network,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Wrench,
} from "lucide-react"
import { SectionPage } from "@/components/lifeos/shared/section-page"
import { useAppStore } from "@/stores/app-store"

type EntityType = "note" | "project" | "task" | "goal" | "habit" | "bookmark"

type AtlasNode = {
  id: string
  type: EntityType
  title: string
  description?: string | null
  updatedAt?: string
}

type EdgeKind = "observed" | "connected" | "inferred" | "suggested"

type AtlasEdge = {
  id: string
  sourceType: string
  sourceId: string
  targetType: string
  targetId: string
  kind: EdgeKind
  label?: string | null
}

type AtlasGraph = {
  nodes: AtlasNode[]
  edges: AtlasEdge[]
}

type TagItem = {
  id: string
  name: string
  color?: string | null
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]

  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>

    for (const key of ["items", "data", "results", "notes", "projects", "tags"]) {
      if (Array.isArray(object[key])) {
        return object[key] as T[]
      }
    }
  }

  return []
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function nodeKey(type: string, id: string): string {
  return `${type}:${id}`
}

function displayTitle(title?: string | null): string {
  return title || "Untitled"
}

function openModule(
  module: "projects" | "notes" | "research",
  setActiveModule: (module: any) => void,
) {
  setActiveModule(module)
}

function AtlasLink({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
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

      <ArrowUpRight
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
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
}) {
  return (
    <div className="mb-5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      <Icon size={14} strokeWidth={1.5} />
      {children}
    </div>
  )
}

/** Small pill distinguishing how a connection came to exist. */
function KindBadge({ kind }: { kind: EdgeKind }) {
  const styles: Record<EdgeKind, string> = {
    observed: "border-black/15 text-muted-foreground",
    connected: "border-white/35 text-foreground/85",
    inferred: "border-black/15 text-muted-foreground/70 border-dashed",
    suggested: "border-black/15 text-muted-foreground/70 border-dotted",
  }

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${styles[kind]}`}
    >
      {kind}
    </span>
  )
}

export function AtlasPage() {
  const setActiveModule = useAppStore((state) => state.setActiveModule)

  const [graph, setGraph] = useState<AtlasGraph | null>(null)
  const [graphLoading, setGraphLoading] = useState(true)
  const [tags, setTags] = useState<TagItem[]>([])
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; title?: string; description?: string; type?: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)

  // "Draw a connection" form state
  const [connectSource, setConnectSource] = useState("")
  const [connectTarget, setConnectTarget] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  const loadGraph = useCallback(async () => {
    setGraphLoading(true)
    try {
      const response = await fetch("/api/atlas/graph")
      if (!response.ok) throw new Error("Failed to load atlas graph")
      const data = (await response.json()) as AtlasGraph
      setGraph(data)
    } catch {
      setGraph(null)
    } finally {
      setGraphLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  useEffect(() => {
    let cancelled = false

    async function loadTags() {
      setLoading(true)
      try {
        const response = await fetch("/api/tags")
        const data = response.ok ? await response.json() : []
        if (!cancelled) setTags(asArray<TagItem>(data))
      } catch {
        if (!cancelled) setTags([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTags()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const query = search.trim()

    if (!query) {
      setSearchResults([])
      setSearching(false)
      return
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true)

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
        )

        if (!response.ok) {
          setSearchResults([])
          return
        }

        const data = await response.json()
        const results = asArray<{ id: string; title?: string; description?: string; type?: string }>(
          data && typeof data === "object" && "results" in data
            ? (data as { results: unknown }).results
            : data,
        )

        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search])

  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []

  const nodesByKey = useMemo(() => {
    const map = new Map<string, AtlasNode>()
    for (const node of nodes) map.set(nodeKey(node.type, node.id), node)
    return map
  }, [nodes])

  const recentNotes = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "note")
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
        .slice(0, 5),
    [nodes],
  )

  const activeProjects = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "project")
        .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
        .slice(0, 5),
    [nodes],
  )

  const visibleTags = useMemo(
    () =>
      [...tags]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 18),
    [tags],
  )

  // Newest first, connected edges before observed ones, capped for readability.
  const visibleEdges = useMemo(
    () =>
      [...edges]
        .sort((a, b) => {
          if (a.kind === "connected" && b.kind !== "connected") return -1
          if (b.kind === "connected" && a.kind !== "connected") return 1
          return 0
        })
        .slice(0, 40),
    [edges],
  )

  async function handleConnect(event: React.FormEvent) {
    event.preventDefault()
    setConnectError(null)

    if (!connectSource || !connectTarget) return
    const [sourceType, sourceId] = connectSource.split("::")
    const [targetType, targetId] = connectTarget.split("::")

    setConnecting(true)
    try {
      const response = await fetch("/api/atlas/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, sourceId, targetType, targetId }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setConnectError(textValue(body?.error) || "Couldn't create that connection.")
        return
      }

      setConnectSource("")
      setConnectTarget("")
      await loadGraph()
    } catch {
      setConnectError("Couldn't reach the atlas — check the backend is running.")
    } finally {
      setConnecting(false)
    }
  }

  async function handleDeleteConnection(id: string) {
    try {
      const response = await fetch(`/api/atlas/connections/${id}`, { method: "DELETE" })
      if (response.ok) await loadGraph()
    } catch {
      // Silently ignore — the row simply won't disappear, which is visible feedback enough.
    }
  }

  return (
    <SectionPage
      eyebrow="Personal knowledge atlas"
      title="Atlas"
      description="A map of the things that make up your world — interests, knowledge, projects, materials, questions, objects and the connections between them."
    >
      <div className="space-y-16 pb-20">

        {/* Search */}
        <section>
          <div className="relative border-b border-[color:var(--lifeos-line)] pb-3">
            <Search
              size={19}
              strokeWidth={1.4}
              className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/70"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your atlas…"
              className="w-full bg-transparent pl-8 pr-4 text-lg font-serif outline-none placeholder:text-muted-foreground/55"
            />
          </div>

          {search.trim() && (
            <div className="mt-5">
              <div className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                {searching
                  ? "Searching"
                  : `${searchResults.length} result${
                      searchResults.length === 1 ? "" : "s"
                    }`}
              </div>

              {searchResults.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {searchResults.slice(0, 8).map((result, index) => (
                    <div
                      key={`${result.id}-${index}`}
                      className="flex items-center justify-between py-4"
                    >
                      <div>
                        <div className="font-serif text-lg">
                          {displayTitle(result.title)}
                        </div>

                        {result.description && (
                          <div className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {result.description}
                          </div>
                        )}
                      </div>

                      <span className="ml-6 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">
                        {result.type || "record"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : !searching ? (
                <p className="py-4 text-sm italic text-muted-foreground">
                  Nothing in the current atlas matches that search.
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* Atlas introduction */}
        <section className="max-w-3xl">
          <div className="flex items-start gap-5">
            <Network
              size={27}
              strokeWidth={1.2}
              className="mt-1 shrink-0 text-muted-foreground"
            />

            <div>
              <h2 className="font-serif text-2xl">
                A map, not another filing cabinet.
              </h2>

              <p className="mt-4 text-[15px] leading-7 text-foreground/60">
                Atlas is the connective layer of Life OS. Projects, notes,
                tasks, goals, habits and bookmarks all sit on the same map,
                joined by connections you draw yourself and by ones already
                observable in your data — shared tags, linked notes, task
                dependencies, a goal's linked project.
              </p>

              <p className="mt-4 text-[15px] leading-7 text-foreground/60">
                Solid connections are ones you made explicitly. Fainter ones
                were observed from data that already existed. Inferred and
                suggested connections — patterns and possibilities the system
                notices on its own — are the next layer to build.
              </p>
            </div>
          </div>
        </section>

        {/* Themes */}
        <section>
          <SectionLabel icon={Tag}>Themes already present</SectionLabel>

          {loading ? (
            <p className="text-sm italic text-muted-foreground/80">
              Reading your atlas…
            </p>
          ) : visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-x-7 gap-y-4">
              {visibleTags.map((tag) => (
                <span
                  key={tag.id}
                  className="font-serif text-xl text-foreground/70 transition-colors hover:text-foreground"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              As you add notes, projects and other records, this space will
              become a vocabulary of the subjects that recur throughout your
              life.
            </p>
          )}
        </section>

        {/* Main atlas columns */}
        <div className="grid gap-14 lg:grid-cols-2">

          {/* Active threads */}
          <section>
            <SectionLabel icon={Wrench}>Active threads</SectionLabel>

            {activeProjects.length > 0 ? (
              <div>
                {activeProjects.map((project) => (
                  <AtlasLink
                    key={project.id}
                    onClick={() => openModule("projects", setActiveModule)}
                  >
                    <span>
                      <span className="font-serif text-lg">
                        {displayTitle(project.title)}
                      </span>

                      {project.description && (
                        <span className="mt-1 block max-w-lg text-sm text-muted-foreground">
                          {project.description}
                        </span>
                      )}
                    </span>
                  </AtlasLink>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No active projects yet. Projects will appear here as living
                threads rather than as a task list.
              </p>
            )}
          </section>

          {/* Recent knowledge */}
          <section>
            <SectionLabel icon={BookOpen}>Recent knowledge</SectionLabel>

            {recentNotes.length > 0 ? (
              <div>
                {recentNotes.map((note) => (
                  <AtlasLink
                    key={note.id}
                    onClick={() => openModule("notes", setActiveModule)}
                  >
                    <span>
                      <span className="font-serif text-lg">
                        {displayTitle(note.title)}
                      </span>

                      {note.description && (
                        <span className="mt-1 block max-w-lg text-sm text-muted-foreground">
                          {note.description}
                        </span>
                      )}
                    </span>
                  </AtlasLink>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Your notes will become part of the atlas as you build the
                knowledge layer of Life OS.
              </p>
            )}
          </section>
        </div>

        {/* Connections */}
        <section className="border-t border-[color:var(--lifeos-line)] pt-12">
          <SectionLabel icon={Link2}>Connections</SectionLabel>

          {graphLoading ? (
            <p className="text-sm italic text-muted-foreground/80">Reading the graph…</p>
          ) : visibleEdges.length > 0 ? (
            <div className="divide-y divide-white/10">
              {visibleEdges.map((edge) => {
                const source = nodesByKey.get(nodeKey(edge.sourceType, edge.sourceId))
                const target = nodesByKey.get(nodeKey(edge.targetType, edge.targetId))
                if (!source || !target) return null

                return (
                  <div key={edge.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 text-[14px]">
                      <span className="truncate text-foreground/75">{displayTitle(source.title)}</span>
                      <span className="shrink-0 text-muted-foreground/55">
                        {edge.label ? `— ${edge.label} —` : "—"}
                      </span>
                      <span className="truncate text-foreground/75">{displayTitle(target.title)}</span>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <KindBadge kind={edge.kind} />
                      {edge.kind === "connected" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteConnection(edge.id)}
                          className="text-foreground/25 transition-colors hover:text-foreground/60"
                          aria-label="Remove connection"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No connections yet. Draw one below, or add tags, note links or
              task dependencies elsewhere in Life OS and they'll show up here
              automatically.
            </p>
          )}

          {/* Draw a connection */}
          <form
            onSubmit={handleConnect}
            className="mt-8 flex flex-col gap-3 border-t border-[color:var(--lifeos-line)] pt-6 sm:flex-row sm:items-center"
          >
            <select
              value={connectSource}
              onChange={(event) => setConnectSource(event.target.value)}
              className="min-w-0 flex-1 border-b border-[color:var(--lifeos-line)] bg-transparent py-2 text-sm outline-none"
            >
              <option value="">Connect this…</option>
              {nodes.map((node) => (
                <option key={nodeKey(node.type, node.id)} value={nodeKey(node.type, node.id)}>
                  {node.type}: {displayTitle(node.title)}
                </option>
              ))}
            </select>

            <span className="hidden shrink-0 text-muted-foreground/55 sm:inline">→</span>

            <select
              value={connectTarget}
              onChange={(event) => setConnectTarget(event.target.value)}
              className="min-w-0 flex-1 border-b border-[color:var(--lifeos-line)] bg-transparent py-2 text-sm outline-none"
            >
              <option value="">…to this</option>
              {nodes.map((node) => (
                <option key={nodeKey(node.type, node.id)} value={nodeKey(node.type, node.id)}>
                  {node.type}: {displayTitle(node.title)}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={connecting || !connectSource || !connectTarget}
              className="flex shrink-0 items-center justify-center gap-1.5 border border-white/35 px-4 py-2 text-[13px] uppercase tracking-[0.1em] text-foreground/85 transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/85"
            >
              <Plus size={14} strokeWidth={1.75} />
              Connect
            </button>
          </form>

          {connectError && (
            <p className="mt-3 text-sm text-red-700/80">{connectError}</p>
          )}
        </section>

        {/* Still ahead for Atlas */}
        <section className="border-t border-[color:var(--lifeos-line)] pt-12">
          <SectionLabel icon={Sparkles}>Still ahead for Atlas</SectionLabel>

          <div className="grid gap-10 md:grid-cols-3">

            <div>
              <FlaskConical
                size={21}
                strokeWidth={1.3}
                className="mb-4 text-muted-foreground/80"
              />

              <h3 className="font-serif text-xl">Interests</h3>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Subjects you repeatedly return to, from science and research
                to materials, crafts, food, architecture or anything else
                that catches your attention — as a first-class thing on the
                map, not just a tag.
              </p>
            </div>

            <div>
              <Sparkles
                size={21}
                strokeWidth={1.3}
                className="mb-4 text-muted-foreground/80"
              />

              <h3 className="font-serif text-xl">Inferred &amp; suggested</h3>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Patterns noticed across multiple observations, and possible
                avenues worth exploring — surfaced by the system, always
                clearly marked as a guess rather than a fact, and always
                yours to confirm or dismiss.
              </p>
            </div>

            <div>
              <Network
                size={21}
                strokeWidth={1.3}
                className="mb-4 text-muted-foreground/80"
              />

              <h3 className="font-serif text-xl">Questions</h3>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Things you wonder about but do not necessarily need to turn
                into tasks. Questions can simply remain alive until they lead
                somewhere.
              </p>
            </div>

          </div>
        </section>

        {/* Counts / quiet metadata */}
        <section className="border-t border-[color:var(--lifeos-line)] pt-7">
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/70">
            <span>{nodes.length} things</span>
            <span>{edges.length} connections</span>
            <span>{tags.length} themes</span>
            <span className="inline-flex items-center gap-1.5">
              <Network size={12} strokeWidth={1.5} />
              Atlas layer active
            </span>
          </div>
        </section>

      </div>
    </SectionPage>
  )
}
