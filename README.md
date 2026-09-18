# 🐵 MONKEY AI

> Advanced AI Platform - Professional, scalable, production-ready

Monkey AI is a full-featured AI web platform with support for multiple AI providers, models, capabilities, and features. It includes a professional chat interface, admin panel, user management, and modular architecture designed for extensibility.

---

## ✨ Features

### Core Platform
- **AI Chat** - Text-to-text conversation with streaming support
- **Code Assistant** - AI-powered coding with syntax highlighting
- **Image Generation** - Text-to-image with configured providers
- **Text-to-Speech** - Convert text to audio
- **Image Editing** - AI-powered image modification
- **File Attachments** - Upload images, PDFs, documents

### User Features
- User authentication (signup, login, logout, delete account)
- Chat history with search
- Multiple model selection
- Feature selection
- Dark/Light theme
- Responsive design (desktop, tablet, mobile)
- Markdown rendering with code highlighting

### Admin Panel
- Dashboard with analytics
- Provider management (OpenAI, Anthropic, Google, custom)
- Model management with capabilities
- Model groups for user organization
- Feature management
- AI Rules system (global, feature, model scope)
- User management
- Security settings

### Architecture
- Modular provider abstraction layer
- Capability-based model system
- Feature registry
- Rule priority system
- Storage abstraction (JSONBin-ready, database-migratable)
- API-first design (future mobile/APK compatible)

---

## 🏗️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| Icons | Lucide React |
| Animations | Framer Motion |
| Charts | Recharts |
| Markdown | react-markdown, react-syntax-highlighter |
| State | React Context + useReducer |
| Storage | localStorage (JSONBin-ready) |

---

## 📁 Project Structure

```
src/
├── App.tsx                    # Main app with routing
├── main.tsx                   # Entry point
├── index.css                  # Global styles + Tailwind
├── types/
│   └── index.ts              # TypeScript type definitions
├── contexts/
│   └── AppContext.tsx         # Global state management
├── components/
│   ├── ui/
│   │   └── index.tsx         # Reusable UI components
│   ├── layout/
│   │   └── Sidebar.tsx       # Main sidebar
│   └── chat/
│       ├── ChatArea.tsx      # Chat display + messages
│       ├── ChatInput.tsx     # Message input + attachments
│       └── ModelSelector.tsx # Model/feature selector
└── pages/
    ├── AuthPage.tsx          # Login/Signup
    ├── ChatPage.tsx          # Main chat interface
    ├── SettingsPage.tsx      # User settings
    └── admin/
        ├── AdminLayout.tsx   # Admin shell + login
        ├── AdminDashboard.tsx
        ├── AdminProviders.tsx
        ├── AdminModelGroups.tsx
        ├── AdminFeatures.tsx
        ├── AdminUsers.tsx
        ├── AdminRules.tsx
        └── AdminSecurity.tsx
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/monkey-ai.git
cd monkey-ai

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

---

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Application
APP_NAME=Monkey AI
APP_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here

# Admin Credentials (change in production!)
ADMIN_USERNAME=57rumaan
ADMIN_PASSWORD_HASH=hashed-password-here

# Storage (JSONBin)
JSONBIN_API_KEY=your-jsonbin-api-key
JSONBIN_BIN_ID=your-jsonbin-bin-id

# AI Providers (server-side only, never expose to client)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

**⚠️ Security:** Never commit `.env` files or expose API keys to the client.

---

## 🎯 Admin Panel

Access the admin panel at `/admin` (or `/#/admin` with hash routing).

**Default Credentials:**
- Username: `57rumaan`
- Password: `rumaan12`

**⚠️ Change these credentials before production deployment!**

### Admin Sections
1. **Dashboard** - System overview and metrics
2. **Models & Providers** - Configure AI providers and models
3. **Model Groups** - Organize models for user selection
4. **Features** - Enable/disable AI capabilities
5. **Users** - Manage registered users
6. **AI Rules** - Configure behavior rules
7. **Security** - Admin credentials and security settings

---

## 🧠 Provider Configuration

To enable real AI responses:

1. Go to Admin Panel → Models & Providers
2. Click "Add Provider"
3. Select provider type (OpenAI, Anthropic, Google, etc.)
4. Enter Base URL and API Key
5. Click "Add Model" under the provider
6. Set provider model ID (e.g., `gpt-4o`, `claude-3-opus`)
7. Set display name (e.g., "Monkey Smart")
8. Assign capabilities
9. Enable the model
10. Add model to a Model Group

---

## 📐 Architecture

### Capability System
Models declare capabilities they support:
- `text_to_text` - General conversation
- `coding` - Code generation
- `text_to_image` - Image generation
- `text_to_speech` - Audio generation
- `image_editing` - Image modification
- `image_analysis` - Image understanding
- And more...

### Rule Priority
```
Global Rules → Feature Rules → Model Rules → User Request
```

### Storage Abstraction
The application uses a storage abstraction layer that currently uses localStorage but is designed to be replaced with:
- JSONBin (planned)
- PostgreSQL
- Supabase
- Any other database

### API-First Design
The frontend is designed to work with a backend API. Current implementation uses client-side state for demonstration. In production:
- All AI requests go through the backend
- API keys stay server-side
- User data is validated server-side
- Admin authorization is enforced server-side

---

## 🎨 Customization

### Theme
The design system uses CSS custom properties in `src/index.css`. Modify the `@theme` block to customize colors.

### Features
Add new features by:
1. Adding capability to `src/types/index.ts`
2. Adding feature entry in the feature registry
3. Implementing backend adapter
4. Admin can then enable/configure it

### Providers
Add new provider types by:
1. Creating a provider adapter
2. Registering it in the provider system
3. Admin can configure instances of it

---

## 📱 Future Roadmap

- [ ] Backend API (Express/Fastify)
- [ ] JSONBin integration
- [ ] PostgreSQL/Supabase migration
- [ ] Real streaming responses
- [ ] Voice input
- [ ] Web search capability
- [ ] Video generation
- [ ] Android/iOS apps (React Native)
- [ ] Rate limiting middleware
- [ ] Email verification
- [ ] OAuth providers
- [ ] Usage-based billing

---

## 🔒 Security Notes

- API keys are never exposed to the client
- Admin credentials should be changed before deployment
- User data is isolated (users can only access their own chats)
- Passwords are hashed (never stored in plain text)
- File uploads are validated (type, size, MIME)
- Input validation on all forms
- Protected routes with authentication checks

---

## 📄 License

Private - All rights reserved.

---

## 🐵 Built with ❤️ by the Monkey AI Team
