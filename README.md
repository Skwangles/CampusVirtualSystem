# CampusVirtual

CampusVirtual is the dissertation-version implementation of a campus navigation and wayfinding system designed to help users find locations, navigate indoor and outdoor spaces, and interact with campus map data in an intuitive way.

This public repository represents the academic prototype and research foundation of the project. A more advanced version of the system was subsequently developed in a private repository and productised as SiteXplore.com.

## Project Overview

CampusVirtual was developed as a campus-oriented digital mapping and routing solution. The system combines map data, location metadata, and pathfinding logic to provide users with navigational support across a campus environment.

The project is designed around:
- campus map and floorplan support
- point-of-interest and location-group management
- graph-based routing and neighbour discovery
- static image-based map assets
- a backend API for serving map and navigation data

## Why This Project Exists

The goal of the dissertation version was to explore how digital mapping and intelligent navigation could support campus users in locating rooms, facilities, and routes more efficiently. The system was built as a practical research prototype to investigate how campus data could be structured, queried, and traversed in a responsive application.

This version is intentionally a foundation for further development and commercialisation. The private productised iteration evolved into SiteXplore.com, where the system was expanded for broader real-world deployment and product-oriented features.

## Key Features

- Campus map support with floorplan integration
- Location groups and named map regions
- Point-based navigation data
- Graph-style route generation
- Neighbour and proximity search
- Pathfinding logic for route creation
- Image serving for map and floorplan assets
- REST API endpoints for map and location services
- Express-based server architecture
- Frontend UI built with Vite and TypeScript

## System Architecture

The project is structured as a full-stack TypeScript application:

- `src/` contains the backend logic, API routes, controllers, and pathfinding utilities
- `ui/` contains the frontend client
- `Dockerfile` provides containerisation support
- `.env.example` includes environment configuration for the application

The backend exposes API endpoints for:
- retrieving point data
- finding nearby points
- calculating paths between locations
- loading floorplans and map metadata
- serving image assets associated with campus locations

## Technical Stack

- TypeScript
- Node.js
- Express
- PostgreSQL / SQLite-compatible database access patterns
- Vite + React frontend
- Docker
- High-performance pathfinding and graph traversal utilities

## Repository Structure

```text
CampusVirtualSystem/
├── src/
│   ├── controllers/
│   ├── logic/
│   ├── routes/
│   ├── consts.ts
│   ├── db.ts
│   ├── logger.ts
│   ├── main.ts
│   ├── types.ts
│   └── types.d.ts
├── ui/
│   ├── README.md
│   ├── index.html
│   └── ...
├── .env.example
├── Dockerfile
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
