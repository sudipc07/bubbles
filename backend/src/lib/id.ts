import { nanoid, customAlphabet } from 'nanoid';

export const newId = () => nanoid(21);

const slugAlphabet = customAlphabet('abcdefghijkmnpqrstuvwxyz23456789', 8);
export const newSlugSuffix = () => slugAlphabet();

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'project';
