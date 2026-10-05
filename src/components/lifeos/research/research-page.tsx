'use client'

import { FlaskConical, BookOpen, Microscope, FileText } from 'lucide-react'
import { SectionPage } from '../shared/section-page'

const shelves = [
  { icon: BookOpen, label: 'Papers', className: 'lifeos-research-shelf-gold' },
  { icon: Microscope, label: 'Experiments', className: 'lifeos-research-shelf-green' },
  { icon: FileText, label: 'Figures & evidence', className: 'lifeos-research-shelf-mauve' },
  { icon: FlaskConical, label: 'Questions', className: 'lifeos-research-shelf-terracotta' },
]

export function ResearchPage() {
 return <SectionPage eyebrow="Scientific work" title="Research" description="">
  <div className="lifeos-research-room">
    <div className="lifeos-research-intro">
      <FlaskConical size={22} strokeWidth={1.2}/>
      <span>Laboratory</span>
      <div className="lifeos-research-rule" />
      <small>01</small>
    </div>
    <div className="lifeos-research-shelves">
      {shelves.map(({icon:Icon,label,className},i)=><button key={label} type="button" className={`lifeos-research-shelf ${className}`}>
        <span className="lifeos-research-shelf-index">0{i+1}</span><Icon size={20} strokeWidth={1.2}/><strong>{label}</strong><span className="lifeos-research-arrow">↗</span>
      </button>)}
    </div>
    <div className="lifeos-research-bottom"><span>Research environment</span><span>Ready for papers, experiments, evidence and open questions.</span></div>
  </div>
 </SectionPage>
}
