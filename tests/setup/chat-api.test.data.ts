export const validChatRequest = {
  model: 'llama3.2',
  messages: [
    {
      role: 'user',
      content: 'Hello, how are you?'
    }
  ],
  options: {
    temperature: 0.7,
    max_tokens: 100
  }
}; 