import { create } from 'zustand';

const useChatbotStore = create((set, get) => ({
  isOpen: false,
  messages: [
    {
      id: 1,
      role: 'assistant',
      content: "Hello. I can check stock levels, track purchase requests and orders, look up warranties, and raise a purchase request for you.",
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
