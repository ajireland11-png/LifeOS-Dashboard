'use client'

import { ReactNode } from 'react'

interface SectionPageProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

export function SectionPage({
  eyebrow,
  title,
  description,
  children,
}: SectionPageProps) {
  return (
    <div className="lifeos-editorial lifeos-atmosphere min-h-full">
      <div className="mx-auto max-w-[1440px] px-7 py-10 sm:px-10 lg:px-16 lg:py-14">
        <header className="lifeos-hero relative max-w-5xl border-l border-[color:var(--lifeos-line)] pl-6 sm:pl-8">
          <p className="lifeos-kicker text-[10px] uppercase tracking-[0.35em]">
            {eyebrow}
          </p>

          <h1 className="mt-3 font-serif text-5xl tracking-[-0.035em] text-foreground lg:text-[4.5rem] lg:leading-[0.95]">
            {title}
          </h1>

          <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted-foreground lg:text-base">
            {description}
          </p>
        <span className="lifeos-hero-mark" aria-hidden="true" />
        </header>

        <div className="lifeos-section-rule mt-14 pt-8 lg:mt-20 lg:pt-10">
          {children}
        </div>
      </div>
    </div>
  )
}