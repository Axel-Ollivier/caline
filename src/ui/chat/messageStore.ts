import { RenderedMessage } from './types';

interface StoredMessage {
    text: string;
    isSystem: boolean;
}

/**
 * In-memory message history, keyed by "server/channel" or "server".
 */
export class MessageStore {
    private readonly buckets = new Map<string, StoredMessage[]>();

    pushMessage(key: string, text: string): void {
        this.push(key, { text, isSystem: false });
    }

    pushSystem(key: string, text: string): void {
        this.push(key, { text, isSystem: true });
    }

    render(key: string): RenderedMessage[] {
        return (this.buckets.get(key) ?? []).map((m) => ({
            text: m.text,
            cssClass: m.isSystem ? 'system' : undefined,
        }));
    }

    private push(key: string, message: StoredMessage): void {
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = [];
            this.buckets.set(key, bucket);
        }
        bucket.push(message);
    }
}
