# Betrayal at House on the Hill - Multiplayer

山中小屋的背叛 - 多人連線版

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm

### Install Dependencies

```bash
pnpm install
```

### Run Local Development Server

```bash
pnpm dev
```

The server will start on **http://localhost:3010**

### Access the App

- **Home:** http://localhost:3010/betrayal/
- **Gallery:** http://localhost:3010/betrayal/gallery
- **Cards:** http://localhost:3010/betrayal/gallery/cards
- **Rooms:** http://localhost:3010/betrayal/gallery/rooms
- **Characters:** http://localhost:3010/betrayal/gallery/characters
- **Solo Game:** http://localhost:3010/betrayal/solo

## Project Structure

```
.
├── apps/
│   └── web/              # Next.js web application
├── packages/
│   ├── game-engine/      # Game logic and state management
│   ├── shared/           # Shared types and data
│   └── ui/               # UI components
├── shared-data/          # Game assets (rooms, characters, cards)
│   ├── agents/           # AI agent configurations
│   ├── cards/            # Event, Item, Omen cards
│   ├── characters/       # Character data
│   ├── rooms/            # Room SVGs and data
│   ├── rulebook/         # Game rules
│   └── templates/        # Templates for agents
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Development

### Tech Stack

- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **Package Manager:** pnpm
- **Monorepo:** Turborepo

### Available Scripts

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

### Base Path

The app is configured with `basePath: '/betrayal'` for Cloudflare Tunnel compatibility. All routes are prefixed with `/betrayal/`.

## Game Features

- 🎮 Solo mode with AI
- 🎨 Interactive gallery (rooms, characters, cards)
- 🏠 46 unique rooms with SVG graphics
- 👥 6 playable characters
- 🎲 Event, Item, and Omen cards

## Agent Development

This project uses a 6-agent team structure:

| Agent | Role | Discord Channel | Channel ID |
|-------|------|-----------------|------------|
| Agent 0 | Orchestrator / Producer | #orchestrator | 1484939675935314051 |
| Agent 1 | Core Architect / State | #architecture | 1484939726791250100 |
| Agent 2 | Rules Engine / Gameplay | #rule-engine | 1484939899252768779 |
| Agent 3 | Frontend / UX | #frontend | 1484940096301039688 |
| Agent 4 | AI Player | #ai-player | 1484939943062012116 |
| Agent 5 | Rule QA / Test Judge | #rule-qa | 1484939989820112906 |

See `shared-data/agents/` for agent configurations.

## License

MIT
