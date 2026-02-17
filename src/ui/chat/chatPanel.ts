import * as vscode from 'vscode';
import { MessageOutput } from '../../types';
import { MessageStore } from './messageStore';
import template from './template.html';
import { IncomingMessage, OutgoingMessage } from './types';

interface ChatTab {
    readonly panel: vscode.WebviewPanel;
    readonly server: string;
    readonly channel: string | undefined;
}

export class ChatPanel implements MessageOutput, vscode.Disposable {
    private readonly tabs = new Map<string, ChatTab>();
    private readonly store = new MessageStore();

    private readonly _onSendMessage = new vscode.EventEmitter<{
        server: string;
        channel: string;
        text: string;
    }>();
    readonly onSendMessage = this._onSendMessage.event;

    private readonly _onTabFocused = new vscode.EventEmitter<{
        server: string;
        channel: string | undefined;
    }>();
    readonly onTabFocused = this._onTabFocused.event;

    appendMessage(serverName: string, channel: string, message: string): void {
        const key = tabKey(serverName, channel);
        const text = `${timestamp()} ${message}`;
        this.store.pushMessage(key, text);
        this.postTo(key, { type: 'addMessage', text });
    }

    appendServerMessage(serverName: string, message: string): void {
        const text = `${timestamp()} ${message}`;
        this.store.pushSystem(serverName, text);
        this.postTo(serverName, { type: 'addMessage', text, cssClass: 'system' });
    }

    show(server?: string, channel?: string): void {
        if (!server) {
            return;
        }

        const key = channel ? tabKey(server, channel) : server;
        const existing = this.tabs.get(key);
        if (existing) {
            existing.panel.reveal();
            return;
        }

        this.openTab(key, server, channel);
    }

    focusInput(): void {
        const tab = this.activeTab();
        if (tab) {
            this.post(tab.panel, { type: 'focusInput' });
        }
    }

    dispose(): void {
        for (const tab of this.tabs.values()) {
            tab.panel.dispose();
        }
        this.tabs.clear();
        this._onSendMessage.dispose();
        this._onTabFocused.dispose();
    }

    private openTab(key: string, server: string, channel: string | undefined): void {
        const title = channel ?? server;
        const panel = vscode.window.createWebviewPanel(
            'calineChat',
            title,
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true },
        );

        panel.iconPath = tabIcon(channel);

        const tab: ChatTab = { panel, server, channel };
        this.tabs.set(key, tab);

        const nonce = generateNonce();
        const header = channel ? `${channel} @ ${server}` : server;
        panel.webview.html = renderTemplate(header, nonce);

        this.listen(key, tab);
    }

    private listen(key: string, { panel, server, channel }: ChatTab): void {
        panel.webview.onDidReceiveMessage((msg: IncomingMessage) => {
            if (msg.type === 'sendMessage') {
                this._onSendMessage.fire({ server, channel: channel ?? '', text: msg.text });
            } else if (msg.type === 'ready') {
                this.flush(key);
            }
        });

        panel.onDidChangeViewState((e) => {
            if (e.webviewPanel.active) {
                this._onTabFocused.fire({ server, channel });
            }
        });

        panel.onDidDispose(() => {
            this.tabs.delete(key);
            const active = this.activeTab();
            this._onTabFocused.fire({
                server: active?.server ?? server,
                channel: active?.channel,
            });
        });
    }

    private flush(key: string): void {
        const tab = this.tabs.get(key);
        if (tab) {
            this.post(tab.panel, { type: 'setMessages', messages: this.store.render(key) });
        }
    }

    private postTo(key: string, message: OutgoingMessage): void {
        const tab = this.tabs.get(key);
        if (tab) {
            this.post(tab.panel, message);
        }
    }

    private post(panel: vscode.WebviewPanel, message: OutgoingMessage): void {
        panel.webview.postMessage(message);
    }

    private activeTab(): ChatTab | undefined {
        for (const tab of this.tabs.values()) {
            if (tab.panel.active) {
                return tab;
            }
        }
        return undefined;
    }
}

function tabKey(server: string, channel: string): string {
    return `${server}/${channel}`;
}

function tabIcon(channel: string | undefined): vscode.ThemeIcon {
    if (!channel) {
        return new vscode.ThemeIcon('server');
    }
    return channel.startsWith('#')
        ? new vscode.ThemeIcon('comment')
        : new vscode.ThemeIcon('person');
}


function timestamp(): string {
    return `[${new Date().toLocaleTimeString()}]`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}

function renderTemplate(header: string, nonce: string): string {
    return template
        .replace('{{HEADER}}', escapeHtml(header))
        .replaceAll('{{NONCE}}', nonce);
}
