'use client';

import { useState } from 'react';
import { PokemonCard } from '@/components/PokemonCard';

interface Pokemon {
  id: string;
  name: string;
  image: string;
  cardCode: string;
}

export default function Home() {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pokemons, setPokemons] = useState<Pokemon[]>([]); // À remplir avec vos données

  const sortedPokemons = [...pokemons].sort((a, b) => {
    const codeA = parseInt(a.cardCode);
    const codeB = parseInt(b.cardCode);
    return sortOrder === 'asc' ? codeA - codeB : codeB - codeA;
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">PokéStore</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Trier par rareté:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="border rounded-md px-3 py-1"
          >
            <option value="asc">Plus rare en haut</option>
            <option value="desc">Plus rare en bas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedPokemons.map((pokemon) => (
          <PokemonCard
            key={pokemon.id}
            name={pokemon.name}
            image={pokemon.image}
            cardCode={pokemon.cardCode}
          />
        ))}
      </div>
    </main>
  );
} 