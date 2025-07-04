import { persistentWritable } from './persistentStore';

type Theme = 'light' | 'dark';

// Create a persistent store for theme with 'dark' as default (matching current app style)
export const theme = persistentWritable<Theme>('theme', 'dark');