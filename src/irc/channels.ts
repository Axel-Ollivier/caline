import { ChannelState } from '../types';

export class ChannelStore {
    private readonly map = new Map<string, ChannelState>();

    get(name: string): ChannelState | undefined {
        return this.map.get(name.toLowerCase());
    }

    getOrCreate(name: string): ChannelState {
        const key = name.toLowerCase();
        let ch = this.map.get(key);
        if (!ch) {
            ch = { name, topic: '', members: new Map() };
            this.map.set(key, ch);
        }
        return ch;
    }

    delete(name: string): void {
        this.map.delete(name.toLowerCase());
    }

    clear(): void {
        this.map.clear();
    }

    renameNick(oldNick: string, newNick: string): Array<{ key: string; name: string }> {
        const affected: Array<{ key: string; name: string }> = [];
        for (const [key, ch] of this.map) {
            const member = ch.members.get(oldNick);
            if (member) {
                ch.members.delete(oldNick);
                ch.members.set(newNick, { ...member, nick: newNick });
                affected.push({ key, name: ch.name });
            }
        }
        return affected;
    }

    removeNickFromAll(nick: string): Array<{ key: string; name: string }> {
        const affected: Array<{ key: string; name: string }> = [];
        for (const [key, ch] of this.map) {
            if (ch.members.has(nick)) {
                ch.members.delete(nick);
                affected.push({ key, name: ch.name });
            }
        }
        return affected;
    }

    asReadonly(): ReadonlyMap<string, ChannelState> {
        return this.map;
    }
}
