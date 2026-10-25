// The only upstream portfolio type needed by Sasshi's optional cover seal.
// Conflux album ownership and image cards remain in their existing domain types.
export type SealArt = {
  name: string;
  glyphs: { char: string; d: string; box: [number, number, number, number] }[];
};
