# PokéStore

PokéStore is a web application built with SvelteKit and Supabase that allows you to browse and manage your Pokémon Trading Card Game (TCG) collection.

## Features

*   **User Authentication:** Sign up and log in to manage your personal collection.
*   **Card Browser:** Search and view Pokémon TCG cards.
*   **Collection Management:** Keep track of the cards you own.
*   **Wishlist:** Maintain a list of cards you want to acquire.
*   **Profile & Settings:** Manage your user profile and application settings.
*   **Data Scraping:** Built-in CLI tool to fetch the latest Pokémon TCG data.

## Tech Stack

*   **Framework:** [SvelteKit](https://kit.svelte.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Database & Auth:** [Supabase](https://supabase.io/)
*   **Icons:** [Lucide Icons](https://lucide.dev/)
*   **Deployment:** [Cloudflare Pages/Workers](https://workers.cloudflare.com/) (via `@sveltejs/adapter-cloudflare`)
*   **Scraper CLI:** [tsx](https://github.com/esbuild-kit/tsx), [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js/tree/master/packages/prompts)
*   **Package Manager:** [pnpm](https://pnpm.io/)

## Getting Started

Follow these steps to set up the project locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Ayfri/PokeStore.git
    cd PokeStore
    ```

2.  **Install dependencies:**
    Make sure you have [pnpm](https://pnpm.io/installation) installed.
    ```bash
    pnpm install
    ```

3.  **Set up Supabase:**
    *   Create a new project on [Supabase](https://supabase.io/).
    *   In your Supabase project dashboard, go to the SQL Editor.
    *   Copy the contents of `supabase-schema.sql` from this repository and run it to create the initial database tables.
    *   (Optional) If needed, run the contents of `supabase-schema-update.sql` for subsequent updates.
    *   Navigate to Project Settings > API.
    *   Find your Project URL and `anon` public key.

4.  **Set up Pokémon TCG API Key:**
    *   Get an API key from the [Pokemon TCG API](https://pokemontcg.io/).

5.  **Configure Environment Variables:**
    *   Create a `.env` file in the root of the project by copying `.env.example`.
    *   Fill in the required variables:
        ```dotenv
        # Supabase Configuration
        VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY

        # Pokemon TCG API Key
        POKEMON_TCG_API_KEY=YOUR_POKEMON_TCG_API_KEY

        # CDN URL for card images (optional) without trailing slash
        # If not provided, original API URLs will be used
        # Format: https://your-cdn.com/path
        PUBLIC_CARD_CDN_URL=
        ```

6.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application should now be running on `http://localhost:5173` (or the next available port).

## Data Scraping

The project includes an interactive CLI tool to fetch and update various Pokémon TCG data required for the application.

**Run the Scraper CLI:**

```bash
pnpm scrapers
```

This command will present a menu allowing you to choose which scraper to run. Available options include:

*   **`all`**: Run all data scrapers sequentially (pokemons, sets, cards, holo, foil, types). Does *not* download images.
*   **`cards`**: Fetch all Pokémon cards from the TCG API.
*   **`download-images`**: Download card images based on the fetched card data (requires `cards` to be run first). Images are typically saved to an `images/` directory (check `src/scrappers/download_images.ts` for specifics).
*   **`foil`**: Generate foil mask URLs for holographic cards (requires `holo` data).
*   **`holo`**: Extract holographic cards from the main card dataset (requires `cards` data).
*   **`pokemons`**: Fetch base Pokémon data from PokéAPI.
*   **`sets`**: Fetch all card set information from the TCG API.
*   **`types`**: Extract unique Pokémon types from the card dataset (requires `cards` data).

**Recommended Scraper Order:**

For initial setup or a full data refresh, it's generally recommended to run the scrapers in an order that respects dependencies:

1.  `pokemons`
2.  `types`
3.  `sets`
4.  `cards`
5.  `holo`
6.  `foil`
7.  `download-images` (Optional, run if you need local images)

You can run `all` to execute steps 1-6 automatically.

### Using a Custom CDN for Images

After running the `download-images` scraper, you will have local copies of the card images. If you host these images on your own CDN or file server:

1.  Upload the contents of the `images` directory to your CDN.
2.  Set the `PUBLIC_CARD_CDN_URL` environment variable in your `.env` file to the base URL of your hosted images.
    Example: `PUBLIC_CARD_CDN_URL=https://cdn.example.com/pokemon-cards`
3.  The application will automatically construct image URLs like `https://cdn.example.com/pokemon-cards/{setCode}/{cardId}.png`.

## Scripts

*   `pnpm dev`: Starts the development server.
*   `pnpm build`: Builds the application for production (outputs to `.svelte-kit/cloudflare`).
*   `pnpm preview`: Runs a local preview of the production build.
*   `pnpm scrapers`: Runs the interactive data scraping CLI.

## Project Structure

```
.
├── .svelte-kit/        # Build output and internal SvelteKit files
├── node_modules/       # Project dependencies
├── src/
│   ├── assets/         # Static assets (e.g., scraped JSON data)
│   ├── lib/            # Svelte components, utilities, Supabase client, etc.
│   │   ├── components/ # Reusable Svelte components
│   │   ├── helpers/    # Utility functions
│   │   ├── services/   # Data fetching or business logic services
│   │   ├── stores/     # Svelte stores
│   │   └── supabase.ts # Supabase client initialization
│   ├── routes/         # Application pages and API endpoints
│   ├── scrappers/      # Data scraping scripts
│   ├── styles/         # Global styles
│   ├── app.css         # Main CSS file (often imports Tailwind)
│   ├── app.d.ts        # Ambient TypeScript declarations for SvelteKit
│   ├── app.html        # Main HTML template
│   └── constants.ts    # Application constants
├── static/             # Static files (favicon, etc.)
├── .env                # Local environment variables (ignored by Git)
├── .env.example        # Example environment variables
├── .gitignore          # Git ignore rules
├── package.json        # Project metadata and dependencies
├── pnpm-lock.yaml      # PNPM lock file
├── svelte.config.js    # SvelteKit configuration
├── supabase-schema.sql # Initial Supabase database schema
├── supabase-schema-update.sql # Database schema updates (if any)
├── tailwind.config.mjs # Tailwind CSS configuration
├── tsconfig.json       # TypeScript configuration
├── scrapper-cli.ts     # Entry point for the data scraper CLI
└── vite.config.ts      # Vite configuration
```

## License

This project is licensed under the GNU GPLv3 License. See the `LICENSE` file for details.
