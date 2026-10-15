'use client'

import { ReactNode } from 'react'

interface SectionPageProps {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
  plain?: boolean
}

/** A deliberately quiet shared heading; page-specific visuals belong to each workspace. */
export function SectionPage({ eyebrow, title, description, children, plain = false }: SectionPageProps) {
  return (
    <div className="lifeos-editorial min-h-full">
      <div className={plain ? "lifeos-cabinet-shell lifeos-section-plain mx-auto w-full px-4 sm:px-7 lg:px-10" : "lifeos-cabinet-shell mx-auto w-full max-w-[1600px] px-4 sm:px-7 lg:px-10"}>
        <header className={plain ? "lifeos-section-plain-header" : "lifeos-hero border-b border-[color:var(--lo-line)] py-7"}>
          <p className="lifeos-kicker text-[10px] uppercase tracking-[0.22em]">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-foreground sm:text-5xl">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </header>
        <div className={plain ? "lifeos-section-rule lifeos-section-plain-content pt-5" : "lifeos-section-rule pt-6"}>{children}</div>
      </div>
    </div>
  )
}
