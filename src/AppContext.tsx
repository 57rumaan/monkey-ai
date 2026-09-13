import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User, Chat, Message, Provider, Model, ModelGroup, Feature, Rule, Attachment, ThemeMode, Toast, CapabilityId, AdminDashboardData } from './types';

// ============================================
// STATE
// ============================================
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  chats: Chat[];
  activeChatId: string | null;
  providers: Provider[];
  models: Model[];
  modelGroups: ModelGroup[];
  features: Feature[];
  rules: Rule[];
  adminAuthenticated: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toasts: Toast[];
  isGenerating: boolean;
}

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  theme: 'dark',
  chats: [],
  activeChatId: null,
  providers: [],
  models: [],
  modelGroups: [],
  features: [],
  rules: [],
  adminAuthenticated: false,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  toasts: [],
  isGenerating: false,
};

// ============================================
// ACTIONS
// ============================================
type Action =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: Chat }
  | { type: 'DELETE_CHAT'; payload: string }
  | { type: 'SET_ACTIVE_CHAT'; payload: string | null }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { chatId: string; messageId: string; updates: Partial<Message> } }
  | { type: 'SET_PROVIDERS'; payload: Provider[] }
  | { type: 'ADD_PROVIDER'; payload: Provider }
  | { type: 'UPDATE_PROVIDER'; payload: Provider }
  | { type: 'DELETE_PROVIDER'; payload: string }
  | { type: 'SET_MODELS'; payload: Model[] }
  | { type: 'ADD_MODEL'; payload: Model }
  | { type: 'UPDATE_MODEL'; payload: Model }
  | { type: 'DELETE_MODEL'; payload: string }
  | { type: 'SET_MODEL_GROUPS'; payload: ModelGroup[] }
  | { type: 'ADD_MODEL_GROUP'; payload: ModelGroup }
  | { type: 'UPDATE_MODEL_GROUP'; payload: ModelGroup }
  | { type: 'DELETE_MODEL_GROUP'; payload: string }
  | { type: 'SET_FEATURES'; payload: Feature[] }
  | { type: 'UPDATE_FEATURE'; payload: Feature }
  | { type: 'SET_RULES'; payload: Rule[] }
  | { type: 'ADD_RULE'; payload: Rule }
  | { type: 'UPDATE_RULE'; payload: Rule }
  | { type: 'DELETE_RULE'; payload: string }
  | { type: 'SET_ADMIN_AUTH'; payload: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_MOBILE_SIDEBAR'; payload: boolean }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_GENERATING'; payload: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats], activeChatId: action.payload.id };
    case 'UPDATE_CHAT':
      return { ...state, chats: state.chats.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CHAT':
      return { ...state, chats: state.chats.filter(c => c.id !== action.payload), activeChatId: state.activeChatId === action.payload ? null : state.activeChatId };
    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChatId: action.payload };
    case 'ADD_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(c => c.id === action.payload.chatId ? { ...c, messages: [...c.messages, action.payload.message], updatedAt: new Date().toISOString() } : c)
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(c => c.id === action.payload.chatId ? {
          ...c,
          messages: c.messages.map(m => m.id === action.payload.messageId ? { ...m, ...action.payload.updates } : m)
        } : c)
      };
    case 'SET_PROVIDERS':
      return { ...state, providers: action.payload };
    case 'ADD_PROVIDER':
      return { ...state, providers: [...state.providers, action.payload] };
    case 'UPDATE_PROVIDER':
      return { ...state, providers: state.providers.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROVIDER':
      return { ...state, providers: state.providers.filter(p => p.id !== action.payload) };
    case 'SET_MODELS':
      return { ...state, models: action.payload };
    case 'ADD_MODEL':
      return { ...state, models: [...state.models, action.payload] };
    case 'UPDATE_MODEL':
      return { ...state, models: state.models.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_MODEL':
      return { ...state, models: state.models.filter(m => m.id !== action.payload) };
    case 'SET_MODEL_GROUPS':
      return { ...state, modelGroups: action.payload };
    case 'ADD_MODEL_GROUP':
      return { ...state, modelGroups: [...state.modelGroups, action.payload] };
    case 'UPDATE_MODEL_GROUP':
      return { ...state, modelGroups: state.modelGroups.map(g => g.id === action.payload.id ? action.payload : g) };
    case 'DELETE_MODEL_GROUP':
      return { ...state, modelGroups: state.modelGroups.filter(g => g.id !== action.payload) };
    case 'SET_FEATURES':
      return { ...state, features: action.payload };
    case 'UPDATE_FEATURE':
      return { ...state, features: state.features.map(f => f.id === action.payload.id ? action.payload : f) };
    case 'SET_RULES':
      return { ...state, rules: action.payload };
    case 'ADD_RULE':
      return { ...state, rules: [...state.rules, action.payload] };
    case 'UPDATE_RULE':
      return { ...state, rules: state.rules.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_RULE':
      return { ...state, rules: state.rules.filter(r => r.id !== action.payload) };
    case 'SET_ADMIN_AUTH':
      return { ...state, adminAuthenticated: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_MOBILE_SIDEBAR':
      return { ...state, mobileSidebarOpen: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    default:
      return state;
  }
}

// ============================================
// DEFAULT DATA
// ============================================
const defaultFeatures: Feature[] = [
  { id: 'text_to_text', name: 'text_to_text', displayName: 'Chat', description: 'General AI conversation', icon: 'MessageSquare', enabled: true, requiredCapabilities: ['text_to_text'], settings: {}, order: 0 },
  { id: 'coding', name: 'coding', displayName: 'Code', description: 'AI coding assistant', icon: 'Code', enabled: true, requiredCapabilities: ['coding'], settings: {}, order: 1 },
  { id: 'text_to_image', name: 'text_to_image', displayName: 'Image Generation', description: 'Generate images from text prompts', icon: 'Image', enabled: true, requiredCapabilities: ['text_to_image'], settings: {}, order: 2 },
  { id: 'text_to_speech', name: 'text_to_speech', displayName: 'Text to Speech', description: 'Convert text to audio', icon: 'Volume2', enabled: true, requiredCapabilities: ['text_to_speech'], settings: {}, order: 3 },
  { id: 'image_editing', name: 'image_editing', displayName: 'Image Editing', description: 'Edit images with AI', icon: 'Edit3', enabled: true, requiredCapabilities: ['image_editing'], settings: {}, order: 4 },
];

const defaultModelGroups: ModelGroup[] = [
  { id: 'general', name: 'general', displayName: 'General AI', description: 'General purpose models', enabled: true, modelIds: [], order: 0, icon: 'Brain' },
  { id: 'coding', name: 'coding', displayName: 'Coding', description: 'Code generation models', enabled: true, modelIds: [], order: 1, icon: 'Code' },
  { id: 'image', name: 'image', displayName: 'Image', description: 'Image generation models', enabled: true, modelIds: [], order: 2, icon: 'Image' },
  { id: 'voice', name: 'voice', displayName: 'Voice', description: 'Speech models', enabled: true, modelIds: [], order: 3, icon: 'Volume2' },
];

// ============================================
// STORAGE
// ============================================
const STORAGE_KEYS = {
  USER: 'monkey_ai_user',
  THEME: 'monkey_ai_theme',
  CHATS: 'monkey_ai_chats',
  PROVIDERS: 'monkey_ai_providers',
  MODELS: 'monkey_ai_models',
  MODEL_GROUPS: 'monkey_ai_model_groups',
  FEATURES: 'monkey_ai_features',
  RULES: 'monkey_ai_rules',
  ADMIN_AUTH: 'monkey_ai_admin_auth',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

// ============================================
// CONTEXT
// ============================================
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  deleteAccount: () => void;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  adminLogout: () => void;
  createChat: (modelId?: string, featureId?: string) => Chat;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  sendMessage: (chatId: string, content: string, attachments?: Attachment[]) => Promise<void>;
  searchChats: (query: string) => Chat[];
  addToast: (type: Toast['type'], message: string) => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const user = loadFromStorage<User | null>(STORAGE_KEYS.USER, null);
    const theme = loadFromStorage<'light' | 'dark'>(STORAGE_KEYS.THEME, 'dark');
    const chats = loadFromStorage<Chat[]>(STORAGE_KEYS.CHATS, []);
    const providers = loadFromStorage<Provider[]>(STORAGE_KEYS.PROVIDERS, []);
    const models = loadFromStorage<Model[]>(STORAGE_KEYS.MODELS, []);
    const modelGroups = loadFromStorage<ModelGroup[]>(STORAGE_KEYS.MODEL_GROUPS, defaultModelGroups);
    const features = loadFromStorage<Feature[]>(STORAGE_KEYS.FEATURES, defaultFeatures);
    const rules = loadFromStorage<Rule[]>(STORAGE_KEYS.RULES, []);
    const adminAuth = loadFromStorage<boolean>(STORAGE_KEYS.ADMIN_AUTH, false);

    if (user) dispatch({ type: 'SET_USER', payload: user });
    dispatch({ type: 'SET_THEME', payload: theme });
    dispatch({ type: 'SET_CHATS', payload: chats });
    dispatch({ type: 'SET_PROVIDERS', payload: providers });
    dispatch({ type: 'SET_MODELS', payload: models });
    dispatch({ type: 'SET_MODEL_GROUPS', payload: modelGroups });
    dispatch({ type: 'SET_FEATURES', payload: features });
    dispatch({ type: 'SET_RULES', payload: rules });
    dispatch({ type: 'SET_ADMIN_AUTH', payload: adminAuth });
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(state.theme);
    saveToStorage(STORAGE_KEYS.THEME, state.theme);
  }, [state.theme]);

  useEffect(() => { saveToStorage(STORAGE_KEYS.CHATS, state.chats); }, [state.chats]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.PROVIDERS, state.providers); }, [state.providers]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.MODELS, state.models); }, [state.models]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.MODEL_GROUPS, state.modelGroups); }, [state.modelGroups]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.FEATURES, state.features); }, [state.features]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.RULES, state.rules); }, [state.rules]);

  useEffect(() => {
    state.toasts.forEach(toast => {
      const timer = setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id }), toast.duration || 4000);
      return () => clearTimeout(timer);
    });
  }, [state.toasts]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const users = loadFromStorage<any[]>('monkey_ai_users_db', []);
    const found = users.find(u => u.email === email);
    if (found && found.passwordHash === btoa(password)) {
      const user: User = { ...found, passwordHash: undefined } as any;
      user.lastActive = new Date().toISOString();
      dispatch({ type: 'SET_USER', payload: user });
      saveToStorage(STORAGE_KEYS.USER, user);
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    const users = loadFromStorage<any[]>('monkey_ai_users_db', []);
    if (users.find(u => u.email === email)) return false;
    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active',
      theme: state.theme,
      preferences: { theme: state.theme, sendOnEnter: true, sidebarCollapsed: false },
      usageStats: { totalMessages: 0, totalChats: 0, totalTokens: 0 },
    };
    users.push({ ...newUser, passwordHash: btoa(password) });
    saveToStorage('monkey_ai_users_db', users);
    dispatch({ type: 'SET_USER', payload: newUser });
    saveToStorage(STORAGE_KEYS.USER, newUser);
    return true;
  }, [state.theme]);

  const logout = useCallback(() => {
    dispatch({ type: 'SET_USER', payload: null });
    localStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  const deleteAccount = useCallback(() => {
    if (!state.user) return;
    const users = loadFromStorage<any[]>('monkey_ai_users_db', []);
    saveToStorage('monkey_ai_users_db', users.filter(u => u.id !== state.user!.id));
    saveToStorage(STORAGE_KEYS.CHATS, state.chats.filter(c => c.userId !== state.user!.id));
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_CHATS', payload: [] });
    localStorage.removeItem(STORAGE_KEYS.USER);
  }, [state.user, state.chats]);

  const adminLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    const ADMIN_USER = '57rumaan';
    const ADMIN_PASS = 'rumaan12';
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      dispatch({ type: 'SET_ADMIN_AUTH', payload: true });
      saveToStorage(STORAGE_KEYS.ADMIN_AUTH, true);
      return true;
    }
    return false;
  }, []);

  const adminLogout = useCallback(() => {
    dispatch({ type: 'SET_ADMIN_AUTH', payload: false });
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
  }, []);

  const createChat = useCallback((modelId?: string, featureId?: string): Chat => {
    const chat: Chat = {
      id: uuidv4(),
      userId: state.user?.id || 'anonymous',
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectedModelId: modelId || '',
      selectedFeatureId: featureId || 'text_to_text',
      messages: [],
    };
    dispatch({ type: 'ADD_CHAT', payload: chat });
    return chat;
  }, [state.user]);

  const deleteChat = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CHAT', payload: id });
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    const chat = state.chats.find(c => c.id === id);
    if (chat) {
      dispatch({ type: 'UPDATE_CHAT', payload: { ...chat, title, updatedAt: new Date().toISOString() } });
    }
  }, [state.chats]);

  const sendMessage = useCallback(async (chatId: string, content: string, attachments?: Attachment[]) => {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;

    const userMsg: Message = {
      id: uuidv4(),
      chatId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      attachments,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: userMsg } });

    if (chat.messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      dispatch({ type: 'UPDATE_CHAT', payload: { ...chat, title, updatedAt: new Date().toISOString() } });
    }

    const hasProviders = state.providers.length > 0 && state.providers.some(p => p.enabled);
    const hasModels = state.models.length > 0 && state.models.some(m => m.enabled);

    if (!hasProviders || !hasModels) {
      const errorMsg: Message = {
        id: uuidv4(),
        chatId,
        role: 'assistant',
        content: '⚠️ **Configuration Required**\n\nNo AI providers are currently configured. Please ask your administrator to set up providers and models in the Admin Panel.\n\nTo configure:\n1. Go to Admin Panel → Models & Providers\n2. Add a provider (e.g., OpenAI, Anthropic)\n3. Add models with appropriate capabilities\n4. Enable the models you want to use',
        createdAt: new Date().toISOString(),
        error: 'NO_PROVIDER_CONFIGURED',
      };
      dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: errorMsg } });
      return;
    }

    dispatch({ type: 'SET_GENERATING', payload: true });
    const assistantMsg: Message = {
      id: uuidv4(),
      chatId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isStreaming: true,
      modelId: chat.selectedModelId,
      featureId: chat.selectedFeatureId,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: assistantMsg } });

    const model = state.models.find(m => m.id === chat.selectedModelId);
    const provider = state.providers.find(p => p.id === model?.providerId);

    if (!provider || !model) {
      dispatch({ type: 'UPDATE_MESSAGE', payload: { chatId, messageId: assistantMsg.id, updates: { content: '⚠️ Selected model is not available. Please select a different model.', isStreaming: false, error: 'MODEL_UNAVAILABLE' } } });
      dispatch({ type: 'SET_GENERATING', payload: false });
      return;
    }

    const responseText = generateSimulatedResponse(content, chat.selectedFeatureId, model.displayName);
    let currentText = '';
    const words = responseText.split(' ');

    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 20));
      currentText += (i > 0 ? ' ' : '') + words[i];
      dispatch({ type: 'UPDATE_MESSAGE', payload: { chatId, messageId: assistantMsg.id, updates: { content: currentText } } });
    }

    dispatch({ type: 'UPDATE_MESSAGE', payload: { chatId, messageId: assistantMsg.id, updates: { isStreaming: false, metadata: { tokensUsed: responseText.split(' ').length * 2, responseTime: words.length * 50, providerId: provider.id, modelId: model.id } } } });
    dispatch({ type: 'SET_GENERATING', payload: false });

    if (state.user) {
      const updatedUser = { ...state.user, usageStats: { ...state.user.usageStats, totalMessages: state.user.usageStats.totalMessages + 2, totalTokens: state.user.usageStats.totalTokens + responseText.split(' ').length * 2, lastRequestAt: new Date().toISOString() } };
      dispatch({ type: 'SET_USER', payload: updatedUser });
      saveToStorage(STORAGE_KEYS.USER, updatedUser);
    }
  }, [state.chats, state.providers, state.models, state.user]);

  const searchChats = useCallback((query: string): Chat[] => {
    if (!query.trim()) return state.chats;
    const q = query.toLowerCase();
    return state.chats.filter(c =>
      c.userId === state.user?.id && (
        c.title.toLowerCase().includes(q) ||
        c.messages.some(m => m.content.toLowerCase().includes(q))
      )
    );
  }, [state.chats, state.user]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const toast: Toast = { id: uuidv4(), type, message };
    dispatch({ type: 'ADD_TOAST', payload: toast });
  }, []);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'dark' ? 'light' : 'dark' });
  }, [state.theme]);

  const value: AppContextType = {
    state,
    dispatch,
    login,
    signup,
    logout,
    deleteAccount,
    adminLogin,
    adminLogout,
    createChat,
    deleteChat,
    renameChat,
    sendMessage,
    searchChats,
    addToast,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function generateSimulatedResponse(userMessage: string, featureId: string, modelName: string): string {
  const responses: Record<string, string[]> = {
    text_to_text: [
      `I'm **${modelName}**, and I'm ready to help! However, I should note that this is a simulated response because no real AI provider API key has been configured yet.\n\nTo get real AI responses:\n1. Go to the **Admin Panel**\n2. Navigate to **Models & Providers**\n3. Add a provider (e.g., OpenAI, Anthropic, Google)\n4. Enter your API key\n5. Add and enable models\n\nOnce configured, I'll provide real AI-generated responses! 🐵\n\nIn the meantime, feel free to explore the interface — try the chat history, model selector, theme toggle, and other features.`,
      `Hello! I'm ${modelName}. This is a demonstration response since the AI provider hasn't been configured yet.\n\nHere's what I can do once properly configured:\n- Answer questions on any topic\n- Help with writing and editing\n- Analyze documents and images\n- Generate creative content\n- Assist with research\n\n**To activate real responses:**\nPlease configure your AI provider credentials in the Admin Panel under "Models & Providers".`,
    ],
    coding: [
      `I'm ${modelName}, your coding assistant! 🖥️\n\nThis is a simulated response. To get real code generation, configure an AI provider in the Admin Panel.\n\nHere's an example of what I can generate:\n\n\`\`\`typescript\n// Example: A simple React component\ninterface Props {\n  title: string;\n  count: number;\n}\n\nexport function Counter({ title, count }: Props) {\n  return (\n    <div className="p-4">\n      <h2>{title}</h2>\n      <p>Count: {count}</p>\n    </div>\n  );\n}\n\`\`\`\n\nOnce configured, I can help with:\n- Code generation in any language\n- Debugging and error fixing\n- Code review and optimization\n- Architecture advice\n- Documentation`,
    ],
    text_to_image: [
      `🎨 **Image Generation**\n\nThis feature requires a configured image generation provider (e.g., DALL-E, Stable Diffusion).\n\nYour prompt: "${userMessage}"\n\nTo enable this feature:\n1. Add an image generation provider in Admin Panel\n2. Configure the API credentials\n3. Assign a model with the \`text_to_image\` capability\n\nOnce configured, I'll generate images based on your prompts!`,
    ],
    text_to_speech: [
      `🔊 **Text to Speech**\n\nThis feature requires a configured TTS provider (e.g., ElevenLabs, OpenAI TTS).\n\nTo enable:\n1. Add a TTS provider in Admin Panel\n2. Configure API credentials\n3. Assign a model with \`text_to_speech\` capability\n\nOnce configured, I'll convert your text to natural-sounding audio!`,
    ],
    image_editing: [
      `🖼️ **Image Editing**\n\nThis feature requires a configured image editing provider.\n\nTo enable:\n1. Add an image editing provider in Admin Panel\n2. Configure API credentials\n3. Assign a model with \`image_editing\` capability\n\nOnce configured, upload an image and describe your edits!`,
    ],
  };

  const featureResponses = responses[featureId] || responses.text_to_text;
  return featureResponses[Math.floor(Math.random() * featureResponses.length)];
}
