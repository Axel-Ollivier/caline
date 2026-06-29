export type IncomingMessage =
    | { type: 'sendMessage'; text: string }
    | { type: 'ready' };

export interface RenderedMessage {
    prompt: string;
    text: string;
    cssClass?: string;
}

export type OutgoingMessage =
    | { type: 'addMessage'; prompt: string, text: string; cssClass?: string }
    | { type: 'setMessages'; messages: RenderedMessage[] }
    | { type: 'focusInput' };
