export type Pending = string[]

declare module 'claude-code' {
  interface PluginState {
    'question-highlight': { pending: Pending }
  }
}
