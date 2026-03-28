import { XMLParser } from "fast-xml-parser";
import type { ThesaurusEntry, SubEntry, Example } from "../types/dictionary";

const parser = new XMLParser({
  ignoreAttributes: false, attributeNamePrefix: "", textNodeName: "#text",
  ignoreDeclaration: true, removeNSPrefix: true,
});

// Utility: Forces single XML elements into arrays to eliminate boilerplate checks
const toArr = (v: any) => v ? (Array.isArray(v) ? v : [v]) : [];

export const cleanInlineFormatting = (xml: string) => xml
  .replace(/<\/?(tr|sc|ix|xr)\b[^>]*>/g, '')
  .replace(/<trans>[\s\S]*?<\/trans>/g, m => m.replace(/<\/?abbr\b[^>]*>/g, ''));

const parseTrans = (t: any): string[] => {
  const txt = (typeof t === 'string' ? t : t?.['#text'] || toArr(t?.tr).join(', ') || '').trim();
  return txt ? [txt.startsWith('=') ? txt.replace(/\s+/g, ' ') : txt.replace(/\.$/, '$1')] : [];
};

const parseEgs = (egs: any): Example[] => toArr(egs).map((e: any) => ({
  cebuano: e.i?.['#text'] || '',
  english: (typeof e.trans === 'string' ? e.trans : `${toArr(e.trans?.tr).join(', ')} ${e.trans?.['#text'] || ''}`).replace(/\s+/g, ' ').trim()
}));

// Extracts all core properties; explicitly typed as SubEntry to stop recursion
const parseBase = (data: any): SubEntry => {
  const hw = data?.form?.expan || data?.form?.abbr?.expan || data?.form?.['#text'] || '';
  return {
    id: data?.form?.id || data?.id || '',
    headword: hw,
    headwordRaw: hw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
    // Instantly extracts and deduplicates POS strings
    pos: [...new Set<string>(toArr(data?.hom).map((h: any) => h.pos).filter(Boolean))],
    // flatMap elegantly collapses the nested Homograph -> Sense structure
    senses: toArr(data?.hom).flatMap((h: any) => toArr(h.sense).map((s: any) => ({
      pos: h.pos,
      number: s.number ? String(s.number) : undefined,
      inflectionType: s.itype,
      translations: parseTrans(s.trans),
      examples: parseEgs(s.eg)
    })))
  };
};

export const parseEntryXml = (xml: string): ThesaurusEntry => {
  const root = parser.parse(cleanInlineFormatting(xml));
  const data = root.entry || root;
  
  // Maps the base data, then specifically attaches the 1-level-deep subentries array
  return { 
    ...parseBase(data), 
    subentries: toArr(data.entry).map(parseBase) 
  };
};