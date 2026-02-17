import * as vscode from 'vscode';
import { ChannelState, ConnectionStatus, MessageOutput, ServerConfig } from '../types';
import { ChannelStore } from './channels';
import { handleJoin, handleKick, handleMode, handleNick, handlePart, handleQuit, HandlerResult, handleTopic, handleUserlist } from './handlers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const IRC = require('irc-framework');

export class IrcClient implements vscode.Disposable {
    private client: any;
    private _status: ConnectionStatus = 'disconnected';
    private _currentNick: string;
    private readonly store = new ChannelStore();
    private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    private reconnectAttempts = 0;

    private readonly _onStatusChange = new vscode.EventEmitter<ConnectionStatus>();
    readonly onStatusChange = this._onStatusChange.event;

    private readonly _onChannelsChanged = new vscode.EventEmitter<void>();
    readonly onChannelsChanged = this._onChannelsChanged.event;

    private readonly _onMembersChanged = new vscode.EventEmitter<string>();
    readonly onMembersChanged = this._onMembersChanged.event;

    private readonly _onDmReceived = new vscode.EventEmitter<string>();
    readonly onDmReceived = this._onDmReceived.event;

    constructor(
        public readonly config: ServerConfig,
        private readonly output: MessageOutput,
    ) {
        this._currentNick = config.nick;
        this.client = this.createClient();
    }

    get status(): ConnectionStatus { return this._status; }
    get channels(): ReadonlyMap<string, ChannelState> { return this.store.asReadonly(); }
    get currentNick(): string { return this._currentNick; }

    connect(): void {
        if (this._status === 'connected' || this._status === 'connecting') { return; }
        this.setStatus('connecting');
        this.reconnectAttempts = 0;
        this.rawConnect();
    }

    disconnect(): void {
        this.clearReconnectTimer();
        this.reconnectAttempts = 0;
        this.setStatus('disconnected');
        try { this.client.quit('Caline IRC Client'); } catch { /* socket may already be dead */ }
    }

    dispose(): void {
        this.clearReconnectTimer();
        this.disconnect();
        this._onStatusChange.dispose();
        this._onChannelsChanged.dispose();
        this._onMembersChanged.dispose();
        this._onDmReceived.dispose();
    }

    joinChannel(channel: string): void {
        if (this._status === 'connected') { this.client.join(channel); }
    }

    leaveChannel(channel: string): void {
        if (this._status === 'connected') { this.client.part(channel); }
    }

    sendMessage(target: string, message: string): void {
        if (this._status !== 'connected') { return; }
        this.client.say(target, message);
        this.output.appendMessage(this.config.name, target, `<${this._currentNick}> ${message}`);
    }

    // Connection lifecycle

    private createClient(): any {
        const c = new IRC.Client();
        this.bindEvents(c);
        return c;
    }

    private rawConnect(): void {
        this.client.connect({
            host: this.config.host,
            port: this.config.port,
            nick: this.config.nick,
            tls: this.config.tls,
            password: this.config.password || undefined,
            auto_reconnect: false,
            rejectUnauthorized: false,
        });
    }

    private setStatus(status: ConnectionStatus): void {
        this._status = status;
        this._onStatusChange.fire(status);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
    }

    private scheduleReconnect(): void {
        if (this._status === 'disconnected') { return; }

        const cfg = vscode.workspace.getConfiguration('caline');
        const enabled = cfg.get<boolean>('reconnect', true);
        const delay = cfg.get<number>('reconnectDelay', 5000);
        const maxRetries = cfg.get<number>('reconnectMaxRetries', 10);

        if (!enabled || this.reconnectAttempts >= maxRetries) {
            this.setStatus('disconnected');
            if (this.reconnectAttempts >= maxRetries) {
                this.output.appendServerMessage(this.config.name, `Reconnection failed after ${maxRetries} attempts.`);
            }
            return;
        }

        this.setStatus('reconnecting');
        this.reconnectAttempts++;
        this.output.appendServerMessage(
            this.config.name,
            `Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${maxRetries})...`,
        );

        this.clearReconnectTimer();
        this.reconnectTimer = setTimeout(() => {
            this.client = this.createClient();
            this.rawConnect();
        }, delay);
    }

    private handleDisconnect(): void {
        this.output.appendServerMessage(this.config.name, 'Connection closed.');
        this.store.clear();
        this._onChannelsChanged.fire();
        this.scheduleReconnect();
    }

    private applyResult(r: HandlerResult): void {
        if (r.channelsChanged) { this._onChannelsChanged.fire(); }
        if (r.membersChanged) {
            for (const ch of r.membersChanged) { this._onMembersChanged.fire(ch); }
        }
    }

    private resolveTarget(event: { target: string; nick: string }): { target: string; isDm: boolean } {
        const isDm = event.target === this._currentNick;
        return { target: isDm ? event.nick : event.target, isDm };
    }

    // Event binding

    private bindEvents(c: any): void {
        const server = this.config.name;

        c.on('socket connected', () => {
            this.output.appendServerMessage(server, `Connected to ${server}...`);
        });

        c.on('registered', () => {
            this.setStatus('connected');
            this._currentNick = c.user.nick;
            this.reconnectAttempts = 0;
            this.output.appendServerMessage(server, `Connected as ${this._currentNick}`);
            for (const ch of this.config.autoJoin) { this.joinChannel(ch); }
        });

        c.on('error', (e: { error: string; reason?: string }) => {
            this.output.appendServerMessage(server, `Error: ${e.reason || e.error || 'Unknown error'}`);
        });

        c.on('close', () => this.handleDisconnect());
        c.on('socket close', () => this.handleDisconnect());

        c.on('message', (e: { target: string; nick: string; message: string }) => {
            const { target, isDm } = this.resolveTarget(e);
            if (isDm) { this._onDmReceived.fire(e.nick); }
            this.output.appendMessage(server, target, `<${e.nick}> ${e.message}`);
        });

        c.on('action', (e: { target: string; nick: string; message: string }) => {
            const { target, isDm } = this.resolveTarget(e);
            if (isDm) { this._onDmReceived.fire(e.nick); }
            this.output.appendMessage(server, target, `* ${e.nick} ${e.message}`);
        });

        c.on('notice', (e: { target: string; nick: string; message: string }) => {
            if (e.target === '*' || !e.target) {
                this.output.appendServerMessage(server, `[NOTICE] ${e.nick}: ${e.message}`);
            } else {
                const { target } = this.resolveTarget(e);
                this.output.appendMessage(server, target, `[NOTICE] <${e.nick}> ${e.message}`);
            }
        });

        c.on('join', (e: any) => this.applyResult(handleJoin(e, this._currentNick, this.store, this.output, server)));
        c.on('part', (e: any) => this.applyResult(handlePart(e, this._currentNick, this.store, this.output, server)));
        c.on('quit', (e: any) => this.applyResult(handleQuit(e, this.store, this.output, server)));
        c.on('kick', (e: any) => this.applyResult(handleKick(e, this._currentNick, this.store, this.output, server)));

        c.on('nick', (e: { nick: string; new_nick: string }) => {
            if (e.nick === this._currentNick) { this._currentNick = e.new_nick; }
            this.applyResult(handleNick(e, this.store, this.output, server));
        });

        c.on('topic', (e: any) => handleTopic(e, this.store, this.output, server));
        c.on('userlist', (e: any) => this.applyResult(handleUserlist(e, this.store)));
        c.on('mode', (e: any) => this.applyResult(handleMode(e, this.store)));
    }
}
