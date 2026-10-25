// The only upstream portfolio type needed by Sasshi's optional cover seal.
// Conflux album ownership and image cards remain in their existing domain types.
export type SealArt = {
  name: string;
  glyphs: { char: string; d: string; box: [number, number, number, number] }[];
};

// Sasshi pouch print data. Canonical Conflux records are adapted in-memory.
export type Link = { label: string; href: string };
export type Spec = { k: string; v: string };
type ItemBase = { id: string; label: string; anecdote?: string; story?: string; specs?: Spec[]; href?: string; links?: Link[] };
export type BusinessCardItem = ItemBase & {
  kind: 'card'; front: { name: string; role: string; tagline?: string }; inside: Spec[]; insideNote?: string;
};
export type ResumeEntry = { org: string; role: string; from: string; to: string; bullets: string[] };
export type ResumeItem = ItemBase & {
  kind: 'resume'; summary: string; experience: ResumeEntry[];
  education: { school: string; degree: string; from: string; to: string }[];
  skills: string[]; languages?: string[]; pdf?: string;
};
export type TicketItem = ItemBase & {
  kind: 'ticket'; event: string; date: string; seat?: string; color?: string;
  time?: string; venue?: string; city?: string; talk?: string; serial?: string;
};
export type PolaroidItem = ItemBase & {
  kind: 'polaroid'; image?: string; caption: string; tint?: string;
  place?: string; date?: string; back?: string;
};
export type NoteItem = ItemBase & { kind: 'note'; text: string; from: string; date?: string };
export type PocketItem = BusinessCardItem | ResumeItem | TicketItem | PolaroidItem | NoteItem;
export type ItemKind = PocketItem['kind'];
export type Profile = {
  lang?: string; name: string; nameLocal?: string; handle?: string; role: string;
  location?: string; timezone?: string; bio: string; links: Link[];
  coverTitle: string; seal?: SealArt | null; source?: string;
  items: PocketItem[];
  albums: {
    cards: { id: string; label: string; src?: string }[];
    postcards: { id: string; label: string; message: string; from: string; place: string }[];
  };
};
