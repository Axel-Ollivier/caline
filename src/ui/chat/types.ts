export type IncomingMessage =
    | { type: 'sendMessage'; text: string }
    | { type: 'ready' };

export interface RenderedMessage {
    text: string;
    cssClass?: string;
}

export type OutgoingMessage =
    | { type: 'addMessage'; text: string; cssClass?: string }
    | { type: 'setMessages'; messages: RenderedMessage[] }
    | { type: 'focusInput' };
