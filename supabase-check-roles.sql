-- Vérifier les politiques RLS sur les tables collections et wishlists
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('collections', 'wishlists');

-- Vérifier les définitions des tables
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('collections', 'wishlists')
ORDER BY table_name, ordinal_position;

-- Vérifier si les colonnes card_id et set_code sont NOT NULL
SELECT
    table_name,
    column_name,
    is_nullable
FROM
    information_schema.columns
WHERE
    table_name IN ('collections', 'wishlists')
    AND column_name IN ('card_id', 'set_code', 'pokemon_id');

-- Vérifier si les utilisateurs ont les bonnes permissions
SELECT *
FROM information_schema.role_table_grants
WHERE table_name IN ('collections', 'wishlists'); 