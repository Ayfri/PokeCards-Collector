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

// Helper functions to toggle individual filter sections
export function toggleBasicFilters() {
	filterStates.update(state => ({
		...state,
		basicFilters: !state.basicFilters
	}));
}

export function toggleTypeFilters() {
	filterStates.update(state => ({
		...state,
		typeFilters: !state.typeFilters
	}));
}

export function toggleCollectionFilters() {
	filterStates.update(state => ({
		...state,
		collectionFilters: !state.collectionFilters
	}));
}
