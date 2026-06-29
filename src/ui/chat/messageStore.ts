import { RenderedMessage } from './types';

interface StoredMessage {
    prompt: string;
    text: string;
    isSystem: boolean;
}

/**
 * In-memory message history, keyed by "server/channel" or "server".
 */
export class MessageStore {
    private readonly buckets = new Map<string, StoredMessage[]>();

    pushMessage(key: string, text: string): void {
        let prompt: string = "";
        let textContent: string = "";
        const line: string[] = text.split(" ");
        if (line.length >= 3) {
            prompt = line.slice(0, 3).join(" ");
            textContent = line.slice(3).join(" ");
        } else {
            prompt = text;
        }

        this.push(key, { prompt: prompt, text: textContent, isSystem: false });
    }

    pushSystem(key: string, text: string): void {
        this.push(key, { prompt: "", text: text, isSystem: true });
    }

    render(key: string): RenderedMessage[] {
        return (this.buckets.get(key) ?? []).map((m) => ({
            prompt: m.prompt,
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
