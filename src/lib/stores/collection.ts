import { writable, get } from 'svelte/store';
import { getUserCollection } from '$lib/services/collections';
import { authStore } from './auth';
import { browser } from '$app/environment';

// Store pour les cardCodes des cartes dans la collection
export const collectionStore = writable<Set<string>>(new Set());

// Variable pour suivre si un chargement est en cours
let isLoadingCollection = false;
// Variable pour suivre si la collection a déjà été chargée au moins une fois
let collectionLoaded = false;

// Fonction pour charger la collection complète
export async function loadCollection() {
	const authState = get(authStore);
	if (!authState.profile?.username) return;
	
	// Éviter les chargements multiples simultanés
	if (isLoadingCollection) return;
	
	// Si la collection est déjà chargée et que le store a des éléments, ne pas recharger
	if (collectionLoaded && get(collectionStore).size > 0) return;

	try {
		isLoadingCollection = true;
		const { data: collectionItems, error } = await getUserCollection(authState.profile.username);
		
		if (error) {
			console.error('Error loading collection:', error);
			return;
		}

		// Créer un Set de cardCodes pour une recherche O(1)
		const collectionCardCodes = new Set(collectionItems?.map(item => item.card_code) || []);
		collectionStore.set(collectionCardCodes);
		collectionLoaded = true;
	} catch (error) {
		console.error('Exception loading collection:', error);
	} finally {
		isLoadingCollection = false;
	}
}

// Fonction pour ajouter une carte à la collection locale
export function addToCollectionStore(cardCode: string) {
	collectionStore.update(set => {
		const newSet = new Set(set);
		newSet.add(cardCode);
		return newSet;
	});
}

// Fonction pour supprimer une carte de la collection locale
export function removeFromCollectionStore(cardCode: string) {
	collectionStore.update(set => {
		const newSet = new Set(set);
		newSet.delete(cardCode);
		return newSet;
	});
}

// Initialisation côté client
if (browser) {
	// S'abonner aux changements d'authentification pour charger/vider la collection
	authStore.subscribe(state => {
		if (state.initialized && !state.loading) {
			if (state.profile) {
				// Utilisateur connecté, charger sa collection
				loadCollection();
			} else {
				// Utilisateur déconnecté, vider la collection
				collectionStore.set(new Set());
				collectionLoaded = false;
			}
		}
	});
} 