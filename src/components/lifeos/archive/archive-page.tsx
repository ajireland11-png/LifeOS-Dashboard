'use client'

import { Archive as ArchiveIcon, Clock3, LibraryBig } from 'lucide-react'
import { SectionPage } from '../shared/section-page'

export function ArchivePage() {
 return <SectionPage eyebrow="Memory" title="Archive" description="">
  <div className="lifeos-archive-room">
   <div className="lifeos-archive-spine"><LibraryBig size={20} strokeWidth={1.2}/><span>STACKS</span></div>
   <div className="lifeos-archive-shelves">
    {[['Past projects','01'],['Old discoveries','02'],['Completed threads','03'],['Stored material','04']].map(([label,n],i)=><button key={label} type="button" className="lifeos-archive-shelf">
      <span className="lifeos-archive-index">{n}</span><span className="lifeos-archive-book lifeos-archive-book-a"/><span className="lifeos-archive-book lifeos-archive-book-b"/><strong>{label}</strong><Clock3 size={14} strokeWidth={1.2}/>
    </button>)}
   </div>
   <div className="lifeos-archive-foot"><ArchiveIcon size={15} strokeWidth={1.2}/><span>Nothing disappears. It changes rooms.</span></div>
  </div>
 </SectionPage>
}
