'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, ArrowUpRight, BookOpen, Bookmark, Brush, FolderPlus, Image, Lightbulb, Pencil, Plus, Save, Sparkles, Trash2, X } from 'lucide-react'

type Item = { id:string; title:string; kind:string; summary?:string|null; content:string; sourceUrl?:string|null; imageUrl?:string|null; category?:string|null; tags?:string[]; isFavorite?:boolean; archived:boolean; updatedAt:string }
type Category = {id:string;name:string;description?:string|null;accent:string;position:number;itemCount:number}
type Collection = {id:string;name:string;description?:string|null;coverUrl?:string|null;items:string[];itemCount:number}
const KINDS = ['idea','inspiration','material','technique','reference'] as const
const kindLabel:Record<string,string> = { idea:'Ideas', inspiration:'Inspiration', material:'Materials', technique:'Techniques', reference:'References' }

function isWebUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' } catch { return false }
}

export function StudioPage() {
  const [items,setItems]=useState<Item[]>([])
  const [categories,setCategories]=useState<Category[]>([])
  const [collections,setCollections]=useState<Collection[]>([])
  const [categoryFilter,setCategoryFilter]=useState('all')
  const [selectedCollectionId,setSelectedCollectionId]=useState<string|null>(null)
  const [newCategoryName,setNewCategoryName]=useState('')
  const [editingCategoryId,setEditingCategoryId]=useState<string|null>(null)
  const [editingCategoryName,setEditingCategoryName]=useState('')
  const [newCollectionName,setNewCollectionName]=useState('')
  const [editingCollectionId,setEditingCollectionId]=useState<string|null>(null)
  const [editingCollectionName,setEditingCollectionName]=useState('')
  const [loading,setLoading]=useState(true)
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [filter,setFilter]=useState('all')
  const [search,setSearch]=useState('')
  const [newTitle,setNewTitle]=useState('')
  const [newKind,setNewKind]=useState('inspiration')
  const [newSourceUrl,setNewSourceUrl]=useState('')
  const [newImageUrl,setNewImageUrl]=useState('')
  const [newCategory,setNewCategory]=useState('')
  const [newTags,setNewTags]=useState('')
  const [creating,setCreating]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [title,setTitle]=useState('')
  const [kind,setKind]=useState('idea')
  const [summary,setSummary]=useState('')
  const [content,setContent]=useState('')
  const [sourceUrl,setSourceUrl]=useState('')
  const [imageUrl,setImageUrl]=useState('')
  const [category,setCategory]=useState('')
  const [tagsText,setTagsText]=useState('')

  const load=useCallback(async()=>{
    setLoading(true)
    try { const [ir,cr,cor]=await Promise.all([fetch('/api/studio/items'),fetch('/api/studio/categories'),fetch('/api/studio/collections')]);if(!ir.ok||!cr.ok||!cor.ok)throw new Error('Could not open Studio.');const [itemsData,catsData,colsData]=await Promise.all([ir.json(),cr.json(),cor.json()]);setItems(Array.isArray(itemsData)?itemsData.filter((x:Item)=>!x.archived):[]);setCategories(Array.isArray(catsData)?catsData:[]);setCollections(Array.isArray(colsData)?colsData:[]) }
    catch(e){setError(e instanceof Error?e.message:'Could not load Studio.')} finally{setLoading(false)}
  },[])
  useEffect(()=>{void load()},[])
  const selected=items.find(x=>x.id===selectedId)||null
  const visible=useMemo(()=>items.filter(x=>(filter==='all'||(filter==='favorites'?!!x.isFavorite:x.kind===filter))&&(categoryFilter==='all'||x.category===categoryFilter)&&(!selectedCollectionId||collections.find(col=>col.id===selectedCollectionId)?.items.includes(x.id))&&(x.title+' '+(x.summary||'')+' '+x.content+' '+(x.category||'')+' '+(x.tags||[]).join(' ')).toLowerCase().includes(search.toLowerCase())),[items,filter,categoryFilter,selectedCollectionId,collections,search])
  useEffect(()=>{setTitle(selected?.title||'');setKind(selected?.kind||'idea');setSummary(selected?.summary||'');setContent(selected?.content||'');setSourceUrl(selected?.sourceUrl||'');setImageUrl(selected?.imageUrl||'');setCategory(selected?.category||'');setTagsText((selected?.tags||[]).join(', '))},[selectedId,selected?.updatedAt])

  async function create(e:React.FormEvent){
    e.preventDefault(); if(!newTitle.trim())return
    setCreating(true);setError('')
    try{const r=await fetch('/api/studio/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle.trim(),kind:newKind,sourceUrl:newSourceUrl.trim()||null,imageUrl:newImageUrl.trim()||null,category:newCategory.trim()||null,tags:newTags.split(',').map(t=>t.trim()).filter(Boolean)})});if(!r.ok)throw new Error('Could not create this entry.');const item=await r.json() as Item;setNewTitle('');setNewSourceUrl('');setNewImageUrl('');setNewCategory('');setNewTags('');await load();setSelectedId(item.id)}
    catch(e){setError(e instanceof Error?e.message:'Could not create this entry.')}finally{setCreating(false)}
  }
  async function toggleFavorite(item:Item){
    try{const r=await fetch('/api/studio/items/'+item.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({isFavorite:!item.isFavorite})});if(!r.ok)throw new Error('Could not update favourite.');const updated=await r.json() as Item;setItems(old=>old.map(x=>x.id===updated.id?updated:x))}catch(e){setError(e instanceof Error?e.message:'Could not update favourite.')}
  }

  async function save(){
    if(!selected)return
    setSaving(true);setError('')
    try{const r=await fetch('/api/studio/items/'+selected.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title.trim()||selected.title,kind,summary:summary.trim()||null,content,sourceUrl:sourceUrl.trim(),imageUrl:imageUrl.trim(),category:category.trim(),tags:tagsText.split(',').map(t=>t.trim()).filter(Boolean)})});if(!r.ok)throw new Error('Could not save changes.');await load()}
    catch(e){setError(e instanceof Error?e.message:'Could not save changes.')}finally{setSaving(false)}
  }
  async function archive(){
    if(!selected)return
    try{const r=await fetch('/api/studio/items/'+selected.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({archived:true})});if(!r.ok)throw new Error('Could not archive this entry.');setSelectedId(null);await load()}
    catch(e){setError(e instanceof Error?e.message:'Could not archive this entry.')}
  }
  async function remove(){
    if(!selected||!window.confirm('Permanently delete this entry?'))return
    try{const r=await fetch('/api/studio/items/'+selected.id,{method:'DELETE'});if(!r.ok)throw new Error('Could not delete this entry.');setSelectedId(null);await load()}
    catch(e){setError(e instanceof Error?e.message:'Could not delete this entry.')}
  }


  async function createCategory(e:React.FormEvent){e.preventDefault();if(!newCategoryName.trim())return;try{const r=await fetch('/api/studio/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newCategoryName.trim()})});if(!r.ok)throw new Error('Category name may already exist.');const item=await r.json() as Category;setNewCategoryName('');await load();setCategoryFilter(item.name)}catch(e){setError(e instanceof Error?e.message:'Could not create category.')}}
  async function renameCategory(cat:Category){if(!editingCategoryName.trim())return;try{const r=await fetch('/api/studio/categories/'+cat.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:editingCategoryName.trim()})});if(!r.ok)throw new Error('Could not rename category.');if(categoryFilter===cat.name)setCategoryFilter(editingCategoryName.trim());setEditingCategoryId(null);await load()}catch(e){setError(e instanceof Error?e.message:'Could not rename category.')}}
  async function deleteCategory(cat:Category){if(!window.confirm('Delete category “'+cat.name+'”? Items will be kept and become uncategorised.'))return;try{const r=await fetch('/api/studio/categories/'+cat.id,{method:'DELETE'});if(!r.ok)throw new Error('Could not delete category.');if(categoryFilter===cat.name)setCategoryFilter('all');await load()}catch(e){setError(e instanceof Error?e.message:'Could not delete category.')}}
  async function createCollection(e:React.FormEvent){e.preventDefault();if(!newCollectionName.trim())return;try{const r=await fetch('/api/studio/collections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newCollectionName.trim()})});if(!r.ok)throw new Error('Could not create collection.');const col=await r.json() as Collection;setNewCollectionName('');await load();setSelectedCollectionId(col.id)}catch(e){setError(e instanceof Error?e.message:'Could not create collection.')}}
  async function renameCollection(col:Collection){if(!editingCollectionName.trim())return;try{const r=await fetch('/api/studio/collections/'+col.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:editingCollectionName.trim()})});if(!r.ok)throw new Error('Could not rename collection.');setEditingCollectionId(null);await load()}catch(e){setError(e instanceof Error?e.message:'Could not rename collection.')}}
  async function deleteCollection(col:Collection){if(!window.confirm('Delete collection “'+col.name+'”? Saved inspiration items will remain.'))return;try{const r=await fetch('/api/studio/collections/'+col.id,{method:'DELETE'});if(!r.ok)throw new Error('Could not delete collection.');if(selectedCollectionId===col.id)setSelectedCollectionId(null);await load()}catch(e){setError(e instanceof Error?e.message:'Could not delete collection.')}}
  async function toggleCollection(collectionId:string,checked:boolean){if(!selected)return;try{const r=await fetch('/api/studio/collections/'+collectionId+'/items/'+selected.id,{method:checked?'POST':'DELETE',headers:{'Content-Type':'application/json'},body:checked?'{}':undefined});if(!r.ok)throw new Error('Could not update collection membership.');const res=await fetch('/api/studio/collections');if(res.ok)setCollections(await res.json())}catch(e){setError(e instanceof Error?e.message:'Could not update collection membership.')}}

  return <div className="lo-studio">
    <header className="lo-studio-header"><div><div className="lo-overline">LIFEOS / MAKING & COLLECTING</div><h1>Creative Studio.</h1><p>A place for sparks, materials, references and experiments. Not everything here needs to become a task.</p></div><div className="lo-studio-header-actions"><button type="button" className="lo-studio-quiet-action" onClick={()=>{if(items.length)setSelectedId(items[Math.floor(Math.random()*items.length)].id)}} disabled={!items.length}><Sparkles size={14}/> Surprise me</button><button type="button" className="lo-studio-new-button" onClick={()=>{setNewKind("inspiration");document.getElementById("studio-capture")?.focus()}}><Sparkles size={15}/> Capture inspiration</button></div></header>
    <div className="lo-studio-main">
      <aside className="lo-studio-library">
        <div className="lo-learn-index-title"><span>COLLECTED MATERIAL</span><span>{items.length.toString().padStart(2,'0')}</span></div>
        <form className="lo-studio-capture" onSubmit={create}><input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Capture a spark…" id="studio-capture"/><button disabled={creating||!newTitle.trim()} aria-label="Create entry"><Plus size={16}/></button></form>
        <div className="lo-studio-capture-meta"><input value={newSourceUrl} onChange={e=>setNewSourceUrl(e.target.value)} placeholder="Source link · article, reel, page"/><input value={newImageUrl} onChange={e=>setNewImageUrl(e.target.value)} placeholder="Image URL · optional thumbnail"/><select value={newCategory} onChange={e=>setNewCategory(e.target.value)} aria-label="Hobby category"><option value="">Hobby category…</option>{categories.map(cat=><option key={cat.id} value={cat.name}>{cat.name}</option>)}</select><input value={newTags} onChange={e=>setNewTags(e.target.value)} placeholder="Tags, comma separated"/></div>
        <label className="lo-studio-kind-select"><span>Collect as</span><select value={newKind} onChange={e=>setNewKind(e.target.value)}>{KINDS.map(k=><option value={k} key={k}>{kindLabel[k]}</option>)}</select></label>
        <label className="lo-learn-search lo-studio-search"><Image size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the workbench"/></label>
        <div className="lo-studio-filters"><button type="button" aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Everything</button><button type="button" aria-pressed={filter==='favorites'} onClick={()=>setFilter('favorites')}>★ Favourites</button>{KINDS.map(k=><button key={k} type="button" aria-pressed={filter===k} onClick={()=>setFilter(k)}>{kindLabel[k]}</button>)}</div>
        <section className="lo-studio-taxonomy"><div className="lo-studio-side-heading"><span>HOBBIES & CATEGORIES</span><small>{categories.length.toString().padStart(2,'0')}</small></div><form className="lo-studio-side-create" onSubmit={createCategory}><input value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} placeholder="Create a category…" aria-label="New category name"/><button disabled={!newCategoryName.trim()} aria-label="Create category"><Plus size={13}/></button></form><button type="button" className={'lo-studio-category-chip '+(categoryFilter==='all'?'is-active':'')} onClick={()=>setCategoryFilter('all')}>All hobbies <small>{items.length}</small></button>{categories.map(cat=><div className="lo-studio-taxonomy-row" key={cat.id}>{editingCategoryId===cat.id?<form onSubmit={e=>{e.preventDefault();void renameCategory(cat)}}><input autoFocus value={editingCategoryName} onChange={e=>setEditingCategoryName(e.target.value)}/><button type="submit" aria-label="Save category name"><Save size={12}/></button><button type="button" onClick={()=>setEditingCategoryId(null)} aria-label="Cancel rename"><X size={12}/></button></form>:<><button type="button" className={'lo-studio-category-chip '+(categoryFilter===cat.name?'is-active':'')} onClick={()=>setCategoryFilter(cat.name)}><span>{cat.name}</span><small>{cat.itemCount}</small></button><button type="button" title="Rename category" onClick={()=>{setEditingCategoryId(cat.id);setEditingCategoryName(cat.name)}} aria-label={'Rename '+cat.name}><Pencil size={11}/></button><button type="button" title="Delete category" onClick={()=>void deleteCategory(cat)} aria-label={'Delete '+cat.name}><Trash2 size={11}/></button></>}</div>)}</section>
        <section className="lo-studio-collections"><div className="lo-studio-side-heading"><span>COLLECTIONS</span><small>{collections.length.toString().padStart(2,'0')}</small></div><form className="lo-studio-side-create" onSubmit={createCollection}><input value={newCollectionName} onChange={e=>setNewCollectionName(e.target.value)} placeholder="New collection…" aria-label="New collection name"/><button disabled={!newCollectionName.trim()} aria-label="Create collection"><FolderPlus size={13}/></button></form><button type="button" className={'lo-studio-collection-chip '+(!selectedCollectionId?'is-active':'')} onClick={()=>setSelectedCollectionId(null)}><Bookmark size={12}/> All items <small>{items.length}</small></button>{collections.map(col=><div className="lo-studio-collection-row" key={col.id}>{editingCollectionId===col.id?<form onSubmit={e=>{e.preventDefault();void renameCollection(col)}}><input autoFocus value={editingCollectionName} onChange={e=>setEditingCollectionName(e.target.value)}/><button type="submit" aria-label="Save collection name"><Save size={12}/></button><button type="button" onClick={()=>setEditingCollectionId(null)} aria-label="Cancel rename"><X size={12}/></button></form>:<><button type="button" className={'lo-studio-collection-chip '+(selectedCollectionId===col.id?'is-active':'')} onClick={()=>setSelectedCollectionId(col.id)}><Bookmark size={12}/><span>{col.name}</span><small>{col.itemCount}</small></button><button type="button" title="Rename collection" onClick={()=>{setEditingCollectionId(col.id);setEditingCollectionName(col.name)}} aria-label={'Rename '+col.name}><Pencil size={11}/></button><button type="button" title="Delete collection" onClick={()=>void deleteCollection(col)} aria-label={'Delete '+col.name}><Trash2 size={11}/></button></>}</div>)}</section>
        {loading?<p className="lo-studio-muted">Gathering your references…</p>:visible.length?<div>{visible.map((item,i)=><button type="button" key={item.id} aria-current={selectedId===item.id} className="lo-studio-item" onClick={()=>setSelectedId(item.id)}><small>{String(i+1).padStart(2,'0')} / {kindLabel[item.kind]||item.kind} · {item.updatedAt?new Date(item.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'New'}</small>{item.imageUrl&&isWebUrl(item.imageUrl)&&<img className="lo-studio-item-image" src={item.imageUrl} alt="" loading="lazy"/>}<strong>{item.title}</strong>{item.category&&<small>{item.category}</small>}{item.summary&&<small>{item.summary}</small>}</button>)}</div>:<p className="lo-studio-muted">{search?'Nothing matches this search.':'The workbench is empty. Save a thought, material or reference to begin.'}</p>}
      </aside>
      <main className="lo-studio-editor">
        {selected?<><div className="lo-studio-editor-head"><div className="lo-overline">WORKING NOTE / {kindLabel[kind]||kind}</div><div className="lo-studio-editor-tools">{selected&&<button type="button" className={selected.isFavorite?'is-favorite':''} onClick={()=>void toggleFavorite(selected)} aria-pressed={!!selected.isFavorite} title={selected.isFavorite?'Remove from favourites':'Save to favourites'}><Bookmark size={14} fill={selected.isFavorite?'currentColor':'none'}/>{selected.isFavorite?'Favourited':'Favourite'}</button>}<select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Entry type">{KINDS.map(k=><option key={k} value={k}>{kindLabel[k]}</option>)}</select></div></div><input className="lo-studio-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Give this entry a name"/><input className="lo-studio-summary" value={summary} onChange={e=>setSummary(e.target.value)} placeholder="A short description, material, mood or question…"/><div className="lo-studio-source-fields"><label>Image preview URL<input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Direct image URL"/></label><label>Source link<input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="Article, website or Instagram reel URL"/></label><label>Hobby category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Uncategorised</option>{category&&!categories.some(cat=>cat.name===category)&&<option value={category}>{category} · legacy</option>}{categories.map(cat=><option key={cat.id} value={cat.name}>{cat.name}</option>)}</select></label><label>Tags<input value={tagsText} onChange={e=>setTagsText(e.target.value)} placeholder="colour, technique, material"/></label></div><div className="lo-studio-item-collections"><div>COLLECTION MEMBERSHIP <small>One inspiration can belong to several collections.</small></div>{collections.length?collections.map(col=><label key={col.id}><input type="checkbox" checked={col.items.includes(selected.id)} onChange={e=>void toggleCollection(col.id,e.target.checked)}/><span>{col.name}</span></label>):<p>Create a collection on the left, then add this item to it.</p>}</div>{imageUrl.trim()&&isWebUrl(imageUrl.trim())&&<figure className="lo-studio-image-preview"><img src={imageUrl} alt={"Reference for "+(title||"this Studio item")} loading="lazy"/><figcaption>Reference image · saved with this item</figcaption></figure>}{sourceUrl.trim()&&isWebUrl(sourceUrl.trim())&&<a className="lo-studio-source-link" href={sourceUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={14}/> Open original source</a>}<textarea className="lo-studio-content" value={content} onChange={e=>setContent(e.target.value)} placeholder="Collect the details here: what caught your eye, where you found it, what you might try, materials, links, or questions…" rows={16}/><div className="lo-studio-actions"><button type="button" className="lo-studio-save" onClick={save} disabled={saving}><Save size={14}/>{saving?'Saving…':'Save entry'}</button><button type="button" onClick={archive}><Archive size={14}/> Archive</button><button type="button" className="lo-studio-delete" onClick={remove}><Trash2 size={14}/> Delete</button></div></>:<div className="lo-studio-empty"><Brush size={30}/><h2>Leave room for the unexpected.</h2><p>Choose something you have collected, or add a new idea. The Studio is a place to follow your curiosity before deciding what it means.</p><button type="button" className="lo-studio-new-button" onClick={()=>{setNewKind('inspiration');document.getElementById('studio-capture')?.focus()}}> <Lightbulb size={15}/> Start with an inspiration</button></div>}
        {error&&<div className="lo-studio-error" role="alert">{error}</div>}
      </main>
    </div>
  </div>
}
