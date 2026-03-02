import * as vscode from 'vscode';
import { MessageOutput, ServerConfig } from '../types';
import { IrcClient } from './client';

const DEFAULT_PORT = 6667;

export class ConnectionManager implements vscode.Disposable {
  private readonly _connections = new Map<string, IrcClient>();
  private _activeServer: string | undefined;
  private _activeChannel: string | undefined;
  private readonly _dmContacts = new Map<string, Set<string>>();
  private readonly _joinedChannels = new Map<string, string[]>();
  private readonly _unread = new Map<string, number>();

  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  private readonly _onNotification = new vscode.EventEmitter<{ type: 'dm' | 'mention'; server: string; channel: string; nick: string; message: string }>();
  readonly onNotification = this._onNotification.event;

  constructor(
    private readonly output: MessageOutput,
    private readonly state: vscode.Memento,
  ) {
    this.restoreDmContacts();
    this.restoreJoinedChannels();
  }

  get connections(): ReadonlyMap<string, IrcClient> {
    return this._connections;
  }

  get activeServer(): string | undefined {
    return this._activeServer;
  }

  get activeChannel(): string | undefined {
    return this._activeChannel;
  }

  get activeConnection(): IrcClient | undefined {
    return this._activeServer ? this._connections.get(this._activeServer) : undefined;
  }


  setActiveChannel(serverName: string, channelName: string): void {
    if (!channelName.startsWith('#')) {
      this.trackDm(serverName, channelName);
    }
    this.clearUnread(serverName, channelName);
    if (this._activeServer === serverName && this._activeChannel === channelName) {
      return;
    }
    this._activeServer = serverName;
    this._activeChannel = channelName;
    this._onDidChange.fire();
  }

  setActiveServer(serverName: string): void {
    if (this._activeServer === serverName && this._activeChannel === undefined) {
      return;
    }
    this._activeServer = serverName;
    this._activeChannel = undefined;
    this._onDidChange.fire();
  }


  connectServer(config: ServerConfig): void {
    const existing = this._connections.get(config.name);
    if (existing) {
      if (existing.status === 'disconnected') {
        existing.connect();
      }
      return;
    }

    const client = new IrcClient(config, this.output);

    client.onStatusChange((status) => {
      if (status === 'connected') {
        for (const ch of this.getPersistedChannels(config.name)) {
          client.joinChannel(ch);
        }
      }
      this._onDidChange.fire();
    });
    client.onChannelsChanged(() => {
      if (client.status === 'connected') {
        this.saveJoinedChannels(config.name, client);
      }
      this._onDidChange.fire();
    });
    client.onMembersChanged(() => this._onDidChange.fire());
    client.onDmReceived(({ nick, message }) => {
      this.trackDm(config.name, nick);
      if (this._activeServer !== config.name || this._activeChannel !== nick) {
        this.incrementUnread(config.name, nick);
        this._onNotification.fire({ type: 'dm', server: config.name, channel: nick, nick, message });
      }
    });
    client.onChannelMessage(({ channel }) => {
      if (this._activeServer !== config.name || this._activeChannel !== channel) {
        this.incrementUnread(config.name, channel);
      }
    });
    client.onMentionReceived(({ channel, nick, message }) => {
      if (this._activeServer !== config.name || this._activeChannel !== channel) {
        this._onNotification.fire({ type: 'mention', server: config.name, channel, nick, message });
      }
    });

    this._connections.set(config.name, client);
    client.connect();

    if (!this._activeServer) {
      this._activeServer = config.name;
    }

    this._onDidChange.fire();
  }

  disconnectServer(serverName: string): void {
    const client = this._connections.get(serverName);
    if (client) {
      client.disconnect();
      this._onDidChange.fire();
    }
  }

  removeServer(serverName: string): void {
    const client = this._connections.get(serverName);
    if (!client) {
      return;
    }

    client.dispose();
    this._connections.delete(serverName);
    this._dmContacts.delete(serverName);
    this._joinedChannels.delete(serverName);
    this.saveDmContacts();
    this.saveAllJoinedChannels();

    if (this._activeServer === serverName) {
      const first = this._connections.keys().next();
      this._activeServer = first.done ? undefined : first.value;
      this._activeChannel = undefined;
    }

    this._onDidChange.fire();
  }


  sendMessage(message: string): void {
    const client = this.activeConnection;
    if (!this._activeChannel || !client || client.status !== 'connected') {
      return;
    }

    if (!this._activeChannel.startsWith('#')) {
      this.trackDm(this._activeServer!, this._activeChannel);
    }

    client.sendMessage(this._activeChannel, message);
  }


  trackDm(serverName: string, nick: string): void {
    let contacts = this._dmContacts.get(serverName);
    if (!contacts) {
      contacts = new Set();
      this._dmContacts.set(serverName, contacts);
    }
    if (!contacts.has(nick)) {
      contacts.add(nick);
      this.saveDmContacts();
      this._onDidChange.fire();
    }
  }

  getDmContacts(serverName: string): string[] {
    const contacts = this._dmContacts.get(serverName);
    return contacts ? [...contacts].sort() : [];
  }

  getUnreadCount(serverName: string, channel: string): number {
    return this._unread.get(`${serverName}::${channel}`) ?? 0;
  }

  private incrementUnread(serverName: string, channel: string): void {
    const key = `${serverName}::${channel}`;
    this._unread.set(key, (this._unread.get(key) ?? 0) + 1);
    this._onDidChange.fire();
  }

  private clearUnread(serverName: string, channel: string): void {
    const key = `${serverName}::${channel}`;
    if (this._unread.has(key)) {
      this._unread.delete(key);
      this._onDidChange.fire();
    }
  }

  removeDmContact(serverName: string, nick: string): void {
    const contacts = this._dmContacts.get(serverName);
    if (contacts?.has(nick)) {
      contacts.delete(nick);
      this.saveDmContacts();
      this._onDidChange.fire();
    }
  }


  loadFromConfig(): void {
    const config = vscode.workspace.getConfiguration('caline');
    const servers = config.get<ServerConfig[]>('servers', []);

    for (const s of servers) {
      this.connectServer({
        name: s.name,
        host: s.host,
        port: s.port || DEFAULT_PORT,
        nick: s.nick,
        tls: s.tls || false,
        password: s.password,
        autoJoin: s.autoJoin || [],
      });
    }
  }

  private saveDmContacts(): void {
    const data: Record<string, string[]> = {};
    for (const [server, contacts] of this._dmContacts) {
      data[server] = [...contacts];
    }
    this.state.update('dmContacts', data);
  }

  private restoreDmContacts(): void {
    const data = this.state.get<Record<string, string[]>>('dmContacts', {});
    for (const [server, contacts] of Object.entries(data)) {
      this._dmContacts.set(server, new Set(contacts));
    }
  }


  private saveJoinedChannels(serverName: string, client: IrcClient): void {
    this._joinedChannels.set(serverName, [...client.channels.keys()]);
    this.saveAllJoinedChannels();
  }

  private saveAllJoinedChannels(): void {
    const data: Record<string, string[]> = {};
    for (const [server, channels] of this._joinedChannels) {
      data[server] = channels;
    }
    this.state.update('joinedChannels', data);
  }

  private getPersistedChannels(serverName: string): string[] {
    return this._joinedChannels.get(serverName) || [];
  }

  private restoreJoinedChannels(): void {
    const data = this.state.get<Record<string, string[]>>('joinedChannels', {});
    for (const [server, channels] of Object.entries(data)) {
      this._joinedChannels.set(server, channels);
    }
  }


  dispose(): void {
    for (const client of this._connections.values()) {
      client.dispose();
    }
    this._connections.clear();
    this._onDidChange.dispose();
    this._onNotification.dispose();
  }
}
