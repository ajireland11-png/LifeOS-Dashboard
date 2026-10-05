'use client'

import { ReactNode } from 'react'
import { Compass, FlaskConical, Library, Sparkles } from 'lucide-react'

interface SectionPageProps {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
}

function PageArtifact({ title }: { title: string }) {
  const key = title.toLowerCase()
  const isAtlas = key.includes('atlas')
  const isExplore = key.includes('explore')
  const isStudio = key.includes('studio')
  const isResearch = key.includes('research')
  const isProjects = key.includes('project')
  const isHouse = key.includes('house')
  const isArchive = key.includes('archive')

  return (
    <div className="lifeos-page-art" aria-hidden="true">
      <div className="lifeos-art-orbit" />
      <div className="lifeos-art-pane lifeos-art-pane-a">
        <span className="lifeos-art-line" />
        <span className="lifeos-art-dot" />
      </div>
      <div className="lifeos-art-pane lifeos-art-pane-b">
        <span className="lifeos-art-grid" />
      </div>
      <div className="lifeos-art-pane lifeos-art-pane-c">
        <span className="lifeos-art-stem" />
        <span className="lifeos-art-leaf lifeos-art-leaf-a" />
        <span className="lifeos-art-leaf lifeos-art-leaf-b" />
      </div>
      <div className="lifeos-art-caption">
        {isAtlas && <Compass size={14} strokeWidth={1.2} />}
        {isExplore && <Library size={14} strokeWidth={1.2} />}
        {isStudio && <Sparkles size={14} strokeWidth={1.2} />}
        {isResearch && <FlaskConical size={14} strokeWidth={1.2} />}
        {!isAtlas && !isExplore && !isStudio && !isResearch && !isProjects && !isHouse && !isArchive && <Sparkles size={14} strokeWidth={1.2} />}
        <span>{title}</span>
      </div>
    </div>
  )
}

export function SectionPage({
  eyebrow,
  title,
  description,
  children,
}: SectionPageProps) {
  return (
    <div className="lifeos-editorial lifeos-atmosphere min-h-full">
      <div className="mx-auto max-w-[1500px] px-7 py-8 sm:px-10 lg:px-14 lg:py-10">
        <header className="lifeos-hero relative min-h-[11rem] overflow-visible border-b border-[color:var(--lifeos-line)] pb-7">
          <div className="relative z-10 max-w-3xl">
            <p className="lifeos-kicker text-[10px] uppercase tracking-[0.3em]">{eyebrow}</p>
            <h1 className="mt-2 font-serif text-5xl tracking-[-0.045em] text-foreground lg:text-[5.2rem] lg:leading-[0.88]">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground/70">{description}</p>
            )}
          </div>
          <PageArtifact title={title} />
        </header>

        <div className="lifeos-section-rule mt-9 pt-7 lg:mt-11 lg:pt-8">
          {children}
        </div>
      </div>
    </div>
  )
}
