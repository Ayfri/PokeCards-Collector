-- Script de migration pour modifier la structure de la table profiles
-- Version simplifiée pour éviter les problèmes de timeout

-- 1. Supprimer toutes les politiques existantes qui posent problème
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

DROP POLICY IF EXISTS "Everyone can view collections for public profiles" ON collections;
DROP POLICY IF EXISTS "Users can view their own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert into their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete from their own collections" ON collections;

DROP POLICY IF EXISTS "Everyone can view wishlists for public profiles" ON wishlists;
DROP POLICY IF EXISTS "Users can view their own wishlists" ON wishlists;
DROP POLICY IF EXISTS "Users can insert into their own wishlists" ON wishlists;
DROP POLICY IF EXISTS "Users can delete from their own wishlists" ON wishlists;

-- 2. Supprimer les contraintes entre les tables
ALTER TABLE IF EXISTS collections DROP CONSTRAINT IF EXISTS collections_user_id_fkey;
ALTER TABLE IF EXISTS wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_fkey;

-- 3. Ajouter les nouvelles colonnes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS username TEXT;

-- 4. Copier les données dans les nouvelles colonnes
UPDATE profiles SET auth_id = id;
UPDATE collections c SET username = p.username FROM profiles p WHERE c.user_id = p.id;
UPDATE wishlists w SET username = p.username FROM profiles p WHERE w.user_id = p.id;

-- 5. Modifier la clé primaire de profiles
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_pkey,
  ALTER COLUMN username SET NOT NULL,
  ADD PRIMARY KEY (username);

-- 6. Ajouter les contraintes de clé étrangère
ALTER TABLE collections 
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT collections_username_fkey FOREIGN KEY (username) REFERENCES profiles(username) ON DELETE CASCADE;

ALTER TABLE wishlists 
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT wishlists_username_fkey FOREIGN KEY (username) REFERENCES profiles(username) ON DELETE CASCADE;

-- 7. Supprimer la colonne id de profiles
ALTER TABLE profiles DROP COLUMN id;

-- 8. Supprimer les anciennes colonnes user_id
ALTER TABLE collections DROP COLUMN user_id;
ALTER TABLE wishlists DROP COLUMN user_id;

-- 9. Recréer les politiques RLS pour profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT TO service_role WITH CHECK (true);

-- 10. Recréer les politiques RLS pour collections
CREATE POLICY "Everyone can view collections for public profiles" ON collections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = collections.username
      AND profiles.is_public = TRUE
    )
  );

CREATE POLICY "Users can view their own collections" ON collections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = collections.username
      AND profiles.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert into their own collections" ON collections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = collections.username
      AND profiles.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own collections" ON collections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = collections.username
      AND profiles.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from their own collections" ON collections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = collections.username
      AND profiles.auth_id = auth.uid()
    )
  );

-- 11. Recréer les politiques RLS pour wishlists
CREATE POLICY "Everyone can view wishlists for public profiles" ON wishlists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = wishlists.username
      AND profiles.is_public = TRUE
    )
  );

CREATE POLICY "Users can view their own wishlists" ON wishlists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = wishlists.username
      AND profiles.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert into their own wishlists" ON wishlists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = wishlists.username
      AND profiles.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from their own wishlists" ON wishlists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.username = wishlists.username
      AND profiles.auth_id = auth.uid()
    )
  ); 