-- Requête pour afficher la structure de la table profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles';

-- Requête pour afficher la structure de la table collections
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'collections';

-- Requête pour afficher la structure de la table wishlists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'wishlists';

-- Vérifier les contraintes existantes
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname IN ('profiles', 'collections', 'wishlists');

-- Vérifier les politiques RLS actuelles
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'collections', 'wishlists'); 