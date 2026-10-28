import { useState } from 'react';
import { Icon } from '../../../../Icon';
import starterCategories from './DefaultKaomoji.json';
import './kaomoji-drawer.css';

type KaomojiCategory = { name: string; items: string[] };

const STORAGE_KEY = 'conflux-kaomoji-library-v1';
const CUSTOM_CATEGORY = '我的收藏';

/** Adapted from KaomojiDrawerKit's MIT-licensed KaomojiFace SVG. */
export function KaomojiFaceIcon() {
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
    <path d="M5.4 8.3 4.7 3.8 9.1 6.2c.9-.25 1.85-.38 2.9-.38 1.04 0 2 .13 2.9.38l4.4-2.4-.7 4.5c1.12 1.25 1.7 2.8 1.7 4.58 0 4.18-3.35 7.12-8.3 7.12s-8.3-2.94-8.3-7.12c0-1.78.58-3.33 1.7-4.58Z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
    <path d="M7.75 11.7c.55-.58 1.15-.58 1.7 0M14.55 11.7c.55-.58 1.15-.58 1.7 0M9.75 15.05c.72.78 1.47.78 2.25 0 .78.78 1.53.78 2.25 0" stroke="currentColor" strokeWidth="1.05" strokeLinecap="round" />
  </svg>;
}

function readKaomojiLibrary(): KaomojiCategory[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return starterCategories;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length > 100) return starterCategories;
    if (!parsed.every(category => category && typeof category === 'object'
      && typeof category.name === 'string' && category.name.length <= 60
      && Array.isArray(category.items) && category.items.length <= 1000
      && category.items.every((item: unknown) => typeof item === 'string' && item.length <= 300))) {
      return starterCategories;
    }
    return parsed as KaomojiCategory[];
  } catch {
    return starterCategories;
  }
}

export function KaomojiDrawer({ onSelect, onClose }: {
  onSelect: (face: string) => void;
  onClose: () => void;
}) {
  const [categories, setCategories] = useState(readKaomojiLibrary);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newFace, setNewFace] = useState('');
  const [addCategory, setAddCategory] = useState(CUSTOM_CATEGORY);
  const [saveFailed, setSaveFailed] = useState(false);
  const visibleCategories = activeCategory ? categories.filter(category => category.name === activeCategory) : categories;
  const faceCount = categories.reduce((count, category) => count + category.items.length, 0);

  const save = (next: KaomojiCategory[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
    setCategories(next);
  };

  const addFace = () => {
    const face = newFace.trim();
    if (!face || face.length > 300) return;
    const index = categories.findIndex(category => category.name === addCategory);
    const next = categories.map(category => ({ ...category, items: [...category.items] }));
    if (index < 0) next.unshift({ name: addCategory, items: [face] });
    else if (!next[index].items.includes(face)) next[index].items.unshift(face);
    else return;
    save(next);
    setNewFace('');
    setActiveCategory(addCategory);
  };

  const deleteFace = (name: string, face: string) => {
    const next = categories
      .map(category => category.name === name
        ? { ...category, items: category.items.filter(item => item !== face) }
        : category)
      .filter(category => category.items.length > 0);
    save(next);
    if (activeCategory && !next.some(category => category.name === activeCategory)) setActiveCategory(null);
    if (addCategory === name && !next.some(category => category.name === name)) setAddCategory(CUSTOM_CATEGORY);
  };

  return (
    <section className="kaomoji-drawer" id="composer-kaomoji-drawer" role="dialog" aria-label="颜文字抽屉" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    }}>
      <header className="kaomoji-drawer-heading">
        <button type="button" className={editing ? 'active' : ''} aria-label={editing ? '完成整理' : '整理颜文字'} aria-pressed={editing} title={editing ? '完成整理' : '整理颜文字'} onClick={() => setEditing(value => !value)}>
          <Icon name="edit" size={17} />
        </button>
        <div><strong>颜文字</strong><small>{faceCount} 个表情 · 轻点加入输入框</small></div>
        <button type="button" aria-label="关闭颜文字" title="关闭" onClick={onClose}><Icon name="x" size={18} /></button>
      </header>
      <div className="kaomoji-category-tabs" role="group" aria-label="颜文字分类">
        <button type="button" className={activeCategory === null ? 'active' : ''} aria-pressed={activeCategory === null} onClick={() => setActiveCategory(null)}>全部</button>
        {categories.map(category => <button type="button" key={category.name} className={activeCategory === category.name ? 'active' : ''} aria-pressed={activeCategory === category.name} onClick={() => setActiveCategory(category.name)}>{category.name}</button>)}
      </div>
      <div className="kaomoji-drawer-scroll">
        {visibleCategories.map(category => (
          <section className="kaomoji-category" key={category.name}>
            <header><strong>{category.name}</strong><span>{category.items.length}</span></header>
            <div className="kaomoji-grid">
              {category.items.map(face => <div className="kaomoji-item" key={face}>
                <button type="button" className="kaomoji-face" disabled={editing} onClick={() => onSelect(face)} title={face}>{face}</button>
                {editing ? <button type="button" className="kaomoji-remove" aria-label={`从${category.name}删除${face}`} onClick={() => deleteFace(category.name, face)}><Icon name="x" size={13} /></button> : null}
              </div>)}
            </div>
          </section>
        ))}
        <form className="kaomoji-add" onSubmit={event => { event.preventDefault(); addFace(); }}>
          <div className="kaomoji-add-heading"><strong>收藏自己的颜文字</strong><select aria-label="保存到分类" value={addCategory} onChange={event => setAddCategory(event.target.value)}><option value={CUSTOM_CATEGORY}>{CUSTOM_CATEGORY}</option>{categories.filter(category => category.name !== CUSTOM_CATEGORY).map(category => <option key={category.name} value={category.name}>{category.name}</option>)}</select></div>
          <div className="kaomoji-add-input"><input aria-label="新颜文字" placeholder="粘贴或输入颜文字" maxLength={300} value={newFace} onChange={event => setNewFace(event.target.value)} /><button type="submit" disabled={!newFace.trim()} aria-label="添加颜文字"><Icon name="plus" size={18} /></button></div>
          {saveFailed ? <p role="status">本地保存未成功，本次修改可能无法在刷新后保留。</p> : null}
        </form>
      </div>
    </section>
  );
}
