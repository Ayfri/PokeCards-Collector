import { writable, get } from 'svelte/store';
import { getUserWishlist } from '$lib/services/wishlists';
import { authStore } from './auth';
import { browser } from '$app/environment';
import { setLoading } from './loading';

// Store pour les cardCodes des cartes dans la wishlist
export const wishlistStore = writable<Set<string>>(new Set());

// Variable pour suivre si un chargement est en cours
let isLoadingWishlist = false;
// Variable pour suivre si la wishlist a déjà été chargée au moins une fois
let wishlistLoaded = false;

// Fonction pour charger la wishlist complète
export async function loadWishlist(forceReload: boolean = false) {
	const authState = get(authStore);
	if (!authState.profile?.username) return;
	
	// Éviter les chargements multiples simultanés
	if (isLoadingWishlist) return;
	
	// Si la wishlist est déjà chargée et que le store a des éléments, ne pas recharger
	if (!forceReload && wishlistLoaded && get(wishlistStore).size > 0) return;

	try {
		isLoadingWishlist = true;
		setLoading(true);
		const { data: wishlistItems, error } = await getUserWishlist(authState.profile.username);
		
		if (error) {
			console.error('Error loading wishlist:', error);
			return;
		}

		// Créer un Set de cardCodes pour une recherche O(1)
		const wishlistCardCodes = new Set(wishlistItems?.map(item => item.card_code) || []);
		wishlistStore.set(wishlistCardCodes);
		wishlistLoaded = true;
	} catch (error) {
		console.error('Exception loading wishlist:', error);
	} finally {
		isLoadingWishlist = false;
		setLoading(false);
	}
}

// Fonction pour ajouter une carte à la wishlist locale
export function addToWishlistStore(cardCode: string) {
	wishlistStore.update(set => {
		const newSet = new Set(set);
		newSet.add(cardCode);
		return newSet;
	});
}

// Fonction pour supprimer une carte de la wishlist locale
export function removeFromWishlistStore(cardCode: string) {
	wishlistStore.update(set => {
		const newSet = new Set(set);
		newSet.delete(cardCode);
		return newSet;
	});
}

// Initialisation côté client
if (browser) {
	// S'abonner aux changements d'authentification pour charger/vider la wishlist
	authStore.subscribe(state => {
		if (state.initialized && !state.loading) {
			if (state.profile) {
				// Utilisateur connecté, charger sa wishlist
				loadWishlist();
			} else {
				// Utilisateur déconnecté, vider la wishlist
				wishlistStore.set(new Set());
				wishlistLoaded = false;
			}
		}
	});
} 