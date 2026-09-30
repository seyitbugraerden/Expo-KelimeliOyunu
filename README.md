<div align="center">

# 🔤 Kelime

### Turkish mobile word game built with Expo, React Native and Node.js

A Scrabble-inspired Turkish word game featuring **15×15 board gameplay, TDK-backed word validation, computer opponent, multiplayer invitations and server-side game rules**.

<br />

![Expo](https://img.shields.io/badge/Expo-57-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

</div>

---

## About the Project

**Kelime** is a Turkish mobile word game built with **Expo**, **React Native**, **TypeScript**, and a custom **Node.js game server**.

The application supports both:

- Player vs computer
- Player vs player

game modes.

It includes a 15×15 board, Turkish letter tiles, score multipliers, wildcard tiles, server-side rule validation and online dictionary checks through the **TDK Güncel Türkçe Sözlük API**.

---

## Main Features

### Gameplay

- 15×15 word board
- Turkish alphabet tiles
- Maximum 7 tiles per rack
- Drag-and-drop tile placement
- Tap-to-place interaction
- Zoomable and pannable board
- Live move preview
- Word score preview
- Cross-word detection
- Blank / wildcard tiles
- Letter bonus squares
- Word bonus squares
- 7-tile bonus

### Game Modes

- Play against computer
- Invite another player
- Accept pending invitations
- Turn-based gameplay
- Automatic state synchronization
- Game history and recent moves

### Validation

- TDK dictionary validation
- Local Turkish dictionary
- Invalid move rollback
- Turn validation
- Board continuity validation
- Revision/version control
- Rack ownership validation

---

## Tech Stack

| Technology | Purpose |
| --- | --- |
| **Expo SDK 57** | Mobile application framework |
| **React Native 0.86** | Native UI |
| **React 19.2** | UI architecture |
| **TypeScript 6** | Type safety |
| **React Native Gesture Handler** | Drag and gesture interaction |
| **React Native Reanimated 4** | Board/tile animations |
| **React Native Worklets** | High-performance interaction |
| **Expo Secure Store** | Local session token storage |
| **Node.js HTTP** | Game API server |
| **TDK API** | Turkish word validation |
| **Node Test Runner** | Automated tests |
| **GitHub Actions** | CI validation |

---

## Application Architecture

```text id="kw001"
                Mobile Client
                    │
                    │ HTTP API
                    ▼
               Node.js Server
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
   Game Engine   Dictionary   Bot Engine
        │           │           │
        │           ▼           │
        │       Local Words     │
        │           │           │
        │           ▼           │
        │        TDK API        │
        │                       │
        └───────────┬───────────┘
                    ▼
                Game State
```

---

## Mobile Client

The mobile application lives mainly in:

```text id="kw002"
src/GameApp.tsx
```

and manages:

- Session restore
- Player profile
- Invitations
- Game selection
- Board interactions
- Tile placement
- Move preview
- Server synchronization

---

## Session Storage

The client stores its session token using:

```text id="kw003"
expo-secure-store
```

under:

```text id="kw004"
kelime-session
```

This avoids keeping the authentication token in plain AsyncStorage.

---

## API Configuration

The mobile app reads:

```text id="kw005"
EXPO_PUBLIC_API_URL
```

from the environment.

Example:

```env id="kw006"
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
```

---

## Multiplayer Flow

### Create Player

```text id="kw007"
User
 ↓
Create profile
 ↓
Server returns token
 ↓
SecureStore
```

### Invite Friend

```text id="kw008"
Player A
   │
   │ Friend ID
   ▼
Invitation
   │
   ▼
Player B
   │
   ▼
Accept
   │
   ▼
Active Game
```

The player who sends the invitation takes the first turn.

---

## Computer Opponent

The repository includes a real bot engine:

```text id="kw009"
server/bot.mjs
```

The computer:

- Uses its own tile rack
- Searches candidate Turkish words
- Tries horizontal and vertical placements
- Connects to existing board tiles
- Validates resulting words
- Scores candidate moves
- Chooses the best available move
- Passes if no valid move is found

---

## Bot Strategy

The bot searches a curated Turkish vocabulary and evaluates potential placements.

```text id="kw010"
Candidate Words
      │
      ▼
Possible Board Positions
      │
      ▼
Rack Validation
      │
      ▼
Cross-word Validation
      │
      ▼
Score Calculation
      │
      ▼
TDK Validation
      │
      ▼
Best Move
```

The current bot is intentionally designed as a beginner-level opponent rather than a full exhaustive tournament AI.

---

## Board

The board consists of:

```text id="kw011"
15 × 15
=
225 cells
```

The first move must cross the center square.

---

## First Move Rules

The opening word:

- Must contain at least two letters
- Must pass through the center
- Must form a valid Turkish word

---

## Subsequent Move Rules

Later moves must:

- Connect to existing board tiles
- Be placed on a single row or column
- Contain no gaps
- Produce valid horizontal and vertical words
- Use only letters available in the player's rack

---

## Scoring

The game supports standard board multipliers:

```text id="kw012"
2L → Double Letter
3L → Triple Letter
2W → Double Word
3W → Triple Word
```

---

## Premium Squares

The board currently contains:

```text id="kw013"
3W: 8
2W: 17
3L: 12
2L: 24
```

Premium squares only affect newly placed tiles.

---

## Letter Scores

Letter scoring is defined in the game engine.

Examples:

```text id="kw014"
A → 1
E → 1
İ → 1
K → 1

Ç → 4
Ğ → 4
J → 4
Ö → 4
Ş → 4
Ü → 4
Z → 4
```

Other letters use intermediate values.

---

## Blank Tiles

Wildcard tiles are represented as:

```text id="kw015"
*
```

A blank:

- Can represent any Turkish letter
- Scores 0 points
- Is tracked separately on the board
- Remains identified as a blank in word history

---

## Seven-Tile Bonus

Using all seven rack tiles in one move awards:

```text id="kw016"
+50 points
```

---

## Move Preview

Before a move is committed, the client sends placements to:

```text id="kw017"
/preview
```

The server calculates:

- Formed words
- Score
- Bonus
- Validity

without mutating the game state.

---

## Preview Flow

```text id="kw018"
Placed Tiles
   │
   ▼
/preview
   │
   ▼
Temporary Game Clone
   │
   ▼
Rule Validation
   │
   ▼
TDK Validation
   │
   ▼
Score Preview
```

---

## Word Validation

The project uses two dictionary layers.

### Local Dictionary

```text id="kw019"
server/dictionary/master-dictionary.dict
```

is used for fast local candidate validation.

The dictionary filters out:

- Proper names
- Abbreviations
- Punctuation
- Unsupported entries

---

## TDK Validation

Final played words are checked against:

```text id="kw020"
TDK Güncel Türkçe Sözlük
```

through:

```text id="kw021"
https://sozluk.gov.tr/gts
```

The server checks that:

- The entry exists
- The headword matches
- The word is not marked as a proper noun

---

## TDK Caching

Dictionary requests are cached in-memory:

```text id="kw022"
Map()
```

to avoid repeatedly requesting the same word.

Failed requests are removed from cache so they can be retried later.

---

## Dictionary Failure Behavior

If the TDK service cannot be reached:

```text id="kw023"
Move rejected
```

instead of accepting an unverified word.

This keeps server-side validation conservative.

---

## Game Server

The game backend runs through:

```text id="kw024"
server/index.mjs
```

using Node.js' built-in HTTP server.

The backend manages:

- Players
- Tokens
- Invitations
- Games
- Turns
- Racks
- Scores
- Board state
- Move validation
- Computer turns

---

## API Endpoints

The current server supports flows around:

```text id="kw025"
/users
/state
/invite
/accept
/computer
/preview
/move
```

---

## Authentication

Requests use:

```text id="kw026"
Authorization: Bearer <token>
```

Tokens are generated when a player profile is created.

Protected endpoints reject unauthenticated requests.

---

## Privacy Between Players

The server does not expose the opponent's rack.

API responses intentionally omit:

```text id="kw027"
game.racks
game.bag
player tokens
```

from public game state.

This prevents one player from inspecting the other's hidden tiles.

---

## State Synchronization

The mobile client refreshes game state approximately every:

```text id="kw028"
2.5 seconds
```

while authenticated.

This keeps multiplayer games synchronized without requiring WebSockets.

---

## Request Timeout

Mobile API requests use an approximate timeout of:

```text id="kw029"
10 seconds
```

through `AbortController`.

---

## Concurrency Protection

The game uses:

```text id="kw030"
revision
```

numbers to reject stale moves.

A move submitted against an outdated revision does not modify the game.

This prevents two clients from applying conflicting state changes.

---

## End of Game

A game finishes when:

- Four consecutive passes occur, or
- A player's rack becomes empty

The current prototype does not apply remaining-tile score deductions at game end.

---

## Game Board Interaction

The mobile board supports:

- Drag-and-drop
- Tap placement
- Pan
- Zoom
- Dynamic cell detection
- Tile placement preview

Board interaction logic is separated into:

```text id="kw031"
src/components/GameBoard.tsx
src/components/boardGeometry.ts
```

---

## Board Geometry

Coordinate conversion is tested across:

```text id="kw032"
Phone sizes
Tablet sizes
Zoom levels
Pan offsets
```

The test suite verifies all:

```text id="kw033"
225 board cells
```

across multiple viewport widths.

---

## Expo Configuration

Application name:

```text id="kw034"
Kelime
```

Orientation:

```text id="kw035"
Portrait
```

The application includes:

- App icon
- Splash icon
- Android adaptive icon
- Monochrome icon
- Web favicon

---

## Supported Platforms

The current project targets:

```text id="kw036"
iOS
Android
```

A web configuration exists through Expo, but the repository documentation does not treat the web version as a supported production target.

---

## Getting Started

Clone the repository:

```bash id="kw037"
git clone https://github.com/seyitbugraerden/expo-kelimelioyunu.git
```

Navigate into the project:

```bash id="kw038"
cd expo-kelimelioyunu
```

Install dependencies:

```bash id="kw039"
npm install
```

---

## Start the Game Server

Run:

```bash id="kw040"
npm run server
```

The API server uses port:

```text id="kw041"
3001
```

by default.

---

## Configure Environment

Copy:

```bash id="kw042"
cp .env.example .env
```

Then update:

```env id="kw043"
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3001
```

---

## Device Configuration

### Physical Device

Use your computer's LAN address:

```text id="kw044"
http://192.168.x.x:3001
```

The mobile device and computer must be on the same network.

### iOS Simulator

```text id="kw045"
http://localhost:3001
```

### Android Emulator

```text id="kw046"
http://10.0.2.2:3001
```

---

## Start Expo

```bash id="kw047"
npm start
```

or:

```bash id="kw048"
npm run ios
```

```bash id="kw049"
npm run android
```

---

## Available Scripts

### Start Expo

```bash id="kw050"
npm start
```

### Android

```bash id="kw051"
npm run android
```

### iOS

```bash id="kw052"
npm run ios
```

### Web

```bash id="kw053"
npm run web
```

### Game Server

```bash id="kw054"
npm run server
```

### Lint

```bash id="kw055"
npm run lint
```

### Type Check

```bash id="kw056"
npm run typecheck
```

### Tests

```bash id="kw057"
npm test
```

---

## Testing

The repository contains tests for:

- Game rules
- Bot logic
- API authorization
- Dictionary handling
- TDK integration
- Board geometry

---

## Game Rule Tests

The test suite verifies:

- Opening center bonus
- Premium square count
- Turkish dotted/dotless I scoring
- Bonus behavior
- Wildcard scoring
- Invalid move rollback
- Turn protection
- Connectivity rules
- Consecutive pass game ending

---

## Bot Tests

Bot tests verify that the computer:

- Finds opening moves
- Uses the center
- Does not mutate game during move search
- Connects to existing words
- Uses only its own rack
- Passes when no move exists
- Stops after the game ends

---

## API Tests

Integration tests cover:

- User creation
- Authorization
- Computer games
- Invitations
- Invitation acceptance
- Move permissions
- Private racks
- TDK rejection
- Wildcard moves
- Preview behavior
- State synchronization

---

## CI

The repository includes:

```text id="kw058"
.github/workflows/ci.yml
```

GitHub Actions runs:

```text id="kw059"
npm ci
npm run lint
npm run typecheck
npm test
node --test tests/boardGeometry.test.mjs
```

on pushes and pull requests.

---

## Project Structure

```text id="kw060"
expo-kelimelioyunu/
│
├── src/
│   ├── GameApp.tsx
│   │
│   └── components/
│       ├── GameBoard.tsx
│       ├── RackTile.tsx
│       └── boardGeometry.ts
│
├── server/
│   ├── dictionary/
│   │   └── master-dictionary.dict
│   │
│   ├── index.mjs
│   ├── game.mjs
│   ├── bot.mjs
│   ├── dictionary.mjs
│   ├── tdk.mjs
│   ├── api.test.mjs
│   ├── bot.test.mjs
│   ├── dictionary.test.mjs
│   ├── game.test.mjs
│   └── tdk.test.mjs
│
├── tests/
│   └── boardGeometry.test.mjs
│
├── assets/
│   ├── icon.png
│   ├── splash-icon.png
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   └── android-icon-monochrome.png
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── App.tsx
├── index.ts
├── app.json
├── package.json
└── tsconfig.json
```

---

## Current Development Status

### Implemented

- Expo mobile application
- 15×15 board
- Drag-and-drop tiles
- Zoom and pan
- Turkish tile set
- Player profiles
- Secure session storage
- Friend invitations
- Turn-based multiplayer
- Computer opponent
- Move preview
- Scoring engine
- Bonus squares
- Wildcard tiles
- TDK validation
- Local dictionary
- Revision-based concurrency protection
- Game state persistence
- Automated tests
- GitHub Actions CI

### Potential Improvements

- Replace JSON file persistence with database
- Add WebSocket synchronization
- Add production authentication
- Add password/account recovery
- Add rate limiting
- Add HTTPS deployment
- Add player statistics
- Add rankings / leaderboard
- Add rematch flow
- Add tile exchange
- Add chat
- Add reconnect/offline strategy
- Add push notifications
- Add stronger bot difficulty levels
- Add App Store / Play Store release configuration
- Add full end-game tile deduction rules
- Add observability and server logging

---

## Production Considerations

The current backend stores game state locally rather than in a production database.

For internet-facing deployment, recommended additions include:

```text id="kw061"
Database
HTTPS
Rate Limiting
Authentication Hardening
Account Recovery
Server Monitoring
Abuse Protection
```

---

## Dictionary Notes

The local dictionary is used primarily for:

```text id="kw062"
Bot candidate generation
Local filtering
```

Final player moves rely on TDK validation.

The project does not claim full compatibility with tournament word-game dictionaries or every inflected Turkish word form.

---

## Technical Highlights

The project demonstrates:

- React Native application architecture
- Expo development
- Gesture-heavy mobile UI
- Drag/drop board interaction
- Game-state modelling
- Turn-based multiplayer
- Server-side rule enforcement
- Optimistic move preview
- Concurrency/version protection
- Secure mobile storage
- Turkish language normalization
- External dictionary integration
- Bot search logic
- Automated unit/integration tests
- CI workflows

---

## Developer

<div align="center">

### Seyit Buğra Erden

**Full Stack Developer · Software Engineer**

[GitHub](https://github.com/seyitbugraerden) ·
[LinkedIn](https://www.linkedin.com/in/sbugraerden/)

<br />

Built with **Expo · React Native · TypeScript · Node.js**

</div>
