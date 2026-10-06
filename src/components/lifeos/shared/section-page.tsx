'use client'

import { ReactNode } from 'react'
import { Compass, FlaskConical, Library, Sparkles } from 'lucide-react'

interface SectionPageProps {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
  plain?: boolean
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
  plain = false,
}: SectionPageProps) {
  return (
    <div className="lifeos-editorial lifeos-atmosphere min-h-full">
      <div className={plain ? "lifeos-cabinet-shell lifeos-section-plain mx-auto max-w-[1540px] px-4 sm:px-7 lg:px-10" : "lifeos-cabinet-shell mx-auto max-w-[1540px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8"}>
        {!plain && (
          <div className="lifeos-mosaic-rail lifeos-mosaic-rail-top" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => <span key={index} />)}
          </div>
        )}
        <header className={plain ? "lifeos-section-plain-header" : "lifeos-hero relative min-h-[15rem] overflow-visible border-b border-[color:var(--lifeos-line)] pb-7"}>
          <div className="relative z-10 max-w-3xl">
            <p className="lifeos-kicker text-[10px] uppercase tracking-[0.3em]">{eyebrow}</p>
            <h1 className="mt-2 font-serif text-5xl tracking-[-0.045em] text-foreground lg:text-[5.2rem] lg:leading-[0.88]">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground/70">{description}</p>
            )}
          </div>
          {!plain && <PageArtifact title={title} />}
          {!plain && <div className="lifeos-hero-plate" aria-hidden="true">
            <div className="lifeos-plate-image">
              <img src={
                title.toLowerCase().includes('research') ? 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?auto=format&fit=crop&w=900&q=80' :
                title.toLowerCase().includes('house') ? 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80' :
                title.toLowerCase().includes('studio') ? 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=80' :
                title.toLowerCase().includes('explore') ? 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=900&q=80' :
                title.toLowerCase().includes('archive') ? 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80' :
                title.toLowerCase().includes('atlas') ? 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=80' :
                'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80'
              } alt="" />
            </div>
            <span className="lifeos-plate-line" />
            <span className="lifeos-plate-note">field material / 01</span>
          </div>}
        </header>

        <div className={`${plain ? "lifeos-section-rule lifeos-section-plain-content" : "lifeos-section-rule"} mt-9 pt-7 lg:mt-11 lg:pt-8`}>
          {children}
        </div>
        {!plain && (
          <div className="lifeos-mosaic-rail lifeos-mosaic-rail-bottom" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => <span key={index} />)}
          </div>
        )}
      </div>
    </div>
  )
}
