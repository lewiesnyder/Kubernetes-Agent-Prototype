# Frontend Development Guidelines

## Project Setup
- React-based frontend with TypeScript
- Interacts with backend API defined in `backend-openapi-spec.json`
- Backend service runs at http://localhost:8000
- Uses proxy to handle CORS issues
- Supports multiple LLM models and temperature settings

## Commands
- Setup: `npm install`
- Dev server: `npm start` (uses CRA's built-in proxy)
- Express proxy server: `npm run server` (alternative proxy solution)
- Combined dev + proxy: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Test: `npm test`
- Single test: `npm test -- -t "test name"`

## Code Style Guidelines
- Use TypeScript for type safety
- Follow OpenAPI spec for API interactions
- Components: Use functional components with hooks
- State management: React useState and useEffect hooks
- Formatting: Use Prettier with default settings
- Naming: camelCase for variables/functions, PascalCase for components/types
- Error handling: Use try/catch for async operations
- File structure: Group by feature, not by type
- Use collapsible sections for execution outputs
- Stream responses for real-time updates

## API Access
- All backend API calls should use `/api` prefix
- API requests are proxied to backend at http://localhost:8000
- API follows the backend-openapi-spec.json definition
- LLM model selection is passed in the API request
- Temperature range: 0.0 (precise) to 1.0 (creative)

## Supported Models
- Default: "anthropic/claude-3-7-sonnet-20250219"
- Models are configured in src/config.ts
- Add new models by updating the MODELS array in config.ts
- Models are grouped by provider in the UI selector