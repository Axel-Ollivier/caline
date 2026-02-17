import { MessageOutput } from '../types';
import { ChannelStore } from './channels';

export interface HandlerResult {
    channelsChanged?: boolean;
    membersChanged?: string[];
}

export function handleJoin(
    e: { channel: string; nick: string; ident: string; hostname: string },
    myNick: string, store: ChannelStore, output: MessageOutput, server: string,
): HandlerResult {
    let result: HandlerResult = {};
    if (e.nick === myNick) {
        store.getOrCreate(e.channel);
        result = { channelsChanged: true };
    } else {
        const ch = store.get(e.channel);
        if (ch) {
            ch.members.set(e.nick, { nick: e.nick, modes: [] });
            result = { membersChanged: [e.channel] };
        }
    }
    output.appendMessage(server, e.channel, `--> ${e.nick} (${e.ident}@${e.hostname}) has joined ${e.channel}`);
    return result;
}

export function handlePart(
    e: { channel: string; nick: string; message: string },
    myNick: string, store: ChannelStore, output: MessageOutput, server: string,
): HandlerResult {
    let result: HandlerResult = {};
    if (e.nick === myNick) {
        store.delete(e.channel);
        result = { channelsChanged: true };
    } else {
        const ch = store.get(e.channel);
        if (ch) {
            ch.members.delete(e.nick);
            result = { membersChanged: [e.channel] };
        }
    }
    const reason = e.message ? ` (${e.message})` : '';
    output.appendMessage(server, e.channel, `<-- ${e.nick} has left ${e.channel}${reason}`);
    return result;
}

export function handleQuit(
    e: { nick: string; message: string },
    store: ChannelStore, output: MessageOutput, server: string,
): HandlerResult {
    const reason = e.message ? ` (${e.message})` : '';
    const affected = store.removeNickFromAll(e.nick);
    for (const { name } of affected) {
        output.appendMessage(server, name, `<-- ${e.nick} has quit${reason}`);
    }
    return affected.length ? { membersChanged: affected.map((a) => a.key) } : {};
}

export function handleKick(
    e: { channel: string; kicked: string; nick: string; message: string },
    myNick: string, store: ChannelStore, output: MessageOutput, server: string,
): HandlerResult {
    let result: HandlerResult = {};
    if (e.kicked === myNick) {
        store.delete(e.channel);
        result = { channelsChanged: true };
    } else {
        const ch = store.get(e.channel);
        if (ch) {
            ch.members.delete(e.kicked);
            result = { membersChanged: [e.channel] };
        }
    }
    const reason = e.message ? ` (${e.message})` : '';
    output.appendMessage(server, e.channel, `<-- ${e.kicked} was kicked by ${e.nick}${reason}`);
    return result;
}

export function handleNick(
    e: { nick: string; new_nick: string },
    store: ChannelStore, output: MessageOutput, server: string,
): HandlerResult {
    const affected = store.renameNick(e.nick, e.new_nick);
    for (const { name } of affected) {
        output.appendMessage(server, name, `-- ${e.nick} is now known as ${e.new_nick}`);
    }
    return affected.length ? { membersChanged: affected.map((a) => a.key) } : {};
}

export function handleTopic(
    e: { channel: string; topic: string; nick: string },
    store: ChannelStore, output: MessageOutput, server: string,
): void {
    const ch = store.get(e.channel);
    if (ch) { ch.topic = e.topic; }
    output.appendMessage(server, e.channel, `-- ${e.nick} has changed the topic to: ${e.topic}`);
}

export function handleUserlist(
    e: { channel: string; users: Array<{ nick: string; modes: string[] }> },
    store: ChannelStore,
): HandlerResult {
    const ch = store.get(e.channel);
    if (!ch) { return {}; }
    ch.members.clear();
    for (const u of e.users) {
        ch.members.set(u.nick, { nick: u.nick, modes: u.modes || [] });
    }
    return { membersChanged: [e.channel] };
}

export function handleMode(
    e: { target: string; nick: string; modes: Array<{ mode: string; param: string }> },
    store: ChannelStore,
): HandlerResult {
    const ch = store.get(e.target);
    if (!ch || !e.modes) { return {}; }
    for (const m of e.modes) {
        if (!m.param) { continue; }
        const member = ch.members.get(m.param);
        if (!member) { continue; }
        const adding = m.mode.startsWith('+');
        const flag = m.mode.substring(1);
        if (adding && !member.modes.includes(flag)) {
            member.modes.push(flag);
        } else if (!adding) {
            member.modes = member.modes.filter((x) => x !== flag);
        }
    }
    return { membersChanged: [e.target] };
}
