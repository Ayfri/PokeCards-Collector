<div align="center">
  <img src="./src/assets/pokecards-collector.png" alt="PokéCards-Collector Logo" width="150"/>

  # PokéCards-Collector

  [![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
  [![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white)](https://kit.svelte.dev/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=flat&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
  [![PNPM](https://img.shields.io/badge/PNPM-F69220?style=flat&logo=pnpm&logoColor=white)](https://pnpm.io/)

  <p>A modern web application for managing your Pokémon Trading Card Game collection</p>
</div>

## 📋 Overview

PokéCards-Collector is a comprehensive web application built with SvelteKit and Supabase that allows you to browse and manage your Pokémon Trading Card Game (TCG) collection with ease.

### 📸 Website

Check out the live website [here](https://pokecards-collector.pages.dev).

![Demo Screenshot](./pokecards-collector.png)

## ✨ Features

<table>
  <tr>
    <td>🔐</td>
    <td><b>User Authentication</b></td>
    <td>Sign up and log in to manage your personal collection.</td>
  </tr>
  <tr>
    <td>🔍</td>
    <td><b>Card Browser</b></td>
    <td>Search and view Pokémon TCG cards with advanced filtering options.</td>
  </tr>
  <tr>
    <td>📚</td>
    <td><b>Collection Management</b></td>
    <td>Keep track of the cards you own with quantity and condition tracking.</td>
  </tr>
  <tr>
    <td>⭐</td>
    <td><b>Wishlist</b></td>
    <td>Maintain a list of cards you want to acquire.</td>
  </tr>
  <tr>
    <td>👤</td>
    <td><b>Profile & Settings</b></td>
    <td>Manage your user profile and application settings.</td>
  </tr>
  <tr>
    <td>🤖</td>
    <td><b>Data Scraping</b></td>
    <td>Built-in CLI tool to fetch the latest Pokémon TCG data.</td>
  </tr>
</table>

## 🛠️ Tech Stack

<table>
  <tr>
    <th>Category</th>
    <th>Technologies</th>
  </tr>
  <tr>
    <td>Frontend</td>
    <td>
      <a href="https://kit.svelte.dev/"><img src="https://img.shields.io/badge/SvelteKit-FF3E00?style=flat&logo=svelte&logoColor=white" alt="SvelteKit"/></a>
      <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript"/></a>
      <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/></a>
      <a href="https://lucide.dev/"><img src="https://img.shields.io/badge/Lucide_Icons-5468FF?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3ggMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KICA8cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9IndoaXRlIi8+DQogIDxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTIgMTkuNUg4QzcuMTcxNTcgMTkuNSA2LjUgMTguODI4NCA2LjUgMThWMTNDNi41IDEyLjE3MTYgNy4xNzE1NyAxMS41IDggMTEuNUgxMkMxMi44Mjg0IDExLjUgMTMuNSAxMi4xNzE2IDEzLjUgMTNWMThDMTMuNSAxOC44Mjg0IDEyLjgyODQgMTkuNSAxMiAxOS41WiIgZmlsbD0iIzU0NjhGRiIvPg0KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTQgNy41VjE2QzIuMzQzMTUgMTYgMSAxNC42NTY5IDEgMTNWMTAuNUMxIDguODQzMTUgMi4zNDMxNSA3LjUgNCA3LjVaIiBmaWxsPSIjNTQ2OEZGIi8+DQogIDxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMjAgNy41VjE2QzIxLjY1NjkgMTYgMjMgMTQuNjU2OSAyMyAxM1YxMC41QzIzIDguODQzMTUgMjEuNjU2OSA3LjUgMjAgNy41WiIgZmlsbD0iIzU0NjhGRiIvPg0KICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTExLjUgNkMxMS41IDYuODI4NDMgMTIuMTcxNiA3LjUgMTMgNy41SDE3QzE3LjgyODQgNy41IDE4LjUgNi44Mjg0MyAxOC41IDZDMTGUNTE1LjE3MTYgMTcuNSAxNC41IDE3IDE0LjVDMTcgMTQuNSAxNi41IDEzLjgyODQgMTYuNSAxM0MxNi41IDEyLjE3MTYgMTYuMTU2OSAxMS41IDE1LjUgMTEuNUMxNC44NDMxIDExLjUgMTQuNSAxMi4xNzE2IDE0LjUgMTNDMTQuNSAxMy44Mjg0IDEzLjgyODQgMTQuNSAxMyAxNC41QzEyLjE3MTYgMTQuNSAxMS41IDEzLjgyODQgMTEuNSAxM0MxMS41IDEyLjE3MTYgMTEuMTU2OSAxMS41IDEwLjUgMTEuNUM5Ljg0MzE1IDExLjUgOS41IDEyLjE3MTYgOS41IDEzQzkuNSAxMy44Mjg0IDguODI4NDMgMTQuNSA4IDE0LjVDNy4xNzE1NyAxNC41IDYuNSAxMy44Mjg0IDYuNSAxM0M2LjUgMTIuMTcxNiA1Ljg0MzE1IDExLjUgNSAxMS41QzQuMTU2ODUgMTEuNSAzLjUgMTIuMTcxNiAzLjUgMTNDMy41IDEzLjgyODQgNC4xNzE1NyAxNC41IDUgMTQuNUM0IDE0LjUgMy41IDE1LjE3MTYgMy41IDE2QzMuNSAxNi44Mjg0IDQuMTcxNTcgMTcuNSA1IDE3LjVDNS44Mjg0MyAxNy41IDYuNSAxNi44Mjg0IDYuNSAxNkM2LjUgMTUuMTcxNiA3LjE3MTU3IDE0LjUgOCAxNC41QzguODI4NDMgMTQuNSA5LjUgMTUuMTcxNiA5LjUgMTZDOS41IDE2LjgyODQgMTAuMTcxNiAxNy41IDExIDE3LjVIMTJDMTEgMTcuNSAxMC41IDE2LjgyODQgMTAuNSAxNkMxMC41IDE1LjE3MTYgOS44Mjg0MyAxNC41IDkgMTQuNUM4LjE3MTU3IDE0LjUgNy41IDE1LjE3MTYgNy41IDE2QzcuNSAxNi44Mjg0IDYuODI4NDMgMTcuNSA2IDE3LjVDNS4xNzE1NyAxNy41IDQuNSAxNi44Mjg0IDQuNSAxNkM0LjUgMTUuMTcxNiA0LjE1Njg1IDE0LjUgMy41IDE0LjVDMi44NDMxNSAxNC41IDIuNSAxNS4xNzE2IDIuNSAxNkMyLjUgMTYuODI4NCAzLjE3MTU3IDE3LjUgNCAxNy41QzMgMTcuNSAyLjUgMTguMTcxNiAyLjUgMTlDMi41IDE5LjgyODQgMy4xNzE1NyAyMC41IDQgMjAuNUM0LjgyODQzIDIwLjUgNS41IDE5LjgyODQgNS41IDE5QzUuNSAxOC4xNzE2IDYuMTcxNTcgMTcuNSA3IDE3LjVDNy44Mjg0MyAxNy41IDguNSAxOC4xNzE2IDguNSAxOUM4LjUgMTkuODI4NCA5LjE3MTU3IDIwLjUgMTAgMjAuNUgxNEMxNC44Mjg0IDIwLjUgMTUuNSAxOS44Mjg0IDE1LjUgMTlDMTUuNSAxOC4xNzE2IDE2LjE3MTYgMTcuNSAxNyAxNy41QzE3LjgyODQgMTcuNSAxOC41IDE4LjE3MTYgMTguNSAxOUMxOC41IDE5LjgyODQgMTkuMTcxNiAyMC41IDIwIDIwLjVDMjAuODI4NCAyMC41IDIxLjUgMTkuODI4NCAyMS41IDE5QzIxLjUgMTguMTcxNiAyMC44Mjg0IDE3LjUgMjAgMTcuNUMyMSAxNy41IDIxLjUgMTYuODI4NCAyMS41IDE2QzIxLjUgMTUuMTcxNiAyMC44Mjg0IDE0LjUgMjAgMTQuNUMxOS4xNzE2IDE0LjUgMTguNSAxNS4xNzE2IDE4LjUgMTZDMTguNSAxNi44Mjg0IDE3LjgyODQgMTcuNSAxNyAxNy41QzE2LjE3MTYgMTcuNSAxNS41IDE2LjgyODQgMTUuNSAxNkMxNS41IDE1LjE3MTYgMTQuODI4NCAxNC41IDE0IDE0LjVDMTMuMTcxNiAxNC41IDEyLjUgMTUuMTcxNiAxMi41IDE2QzEyLjUgMTYuODI4NCAxMy4xNzE2IDE3LjUgMTQgMTcuNUgxM0MxNCAxNy41IDE0LjUgMTYuODI4NCAxNC41IDE2QzE0LjUgMTUuMTcxNiAxNS4xNzE2IDE0LjUgMTYgMTQuNUMxNi44Mjg0IDE0LjUgMTcuNSAxNS4xNzE2IDE3LjUgMTZDMTcuNSAxNi44Mjg0IDE4LjE3MTYgMTcuNSAxOSAxNy41QzE5LjgyODQgMTcuNSAyMC41IDE2LjgyODQgMjAuNSAxNkMyMC41IDE1LjE3MTYgMjEuMTcxNiAxNC41IDIyIDE0LjVDMjIuODI4NCAxNC41IDIzLjUgMTMuODI4NCAyMy41IDEzQzIzLjUgMTIuMTcxNiAyMi44Mjg0IDExLjUgMjIgMTEuNUMyMS4xNzE2IDExLjUgMjAuNSAxMi4xNzE2IDIwLjUgMTNDMjAuNSAxMy44Mjg0IDE5LjgyODQgMTQuNSAxOSAxNC41QzE4LjE3MTYgMTQuNSAxNy41IDEzLjgyODQgMTcuNSAxM0MxNy41IDEyLjE3MTYgMTYuODI4NCAxMS41IDE2IDExLjVDMTUuMTcxNiAxMS41IDE0LjUgMTAuODI4NCAxNC41IDEwQzE0LjUgOS4xNzE1NyAxMy44Mjg0IDguNSAxMyA4LjVDMTIuMTcxNiA4LjUgMTEuNSA3LjgyODQzIDExLjUgN1Y2WiIgZmlsbD0iIzU0NjhGRiIvPg0KPC9zdmc+" alt="Lucide Icons"/></a>
    </td>
  </tr>
  <tr>
    <td>Backend</td>
    <td>
      <a href="https://supabase.io/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white" alt="Supabase"/></a>
      <a href="https://pokemontcg.io/"><img src="https://img.shields.io/badge/Pokémon_TCG_API-FFCB05?style=flat&logo=pokemon&logoColor=black" alt="Pokémon TCG API"/></a>
    </td>
  </tr>
  <tr>
    <td>Deployment</td>
    <td>
      <a href="https://pages.cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare_Pages-F38020?style=flat&logo=cloudflare&logoColor=white" alt="Cloudflare Pages"/></a>
    </td>
  </tr>
  <tr>
    <td>Tools</td>
    <td>
      <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/PNPM-F69220?style=flat&logo=pnpm&logoColor=white" alt="PNPM"/></a>
      <a href="https://github.com/esbuild-kit/tsx"><img src="https://img.shields.io/badge/TSX-3178C6?style=flat&logo=typescript&logoColor=white" alt="TSX"/></a>
      <a href="https://github.com/SBoudrias/Inquirer.js/tree/master/packages/prompts"><img src="https://img.shields.io/badge/Inquirer-FFCF00?style=flat&logo=javascript&logoColor=black" alt="Inquirer"/></a>
    </td>
  </tr>
</table>

## 🚀 Getting Started

<details>
<summary><b>Prerequisites</b></summary>

- [Node.js](https://nodejs.org/) (v18 or higher)
- [PNPM](https://pnpm.io/installation) package manager
- A [Supabase](https://supabase.io/) account
- A [Pokémon TCG API](https://pokemontcg.io/) key
</details>

<details open>
<summary><b>Installation</b></summary>

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Ayfri/PokeCards-Collector.git
    cd PokeCards-Collector
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up Supabase:**
    - Create a new project on [Supabase](https://supabase.io/)
    - In your Supabase project dashboard, go to the SQL Editor
    - Copy the contents of `supabase-schema.sql` from this repository and run it to create the initial database tables
    - (Optional) If needed, run the contents of `supabase-schema-update.sql` for subsequent updates
    - Navigate to Project Settings > API
    - Find your Project URL and `anon` public key

4.  **Set up Pokémon TCG API Key:**
    - Get an API key from the [Pokemon TCG API](https://pokemontcg.io/)

5.  **Configure Environment Variables:**
    - Create a `.env` file in the root of the project by copying `.env.example`
    - Fill in the required variables:
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
</details>

## 📊 Data Scraping

The project includes an interactive CLI tool to fetch and update various Pokémon TCG data required for the application.

<details>
<summary><b>Running the Scraper CLI</b></summary>

```bash
pnpm scrapers
```

This command will present a menu allowing you to choose which scraper to run. Available options include:

<table>
  <tr>
    <th>Option</th>
    <th>Description</th>
    <th>Dependencies</th>
  </tr>
  <tr>
    <td><code>all</code></td>
    <td>Run all data scrapers sequentially (pokemons, sets, cards, holo, foil, types). Does <i>not</i> download images.</td>
    <td>None</td>
  </tr>
  <tr>
    <td><code>cards</code></td>
    <td>Fetch all Pokémon cards from the TCG API.</td>
    <td>None</td>
  </tr>
  <tr>
    <td><code>download-images</code></td>
    <td>Download card images based on the fetched card data.</td>
    <td>Requires <code>cards</code> to be run first</td>
  </tr>
  <tr>
    <td><code>foil</code></td>
    <td>Generate foil mask URLs for holographic cards.</td>
    <td>Requires <code>holo</code> data</td>
  </tr>
  <tr>
    <td><code>holo</code></td>
    <td>Extract holographic cards from the main card dataset.</td>
    <td>Requires <code>cards</code> data</td>
  </tr>
  <tr>
    <td><code>pokemons</code></td>
    <td>Fetch base Pokémon data from PokéAPI.</td>
    <td>None</td>
  </tr>
  <tr>
    <td><code>sets</code></td>
    <td>Fetch all card set information from the TCG API.</td>
    <td>None</td>
  </tr>
  <tr>
    <td><code>types</code></td>
    <td>Extract unique Pokémon types from the card dataset.</td>
    <td>Requires <code>cards</code> data</td>
  </tr>
</table>

**Recommended Scraper Order:**

For initial setup or a full data refresh, it's recommended to run the scrapers in this order:

1. `pokemons`
2. `types`
3. `sets`
4. `cards`
5. `holo`
6. `foil`
7. `download-images` (Optional, run if you need local images)

You can run `all` to execute steps 1-6 automatically.
</details>

<details>
<summary><b>Using a Custom CDN for Images</b></summary>

After running the `download-images` scraper, you will have local copies of the card images. If you host these images on your own CDN or file server:

1. Upload the contents of the `images` directory to your CDN
2. Set the `PUBLIC_CARD_CDN_URL` environment variable in your `.env` file to the base URL of your hosted images
   Example: `PUBLIC_CARD_CDN_URL=https://cdn.example.com/pokemon-cards`
3. The application will automatically construct image URLs like `https://cdn.example.com/pokemon-cards/{setCode}/{cardId}.png`
</details>

## 📜 Available Scripts

<table>
  <tr>
    <th>Command</th>
    <th>Description</th>
  </tr>
  <tr>
    <td><code>pnpm dev</code></td>
    <td>Starts the development server</td>
  </tr>
  <tr>
    <td><code>pnpm build</code></td>
    <td>Builds the application for production (outputs to <code>.svelte-kit/cloudflare</code>)</td>
  </tr>
  <tr>
    <td><code>pnpm preview</code></td>
    <td>Runs a local preview of the production build</td>
  </tr>
  <tr>
    <td><code>pnpm scrapers</code></td>
    <td>Runs the interactive data scraping CLI</td>
  </tr>
</table>

## 📁 Project Structure

<details>
<summary><b>View Project Structure</b></summary>

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
</details>

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

<details>
<summary><b>How to Contribute</b></summary>

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
</details>

## 📄 License

This project is licensed under the GNU GPLv3 License - see the [LICENSE](LICENSE) file for details.

<div align="center">
  <br>
  <p>
    <a href="https://github.com/Ayfri/pokecards-collector/issues">Report Bug</a>
    ·
    <a href="https://github.com/Ayfri/pokecards-collector/issues">Request Feature</a>
  </p>
  <p>
    Made with ❤️ by <a href="https://github.com/Ayfri">Ayfri</a>,
    <a href="https://github.com/antaww">Anta</a>,
    <a href="https://github.com/Bahsiik">Bahsiik</a>
  </p>
</div>
