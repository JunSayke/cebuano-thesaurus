export interface EntrySummary {
  entryId: number;
  headword: string;
  normalizedHead: string;
  pos?: string;
}

export interface BaseDictionaryEntry {
  id: string;
  headword: string;         // canonical display form, e.g. "búang"
  headwordRaw: string;      // normalized/lookup key, e.g. "buang"
  pos: string[];            // all parts of speech across homographs
  senses: NormalizedSense[];
}

export interface SubEntry extends BaseDictionaryEntry {
  subentries?: never; 
}

export interface ThesaurusEntry extends BaseDictionaryEntry {
  subentries: SubEntry[];
}

export interface NormalizedSense {
  pos?: string;             // "n" | "v" | "a" | ...
  number?: string;
  inflectionType?: string;  // e.g. "[B; b6]"
  translations: string[];   // flat list of English glosses
  examples: Example[];
}

export interface Example {
  cebuano: string;
  english: string;
} 