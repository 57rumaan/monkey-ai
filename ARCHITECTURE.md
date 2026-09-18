# MONKEY AI - Architecture & Implementation Plan

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + CSS Variables (Design System)
- **State Management**: Zustand + React Query (TanStack Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod validation
- **Auth**: JWT + HttpOnly Cookies + bcrypt
- **Storage**: JSONBin-compatible layer (local file fallback for dev)
- **Backend**: Node.js + Express (API routes)
- **Build**: Vite + TypeScript + ESLint + Prettier

## Project Structure
```
monkey-ai/
├── public/
├── src/
│   ├── app/                    # App shell, providers, routing
│   ├── components/
│   │   ├── ui/                 # Design system primitives
│   │   ├── forms/              # Form components
│   │   ├── layout/             # Layout components (Sidebar, Header, etc.)
│   │   ├── chat/               # Chat-specific components
│   │   └── admin/              # Admin panel components
│   ├── features/
│   │   ├── auth/               # Authentication feature
│   │   ├── chat/               # Chat feature
│   │   ├── admin/              # Admin feature
│   │   └── bundles/            # Bundle management
│   ├── lib/
│   │   ├── api/                # API client & endpoints
│   │   ├── auth/               # Auth utilities
│   │   ├── storage/            # Storage abstraction
│   │   ├── capabilities/       # Capability registry
│   │   ├── providers/          # Provider adapters
│   │   ├── routing/            # Request routing logic
│   │   └── utils/              # Shared utilities
│   ├── hooks/                  # Custom React hooks
│   ├── stores/                 # Zustand stores
│   ├── types/                  # TypeScript types
│   ├── styles/                 # Global styles, design tokens
│   └── main.tsx                # Entry point
├── server/                     # Express backend
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── index.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── eslint.config.js
└── .env.example
```

## Core Data Models

### Provider
```typescript
interface Provider {
  id: string;
  label: string;
  apiKeyEnv: string;        // Environment variable name ONLY
  status: 'active' | 'inactive';
  models: RawModel[];
  createdAt: string;
  updatedAt: string;
}
```

### RawModel
```typescript
interface RawModel {
  id: string;
  providerId: string;
  customName: string;
  enabled: boolean;
  rules: ModelRules;
  capabilities: CapabilityType[];  // What this model can do
  createdAt: string;
  updatedAt: string;
}
```

### Capability (Registry)
```typescript
interface CapabilityDefinition {
  id: CapabilityType;
  label: string;
  description: string;
  icon: string;
  category: 'text' | 'image' | 'video' | 'audio' | 'document' | 'utility' | 'custom';
  requiresModel: boolean;
  supportedParameters: ParameterDefinition[];
}
```

### Bundle
```typescript
interface Bundle {
  id: string;
  name: string;
  description: string;
  tier: 'free' | 'pro' | 'enterprise';
  enabled: boolean;
  capabilities: BundleCapability[];
  features: BundleFeatures;
  createdAt: string;
  updatedAt: string;
}

interface BundleCapability {
  capabilityId: CapabilityType;
  providerId: string;
  rawModelId: string;
  enabled: boolean;
  priority: number;  // Fallback order
}

interface BundleFeatures {
  voiceReplies: boolean;
  composerAttachments: boolean;
  customActions: CustomAction[];
  tools: string[];
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;  // bcrypt
  role: 'user' | 'admin';
  emailVerified: boolean;
  otpHash?: string;
  otpExpiresAt?: string;
  otpAttempts: number;
  lastOtpSentAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Capability Registry (Extensible)
```
text_to_text          → Text to Text
coding                → Coding
text_to_image         → Text to Image
image_to_text         → Image to Text (OCR)
image_editing         → Image Editing
image_analysis        → Image Analysis
image_vision          → Image Vision
video_generation      → Video Generation
video_analysis        → Video Analysis
video_vision          → Video Vision
text_to_voice         → Text to Voice
voice_to_text         → Voice to Text
document_analysis     → Document Analysis
file_analysis         → File Analysis
calculator            → Calculator
datetime              → Date/Time
custom_feature        → Custom Feature
custom_action         → Custom Action
```

## Request Routing Flow
```
User Request
    ↓
Auth Middleware
    ↓
Resolve Bundle (from user selection)
    ↓
Resolve Capability (from request type)
    ↓
Find BundleCapability mapping
    ↓
Get Provider + RawModel
    ↓
Select Provider Adapter
    ↓
Call Provider API (server-side only)
    ↓
Return Response
```

## Security Requirements
- bcrypt for password hashing (cost 12)
- JWT in HttpOnly Secure cookies
- CSRF protection
- Rate limiting (auth: 5/min, API: 60/min)
- OTP: 6 digits, 10 min expiry, 3 attempts, 60s cooldown
- Environment variables for ALL secrets
- No API keys in frontend, JSONBin, or logs
- Admin authorization middleware
- Ownership checks on all mutations

## Storage Layer (JSONBin-Compatible)
```
Interface:
- get<T>(collection: string, id: string): Promise<T | null>
- set<T>(collection: string, id: string, data: T): Promise<void>
- delete(collection: string, id: string): Promise<void>
- list<T>(collection: string): Promise<T[]>
- query<T>(collection: string, filter: Partial<T>): Promise<T[]>

Collections:
- users
- providers
- rawModels
- bundles
- capabilities (registry - mostly static)
- chats
- messages
- settings
- usage
- auditLogs
```

## Admin Panel Sections
1. **Dashboard** - Stats, recent activity
2. **Providers** - CRUD providers, manage raw models
3. **Raw Models** - View all models across providers
4. **Model Bundles** - Create/edit bundles, capability mapping
5. **Capabilities** - View/edit capability registry
6. **AI Rules** - Global and per-model rules
7. **Users** - User management, roles
8. **Settings** - App configuration
9. **Admin Security** - Audit logs, rate limits, sessions

## User App UI
- **Sidebar**: New Chat, Search, History, Account, Settings
- **Chat Area**: Model selector (bundles only), messages, streaming
- **Composer**: Input, attachments, send
- **Auth Screens**: Signup (email→password→OTP→username), Login, Forgot Password

## Design System
- **Colors**: CSS custom properties for light/dark themes
- **Typography**: Inter font, fluid scale
- **Spacing**: 4px base unit
- **Radius**: 4px, 8px, 12px, 16px, full
- **Shadows**: 3 elevation levels
- **Transitions**: 150ms, 200ms, 300ms
- **Breakpoints**: 640, 768, 1024, 1280, 1536
- **Accessibility**: WCAG AA, focus visible, semantic HTML

## Implementation Order
1. Project setup + design system + types
2. Storage layer + capability registry
3. Provider/RawModel admin + API
4. Bundle system + capability mapping
5. Auth system (full flow)
6. Request routing + provider adapters
7. Admin panel UI
8. User chat UI
9. Integration testing + build verification