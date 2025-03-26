interface PokemonCardProps {
  name: string;
  image: string;
  cardCode: string;
}

export function PokemonCard({ name, image, cardCode }: PokemonCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative aspect-square">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-2">{name}</h2>
        <p className="text-sm text-gray-600">Code: {cardCode}</p>
      </div>
    </div>
  );
} 