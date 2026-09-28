-- `collections` and `wishlists` have no `updated_at` column, so these triggers made every UPDATE on them fail.
drop trigger if exists update_collections_updated_at on collections;
drop trigger if exists update_wishlists_updated_at on wishlists;
