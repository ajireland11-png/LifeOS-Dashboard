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
import { motion } from "framer-motion"
import { useAppStore } from "@/stores/app-store"

type EntityType = "note" | "project" | "task" | "goal" | "habit" | "bookmark" | "subject" | "studioitem" | "knowledge"

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

type KnowledgeType = "question" | "concept" | "paper" | "idea" | "inspiration" | "skill" | "thing" | "place"

type KnowledgeItem = {
  id: string
  type: KnowledgeType
  title: string
  summary?: string | null
  content: string
  sourceUrl?: string | null
  updatedAt?: string
}

const RELATION_TYPES = [
  "relates to",
  "prerequisite for",
  "inspires",
  "used in",
  "derived from",
  "supports",
  "contradicts",
  "depends on",
  "leads to",
  "asks",
  "answers",
] as const

const KNOWLEDGE_TYPES: { value: KnowledgeType; label: string; note: string }[] = [
  { value: "question", label: "Question", note: "something you want to understand" },
  { value: "concept", label: "Concept", note: "an idea worth carrying between contexts" },
  { value: "paper", label: "Paper", note: "a piece of research to keep in orbit" },
  { value: "idea", label: "Idea", note: "a thought with somewhere to go" },
  { value: "inspiration", label: "Inspiration", note: "something that catches your attention" },
  { value: "skill", label: "Skill", note: "something you want to learn or practise" },
  { value: "thing", label: "Thing", note: "an object, material or subject of curiosity" },
  { value: "place", label: "Place", note: "somewhere meaningful or worth exploring" },
]

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
    observed: "border-[color:var(--lifeos-line)] text-muted-foreground",
    connected: "border-white/35 text-foreground/85",
    inferred: "border-[color:var(--lifeos-line)] text-muted-foreground/70 border-dashed",
    suggested: "border-[color:var(--lifeos-line)] text-muted-foreground/70 border-dotted",
  }

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${styles[kind]}`}
    >
      {kind}
    </span>
  )
}



function AtlasLandscape({
  nodes,
  edges,
}: {
  nodes: AtlasNode[]
  edges: AtlasEdge[]
}) {
  const palette: Record<EntityType, { label: string; mark: string }> = {
    note: { label: "Notes", mark: "N" },
    project: { label: "Projects", mark: "P" },
    task: { label: "Tasks", mark: "T" },
    goal: { label: "Goals", mark: "G" },
    habit: { label: "Habits", mark: "H" },
    bookmark: { label: "Bookmarks", mark: "B" },
    subject: { label: "Subjects", mark: "S" },
    studioitem: { label: "Studio", mark: "I" },
    knowledge: { label: "Knowledge", mark: "K" },
  }

  const visible = nodes.slice(0, 18)
  const positions = visible.map((node, index) => {
    const angle = index * 2.399963
    const radius = 23 + (index % 4) * 8
    return {
      node,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius * 0.72,
    }
  })

  const positionByKey = new Map(
    positions.map((item) => [nodeKey(item.node.type, item.node.id), item]),
  )

  const lines = edges
    .filter((edge) => edge.kind === "connected" || edge.kind === "observed")
    .map((edge) => ({
      edge,
      source: positionByKey.get(nodeKey(edge.sourceType, edge.sourceId)),
      target: positionByKey.get(nodeKey(edge.targetType, edge.targetId)),
    }))
    .filter(
      (item): item is {
        edge: AtlasEdge
        source: { node: AtlasNode; x: number; y: number }
        target: { node: AtlasNode; x: number; y: number }
      } => Boolean(item.source && item.target),
    )
    .slice(0, 28)

  if (!visible.length) {
    return (
      <div className="border-y border-[color:var(--lifeos-line)] py-16">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--lifeos-line)] text-muted-foreground/60">
            <Network size={19} strokeWidth={1.2} />
          </div>
          <h2 className="font-serif text-2xl">The landscape is still quiet.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Add notes, projects, questions or other things to give Atlas something
            to arrange into a living map.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden border-y border-[color:var(--lifeos-line)]">
      <div className="flex items-end justify-between gap-6 border-b border-[color:var(--lifeos-line)] px-1 py-5">
        <div>
          <p className="lifeos-kicker text-[10px] uppercase tracking-[0.2em]">
            Intellectual landscape
          </p>
          <h2 className="mt-1 font-serif text-2xl">Where things meet</h2>
        </div>
        <p className="hidden max-w-sm text-right text-xs leading-5 text-muted-foreground sm:block">
          Not a literal diagram of everything. A quiet glimpse of the relationships
          already emerging in your world.
        </p>
      </div>

      <div className="lifeos-atlas-mosaic relative aspect-[1.65] min-h-[360px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(190,160,100,0.12),transparent_48%)]">
        <div className="lifeos-atlas-bloom absolute -left-12 -top-16 h-52 w-52 rounded-full blur-3xl" aria-hidden="true" />
        <div className="lifeos-atlas-bloom lifeos-atlas-bloom-2 absolute -bottom-20 right-0 h-64 w-64 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute inset-[9%] rounded-full border border-dashed border-[color:var(--lifeos-line)]" />
        <div className="absolute inset-[22%] rounded-full border border-[color:var(--lifeos-line)] opacity-70" />

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {lines.map(({ edge, source, target }) => (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="currentColor"
              strokeWidth="0.22"
              className="text-foreground/20"
              strokeDasharray={edge.kind === "observed" ? "1 1" : undefined}
            />
          ))}
        </svg>

        <div className="absolute inset-0 z-10">
          {positions.map(({ node, x, y }, index) => {
            const meta = palette[node.type]
            return (
              <div
                key={nodeKey(node.type, node.id)}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] uppercase tracking-[0.08em] shadow-[0_0_0_5px_rgba(18,19,17,0.65)] transition-transform duration-300 group-hover:scale-125 ${index === 0 ? "border-[color:var(--lifeos-accent)] text-[var(--lifeos-accent)]" : "border-[color:var(--lifeos-line)] bg-[var(--lifeos-night-soft)] text-muted-foreground"}`}
                >
                  {meta.mark}
                </div>
                <div className="pointer-events-none absolute left-1/2 top-10 w-32 -translate-x-1/2 text-center opacity-70 transition-opacity group-hover:opacity-100">
                  <div className="truncate font-serif text-sm text-foreground">
                    {displayTitle(node.title)}
                  </div>
                  <div className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
                    {meta.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="absolute bottom-5 left-6 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">
          {visible.length} of {nodes.length} things shown
        </div>
      </div>
    </div>
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
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [knowledgeType, setKnowledgeType] = useState<KnowledgeType>("idea")
  const [knowledgeTitle, setKnowledgeTitle] = useState("")
  const [knowledgeSummary, setKnowledgeSummary] = useState("")
  const [knowledgeSaving, setKnowledgeSaving] = useState(false)
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null)
  const [knowledgeLoading, setKnowledgeLoading] = useState(true)

  // "Draw a connection" form state
  const [connectSource, setConnectSource] = useState("")
  const [connectTarget, setConnectTarget] = useState("")
  const [connectLabel, setConnectLabel] = useState<(typeof RELATION_TYPES)[number]>("relates to")
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

    async function loadKnowledge() {
      setKnowledgeLoading(true)
      try {
        const response = await fetch("/api/atlas/knowledge")
        if (!response.ok) throw new Error("Failed to load knowledge")
        const data = (await response.json()) as KnowledgeItem[]
        if (!cancelled) setKnowledge(data)
      } catch {
        if (!cancelled) setKnowledge([])
      } finally {
        if (!cancelled) setKnowledgeLoading(false)
      }
    }

    loadKnowledge()
    return () => {
      cancelled = true
    }
  }, [])


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
        body: JSON.stringify({ sourceType, sourceId, targetType, targetId, label: connectLabel }),
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
        <section className="lifeos-cabinet lifeos-glass-window max-w-4xl px-6 py-8 sm:px-8">
          <div className="lifeos-colour-dash absolute left-0 right-0 top-0" aria-hidden="true" />
          <div className="flex items-start gap-5">
            <div className="lifeos-flower hidden sm:block" aria-hidden="true" />
            <Network
              size={27}
              strokeWidth={1.2}
              className="mt-1 shrink-0 text-[color:var(--lifeos-accent)]"
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

        {/* Living knowledge layer */}
        <section className="lifeos-paper relative border-y border-[color:var(--lifeos-line)] px-6 py-10 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <SectionLabel icon={Sparkles}>Living knowledge</SectionLabel>
              <div className="max-w-2xl">
                <h2 className="font-serif text-3xl tracking-[-0.02em]">
                  Keep the things that are not tasks.
                </h2>
                <p className="mt-4 max-w-xl text-[15px] leading-7 text-foreground/60">
                  Questions, concepts, papers, ideas and inspirations can live here
                  without being promoted into projects. Atlas can then carry them
                  quietly into the rest of Life OS.
                </p>
              </div>

              {knowledgeLoading ? (
                <p className="mt-8 text-sm italic text-muted-foreground/70">Gathering the loose threads…</p>
              ) : knowledge.length > 0 ? (
                <div className="mt-9 grid gap-x-8 gap-y-0 sm:grid-cols-2">
                  {knowledge.slice(0, 8).map((item, index) => (
                    <div
                      key={item.id}
                      className="group relative border-t border-[color:var(--lifeos-line)] py-4 pl-4 transition-transform duration-300 hover:translate-x-1"
                    >
                      <span
                        className="absolute left-0 top-5 h-8 w-px opacity-70"
                        style={{
                          background:
                            ["#d7ad63", "#789b82", "#9a719b", "#c27e65", "#6f91a4", "#b9a37a"][index % 6],
                        }}
                        aria-hidden="true"
                      />
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/65">
                          {item.type}
                        </span>
                      </div>
                      <div className="mt-1 font-serif text-lg text-foreground/90">
                        {displayTitle(item.title)}
                      </div>
                      {item.summary && (
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {item.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 border-t border-[color:var(--lifeos-line)] pt-6">
                  <p className="max-w-md text-sm leading-6 text-muted-foreground">
                    This is the place for questions, ideas, papers and inspirations that are still becoming something.
                  </p>
                </div>
              )}
            </div>

            <form
              onSubmit={async (event) => {
                event.preventDefault()
                setKnowledgeError(null)
                if (!knowledgeTitle.trim()) return
                setKnowledgeSaving(true)
                try {
                  const response = await fetch("/api/atlas/knowledge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: knowledgeType,
                      title: knowledgeTitle.trim(),
                      summary: knowledgeSummary.trim() || null,
                    }),
                  })
                  if (!response.ok) {
                    const body = await response.json().catch(() => null)
                    throw new Error(textValue(body?.error) || "Couldn't keep that yet.")
                  }
                  const item = (await response.json()) as KnowledgeItem
                  setKnowledge((current) => [item, ...current])
                  setKnowledgeTitle("")
                  setKnowledgeSummary("")
                } catch (error) {
                  setKnowledgeError(error instanceof Error ? error.message : "Couldn't keep that yet.")
                } finally {
                  setKnowledgeSaving(false)
                }
              }}
              className="relative border-l border-[color:var(--lifeos-line)] pl-7"
            >
              <p className="lifeos-kicker text-[10px] uppercase tracking-[0.2em]">
                Keep a thread
              </p>
              <div className="mt-4">
                <select
                  value={knowledgeType}
                  onChange={(event) => setKnowledgeType(event.target.value as KnowledgeType)}
                  className="w-full border-b border-[color:var(--lifeos-line)] bg-transparent py-2 text-sm outline-none"
                >
                  {KNOWLEDGE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted-foreground/60">
                  {KNOWLEDGE_TYPES.find((type) => type.value === knowledgeType)?.note}
                </p>
                <input
                  value={knowledgeTitle}
                  onChange={(event) => setKnowledgeTitle(event.target.value)}
                  placeholder="Give it a name…"
                  className="mt-5 w-full border-b border-[color:var(--lifeos-line)] bg-transparent py-3 font-serif text-xl outline-none placeholder:text-muted-foreground/40"
                />
                <input
                  value={knowledgeSummary}
                  onChange={(event) => setKnowledgeSummary(event.target.value)}
                  placeholder="A short note, if useful…"
                  className="mt-3 w-full border-b border-[color:var(--lifeos-line)] bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/40"
                />
                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55">
                    No project required
                  </span>
                  <button
                    type="submit"
                    disabled={knowledgeSaving || !knowledgeTitle.trim()}
                    className="inline-flex items-center gap-2 border border-white/30 px-4 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-foreground hover:text-background disabled:opacity-30"
                  >
                    <Plus size={13} strokeWidth={1.6} />
                    {knowledgeSaving ? "Keeping…" : "Keep thread"}
                  </button>
                </div>
                {knowledgeError && <p className="mt-3 text-sm text-red-300/80">{knowledgeError}</p>}
              </div>
            </form>
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
            <div className="lifeos-mosaic-type flex flex-wrap gap-x-7 gap-y-4">
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

            <select
              value={connectLabel}
              onChange={(event) => setConnectLabel(event.target.value as (typeof RELATION_TYPES)[number])}
              className="min-w-0 border-b border-[color:var(--lifeos-line)] bg-transparent py-2 text-sm outline-none"
            >
              {RELATION_TYPES.map((relation) => (
                <option key={relation} value={relation}>{relation}</option>
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
            <span>{nodes.length} things</span>            <span>{knowledge.length} knowledge threads</span>
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
