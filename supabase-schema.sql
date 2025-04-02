-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles are viewable by everyone
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_public = TRUE);

-- Users can view their own profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow service role to create new profiles during signup
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT TO service_role USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_card UNIQUE (user_id, card_id)
);

-- Create RLS policies for collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Everyone can view collections for public profiles
CREATE POLICY "Everyone can view collections for public profiles" ON collections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = collections.user_id
      AND profiles.is_public = TRUE
    )
  );

-- Users can view their own collections
CREATE POLICY "Users can view their own collections" ON collections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert into their own collections
CREATE POLICY "Users can insert into their own collections" ON collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own collections
CREATE POLICY "Users can update their own collections" ON collections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete from their own collections
CREATE POLICY "Users can delete from their own collections" ON collections
  FOR DELETE USING (auth.uid() = user_id);

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_card_wishlist UNIQUE (user_id, card_id)
);

-- Create RLS policies for wishlists
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- Everyone can view wishlists for public profiles
CREATE POLICY "Everyone can view wishlists for public profiles" ON wishlists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = wishlists.user_id
      AND profiles.is_public = TRUE
    )
  );

-- Users can view their own wishlists
CREATE POLICY "Users can view their own wishlists" ON wishlists
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert into their own wishlists
CREATE POLICY "Users can insert into their own wishlists" ON wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete from their own wishlists
CREATE POLICY "Users can delete from their own wishlists" ON wishlists
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at when a record is updated
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger for collections
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Trigger for wishlists
CREATE TRIGGER update_wishlists_updated_at
BEFORE UPDATE ON wishlists
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 