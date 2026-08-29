import { persistentWritable } from './persistentStore';

type FilterStates = {
	basicFilters: boolean;
	typeFilters: boolean;
	collectionFilters: boolean;
};

// Initial state for all filter sections (defaulting to open)
const initialFilterStates: FilterStates = {
	basicFilters: true,
	typeFilters: true,
	collectionFilters: true
};

// Create a persistent store for filter states
export const filterStates = persistentWritable<FilterStates>('filter-states', initialFilterStates);
