import { create } from 'zustand';

const useChatbotStore = create((set, get) => ({
  isOpen: false,
  messages: [
    {
      id: 1,
      role: 'assistant',
      content: "Hi! I'm **InventBot** 🤖, your AI inventory assistant. I can help you check stock, track orders, view warranties, and more. Try asking me something!",
      timestamp: new Date(),
    },
  ],
  isLoading: false,

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, { ...message, id: Date.now(), timestamp: new Date() }],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  clearMessages: () =>
    set({
      messages: [
        {
          id: 1,
          role: 'assistant',
          content: "Chat cleared! How can I help you?",
          timestamp: new Date(),
        },
      ],
    }),
}));

export default useChatbotStore;
