# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the frontend code in this repository.

## Project Overview

This is the React frontend for Bluepill, an AI-powered audience simulation and analysis platform. The frontend provides user interaction for market research through virtual personas and segments, communicating with a Flask backend API.

## Complete Frontend Codebase Map

### Directory Structure with File Details
```
frontend/
├── .env                          # Environment variables (hidden file)
├── .gitignore                   # Git ignore patterns
├── package.json                 # Dependencies: React 18.3.1, TypeScript, Vite 5.4.2, React Router 7.5.3
├── vite.config.ts              # Vite config: dev server port 4000, HMR port 4001, domain support
├── tailwind.config.js          # Tailwind CSS config with custom color theme
├── tsconfig.json               # TypeScript strict mode, path aliases (@/ -> src/)
├── index.html                  # HTML entry point
├── components.json             # shadcn/ui configuration
├── eslint.config.js            # ESLint with React hooks and refresh plugins
├── logo.png                    # Application logo
│
└── src/
    ├── main.tsx                # React app entry - renders App component
    ├── App.tsx                 # Main routing and state management
    │                            # Functions: handleBuildAudience(), handleSelectExisting(), handleNext(), handleBack()
    │                            # Routes: /, /build-audience, /simulate, /simulation-results/:id, /analysis, /chat, /admin
    ├── index.css               # Global styles with Tailwind imports
    ├── vite-env.d.ts          # Vite type definitions
    │
    ├── components/             # Reusable UI components
    │   ├── Layout.tsx          # Page layout: Header + main content + footer
    │   ├── Header.tsx          # Navigation header: auth state, admin menu, logout
    │   ├── Button.tsx          # Custom button component with variants
    │   ├── Card.tsx            # Card container component
    │   ├── OptionCard.tsx      # Selectable option card for choices
    │   ├── ProgressSteps.tsx   # Step progress indicator for workflows
    │   ├── ProgressStepsPremium.tsx    # Enhanced progress steps with animations
    │   ├── ProgressStepsShadcn.tsx     # shadcn-styled progress steps
    │   ├── ProtectedRoute.tsx  # Route guard: redirects to auth if not authenticated
    │   ├── SimulationCard.tsx  # Display simulation results in card format
    │   ├── SimulationHistoryPanel.tsx  # Sidebar for simulation history navigation
    │   ├── StepContainer.tsx   # Generic step wrapper with consistent styling
    │   ├── StepperModern.tsx   # Modern stepper component with progress tracking
    │   │
    │   └── ui/                 # shadcn/ui primitive components (Radix UI based)
    │       ├── alert.jsx       # Alert notifications
    │       ├── avatar.jsx      # User avatar display
    │       ├── badge.jsx       # Status badges
    │       ├── button.jsx      # Base button primitive
    │       ├── card.jsx        # Base card primitive
    │       ├── checkbox.jsx    # Checkbox input
    │       ├── collapsible.jsx # Collapsible content sections
    │       ├── dialog.jsx      # Modal dialog primitive
    │       ├── dialog-custom.jsx # Custom dialog variant
    │       ├── dropdown-menu.jsx # Dropdown menu primitive
    │       ├── input.jsx       # Text input primitive
    │       ├── label.jsx       # Form label primitive
    │       ├── popover.jsx     # Popover primitive
    │       ├── progress.jsx    # Progress bar primitive
    │       ├── radio-group.jsx # Radio button group
    │       ├── scroll-area.jsx # Scrollable area primitive
    │       ├── select.jsx      # Select dropdown primitive
    │       ├── separator.jsx   # Visual separator line
    │       ├── switch.jsx      # Toggle switch primitive
    │       ├── table.jsx       # Data table primitive
    │       ├── tabs.jsx        # Tab navigation primitive
    │       ├── textarea.jsx    # Textarea input primitive
    │       ├── theme-toggle.js # Dark/light theme toggle
    │       ├── toast.jsx       # Toast notification primitive
    │       ├── toaster.jsx     # Toast container
    │       ├── tooltip.jsx     # Tooltip primitive
    │       └── use-toast.js    # Toast hook for notifications
    │
    ├── context/                # React Context providers for global state
    │   ├── AuthContext.tsx     # Authentication state management
    │   │                       # Functions: login(), signup(), logout(), checkAuthStatus()
    │   │                       # State: User object, isAuthenticated, isAdmin
    │   │                       # Local storage integration for persistence
    │   └── AudienceContext.tsx # Audience workflow state management
    │                           # Functions: updateAudienceData(), resetAudienceData()
    │                           # State: audienceData, currentStep, form data
    │
    ├── features/               # Feature-specific components organized by domain
    │   │
    │   ├── landing/
    │   │   └── LandingScreen.tsx # Home page: "Build Audience" vs "Select Existing" choice
    │   │
    │   ├── auth/
    │   │   ├── Auth.tsx         # Authentication wrapper component
    │   │   ├── Login.tsx        # Login form: email/password validation, API call to /login
    │   │   └── Signup.tsx       # User registration: email/password validation, API call to /signup
    │   │
    │   ├── buildAudience/       # 3-step audience creation workflow
    │   │   ├── AudienceTypeSelect.tsx      # Step 1: Website/Qualitative/Upload audience types
    │   │   ├── AudienceSegmentSelect.tsx   # Step 2: All segments vs Specific segment selection
    │   │   └── AudiencePreview.tsx         # Step 3: Preview generated audience, save to backend
    │   │
    │   ├── existingAudience/
    │   │   └── ExistingAudiences.tsx       # Browse saved audiences: API call to /audience
    │   │
    │   ├── simulationUseCase/   # Simulation configuration and execution
    │   │   ├── UseCaseSelector.tsx         # Main use case selection flow with categories
    │   │   ├── SegmentsSelector.tsx        # Select segments/personas for simulation
    │   │   │                               # Functions: fetchSegments(), selectPersonas()
    │   │   │
    │   │   └── useCaseForms/    # Specific form components for each simulation use case
    │   │       ├── SurveyAndFocusGroups.tsx      # Survey configuration: questions, format
    │   │       ├── ContentCreationForm.tsx       # Content creation: topic, style, format
    │   │       ├── LongContentCreationForm.tsx   # Long-form content: articles, reports
    │   │       ├── ShortContentCreationForm.tsx  # Short-form: social posts, ads
    │   │       ├── ContentTestingForm.tsx        # Content testing: upload content for feedback
    │   │       ├── ABTestCreatives.tsx           # A/B test: multiple creative variants
    │   │       ├── PricingForm.tsx               # Pricing analysis: price points, sensitivity
    │   │       ├── BuyerInsightsForm.tsx         # Buyer insights: purchase motivations
    │   │       ├── BuyerInsightsForm.tsx.new     # Updated version of buyer insights
    │   │       ├── AttributionForm.tsx           # Attribution modeling: touchpoint analysis
    │   │       ├── AttributionForm.tsx.new       # Updated attribution form
    │   │       └── InsightsForm.tsx              # General insights: custom questions
    │   │
    │   ├── simulationResults/   # Results display and analysis
    │   │   ├── SimulationResults.tsx        # Results container: status, navigation
    │   │   └── SimulationResultsContent.tsx # Results visualization: charts, insights, export
    │   │
    │   ├── chat/
    │   │   └── ChatPage.tsx                 # Chat interface with simulations/personas/segments
    │   │                                    # Functions: sendMessage(), handleChatResponse()
    │   │
    │   ├── chatWithPersona/     # Persona-specific chat functionality
    │   │   ├── ChatWithPersona.tsx          # Main persona chat wrapper component
    │   │   ├── ChatInterface.tsx            # Chat UI: message history, input, typing indicators
    │   │   ├── ChatInterface.tsx.new        # Updated chat interface version
    │   │   ├── PersonaSelector.tsx          # Persona selection: grid view, filtering
    │   │   ├── PersonaSelector.tsx.fixed    # Bug-fixed version
    │   │   ├── PersonaSelector.tsx.new      # Updated persona selector
    │   │   ├── PersonaSelector.card.tsx     # Card-based persona selector layout
    │   │   ├── PersonaSelector.card.fixed.tsx # Fixed card selector
    │   │   ├── PersonaSelector.card.tsx.new # Updated card selector
    │   │   ├── PersonaSelector.card.updated.tsx # Latest card selector version
    │   │   ├── PersonaPanel.tsx             # Persona information panel: details, traits
    │   │   └── TaskList.md                  # Development task tracking
    │   │
    │   ├── admin/
    │   │   └── AdminPanel.tsx               # Admin interface: user management, system config
    │   │                                    # Functions: fetchUsers(), makeAdmin(), revokeAdmin()
    │   │
    │   ├── analysis/
    │   │   └── AnalysisPage.tsx             # Analysis tools: simulation history, insights
    │   │
    │   └── experiments/         # Empty directory for experimental features
    │
    └── lib/
        └── utils.ts             # Utility functions: clsx, cn (class name merging for Tailwind)
```

## Tech Stack

- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2 (fast builds, HMR)
- **Routing**: React Router DOM v7.5.3
- **State Management**: React Context API (AuthContext, AudienceContext)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS 3.4.1 with custom theme
- **Icons**: Lucide React
- **Markdown**: react-markdown with GitHub-style CSS

## Development Commands

```bash
# Development
npm run dev          # Start development server on port 4000

# Build & Quality
npm run build        # Build for production
npm run lint         # Run ESLint for code quality
npm run preview      # Preview production build
```

## Environment Variables

- `VITE_API_URL` - Backend API endpoint (required)

## API Endpoints Reference

### Authentication Endpoints
- `POST /login` - User authentication (email, password)
- `POST /signup` - User registration (email, password)  
- `GET /logout` - User logout and session cleanup

### Audience Management
- `GET /audience` - Fetch all audiences for authenticated user
- `POST /audience` - Create new audience (type, segments, personas)
- `GET /audience/{id}` - Get specific audience with full details
- `GET /audience/{id}/segments` - Get segments for specific audience

### Segment & Persona Management
- `GET /segments` - Fetch all segments (with optional audience_id filter)
- `GET /segments/{id}/personas` - Get personas for specific segment
- `GET /personas` - Fetch all personas (with filtering options)
- `GET /personas/{id}` - Get specific persona details and traits
- `POST /bulk_personas` - Bulk fetch personas by IDs
- `GET /filtered-personas` - Get filtered personas with query parameters
- `POST /filter_personas` - Filter personas by complex criteria

### Simulation Management
- `GET /simulations` - Fetch simulations (with optional audience_id parameter)
- `POST /simulations` - Create new simulation (use case, parameters, personas)
- `GET /simulations/{id}` - Get simulation details and results
- `GET /simulations/{id}/status` - Get simulation execution status (SSE endpoint)

### Chat Endpoints
- `POST /chat/simulation/{id}` - Chat with entire simulation
- `POST /chat/simulation/{id}/persona/{persona_id}` - Chat with specific persona
- `POST /chat/simulation/{id}/segment/{segment_id}` - Chat with segment group

### Admin Endpoints (Admin Only)
- `GET /admin/users` - Get all users with admin status
- `POST /admin/users/{id}/make-admin` - Promote user to administrator
- `POST /admin/users/{id}/revoke-admin` - Revoke administrator privileges
- `GET /admin/config` - Get system configuration settings
- `PUT /admin/config` - Update system configuration

## State Management Structure

### AuthContext Interface
```typescript
interface User {
  id: number;
  email: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{success: boolean, message: string}>;
  signup: (email: string, password: string) => Promise<{success: boolean, message: string}>;
  logout: () => Promise<void>;
}
```

### AudienceContext Interface
```typescript
interface AudienceData {
  type: AudienceType | null;           // 'website' | 'qualitative' | 'upload'
  websiteUrl: string;                  // For website-based audiences
  segmentType: 'all' | 'specific' | null;
  specificSegment: string;             // If segmentType is 'specific'
  qualitativeInfo: string;             // For qualitative audiences
  uploadedFile: File | null;           // For upload-based audiences
  audienceId: number | null;           // Backend audience ID after creation
  audienceName: string;                // User-defined audience name
  selectedUseCase: string | null;      // Selected simulation use case
  selectedSegments: number[];          // Array of segment IDs for simulation
  personaFilters: Record<number, SegmentPersonaFilters>; // Per-segment persona filters
}

interface SegmentPersonaFilters {
  selectedPersonas: number[];          // Specific persona IDs
  useAll: boolean;                     // Use all personas in segment
}
```

## Component Architecture & Workflow

### Main Application Flow
1. **Landing** (`LandingScreen.tsx`) → User chooses "Build Audience" or "Select Existing"
2. **Authentication** (`Auth.tsx`) → Login/Signup if not authenticated
3. **Audience Creation Flow** (3 steps):
   - `AudienceTypeSelect.tsx` → Choose audience type (Website/Qualitative/Upload)
   - `AudienceSegmentSelect.tsx` → Define segments (All vs Specific)
   - `AudiencePreview.tsx` → Preview and save audience to backend
4. **Simulation Flow**:
   - `ExistingAudiences.tsx` → Browse and select saved audience
   - `UseCaseSelector.tsx` → Choose simulation type
   - `SegmentsSelector.tsx` → Select segments and personas
   - Use case specific form → Configure simulation parameters
   - `SimulationResults.tsx` → View results and analysis

### Form Component Architecture
- Each simulation use case has dedicated form component in `useCaseForms/`
- Forms handle validation, parameter collection, and API submission
- Integration with AI simulation backend through standardized API calls
- Real-time status updates via Server-Sent Events (SSE)

### Component Hierarchy
```
App (Router + Global State)
├── AuthContext Provider
├── AudienceContext Provider
├── Layout (Header + Main + Footer)
│   ├── Header (Navigation, Auth Status)
│   └── Main Content (Route-based)
│       ├── Landing → Auth → Audience Building
│       ├── Simulation Configuration → Results
│       ├── Chat Interfaces
│       └── Admin Panel
```

## Key Development Patterns

### File Organization
- **Feature-based structure**: Components organized by domain in `src/features/`
- **Shared UI components**: Reusable components in `src/components/`
- **shadcn/ui pattern**: UI primitives in `src/components/ui/`
- **Context providers**: Global state in `src/context/`

### Component Patterns
- **Protected routes**: Authentication guards using `ProtectedRoute.tsx`
- **Multi-step workflows**: Step containers with progress tracking
- **Form validation**: Client-side validation before API submission
- **Error handling**: Toast notifications for user feedback
- **Loading states**: UI feedback during async operations

### Styling Patterns
- **Tailwind CSS**: Utility-first styling with custom theme
- **shadcn/ui**: Consistent, accessible component library
- **Responsive design**: Mobile-first responsive patterns
- **Dark/light theme**: Theme toggle support

### Data Flow Patterns
- **Context API**: Global state management for auth and audience data
- **API integration**: Fetch API with credentials for session management
- **Real-time updates**: Server-Sent Events (SSE) for live simulation status
- **Local storage**: Persistence for authentication state

## Configuration Files

### Vite Configuration (`vite.config.ts`)
- Development server on port 4000
- HMR on port 4001
- Path aliases: `@/` → `src/`
- Domain support for `dev.blue-pill.ai`

### TypeScript Configuration (`tsconfig.json`)
- Strict mode enabled
- Path aliases configured
- React JSX transform

### Tailwind Configuration (`tailwind.config.js`)
- Custom color theme
- shadcn/ui integration
- Component class utilities

### ESLint Configuration (`eslint.config.js`)
- React hooks rules
- React refresh plugin
- TypeScript support

## Development Notes

- **No test framework configured** - Check with user for testing preferences
- **Multiple file versions** - Some components have `.new`, `.fixed` variants for development iterations
- **Feature flags**: Admin panel for system configuration
- **Session management**: Authentication persisted in local storage
- **Real-time features**: SSE integration for live simulation updates