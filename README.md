# PokeStore

PokeStore is a website that allows you to buy Pokemon cards. It is a school project.
You can search for cards, add them to your cart and buy them.

## Installation

To install the project you need to follow multiple steps :

1. Clone the project
2. Install the dependencies (`npm install`)
3. Create a MariaDB database and import the `dump.sql` file.
4. Create a `.env` file in the `api` folder of the project and fill it with the following variables :
    - DATABASE_URL: The URL of your MariaDB database.
    - POKEMON_TCG_API_KEY: The API key of the [Pokemon TCG API](https://pokemontcg.io/).
5. Create a `.env` file in the root folder of the project and fill it with the following variables :
    - API_URL: The URL of the API.
    - API_KEY: The API key of the Google Maps API (you must activate the "Places API" on the key).
6. Run `prisma generate` to generate the Prisma client.
7. Run the api with `npm run api`.
8. Run the client with `npm run dev`.
9. Go to `http://localhost:4321/admin/load` and wait for the 'ok' to appear to load the JSON data into the database. This step can take a few dozen seconds.
10. Go to `http://localhost:4322` and enjoy the project !

## Data Scrapers

You can use the interactive CLI to scrape and update various Pokemon data:

```bash
pnpm scrapers
```

This will present a menu where you can choose which scraper to run:

- **cards**: Fetch all Pokémon cards from TCG API
- **foil**: Generate foil URLs for holographic cards
- **holo**: Extract holographic cards from cards dataset
- **pokemons**: Fetch all Pokémon data from PokéAPI
- **sets**: Fetch all card sets from TCG API
- **types**: Extract all Pokémon types from cards dataset

For best results, run the scrapers in the following order:

1. `pokemons` - Get basic Pokémon data
2. `sets` - Get card sets data
3. `cards` - Get all cards (requires Pokémon data)
4. `holo` - Extract holographic cards (requires cards data)
5. `foil` - Generate foil URLs (requires holo data)
6. `types` - Extract types (requires cards data)

The scraped data is saved to JSON files in the `src/assets/` directory.

## Technologies

This project uses the following technologies :

- Astro.js for the client and the api
- MariaDB for the database
- Node.js for running the modules, Node 23 is required!
- NPM for the dependencies
- Typescript for the typing and the main code
- Vite for the bundling

## Dependencies

This project uses the following dependencies :

- `@astrojs/node` for the server-side rendering
- `@prisma/client` for the database
- `@types/google.maps` for the Google Maps API
- `astro` for the client-side rendering
- `pokemontcgsdk` for the Pokemon TCG API
- `prisma` for managing the database

## Project structure

The project is structured as follows :

```shell
/api : The main folder of the api
  /prisma : The prisma configuration
  /resources : The scripts and JSON files used to load the database
  /src : The source code of the api
    /pages : The endpoints of the api
/public : The public folder of the client
/src : The source code of the client
  /components : The components of the website
  /fonts : The fonts of the website
  /pages : The pages of the website
  /srcappers : The files of the scrapers
  /styles : The styles of the website
  /utils : The utilities of the client
```

## Database

The database is structured as follows :

![Database schema](https://imgur.com/15X86Fv.png)

## API

The API structure can be found in the `/pokestore-spec.yaml` file.

## License

This project is licensed under the GNU GPLv3 license. You can find the license in the `LICENSE` file.
