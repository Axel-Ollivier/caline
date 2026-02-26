import * as vscode from 'vscode';
import { ConnectionManager } from '../../irc/manager';
import { ServerConfig } from '../../types';
import { IrcTreeItem } from './treeItem';

export class ChannelTreeProvider implements vscode.TreeDataProvider<IrcTreeItem>, vscode.Disposable {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<IrcTreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly connectionManager: ConnectionManager) { }

    private getAutoJoinMap(): Map<string, Set<string>> {
        const config = vscode.workspace.getConfiguration('caline');
        const servers = config.get<ServerConfig[]>('servers', []);
        const map = new Map<string, Set<string>>();
        for (const s of servers) {
            map.set(s.name, new Set(s.autoJoin || []));
        }
        return map;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }

    getTreeItem(element: IrcTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): IrcTreeItem[] {
        const items: IrcTreeItem[] = [];
        const autoJoinMap = this.getAutoJoinMap();

        for (const [serverName, connection] of this.connectionManager.connections) {
            if (connection.status !== 'connected') {
                continue;
            }

            const serverAutoJoin = autoJoinMap.get(serverName) || new Set<string>();

            for (const [, channelState] of connection.channels) {
                const active =
                    this.connectionManager.activeServer === serverName &&
                    this.connectionManager.activeChannel === channelState.name;

                const isAutoJoin = serverAutoJoin.has(channelState.name);

                const item = new IrcTreeItem(
                    channelState.name,
                    'channel',
                    serverName,
                    channelState.name,
                    vscode.TreeItemCollapsibleState.None,
                );
                item.contextValue = isAutoJoin ? 'channelAutoJoin' : 'channel';
                item.description = serverName;
                item.tooltip = `${channelState.topic || channelState.name}${isAutoJoin ? ' (auto-join)' : ''}`;
                item.iconPath = active
                    ? new vscode.ThemeIcon('comment-discussion', new vscode.ThemeColor('focusBorder'))
                    : new vscode.ThemeIcon('comment');
                item.command = {
                    command: 'caline.selectChannel',
                    title: 'Select Channel',
                    arguments: [serverName, channelState.name],
                };
                items.push(item);
            }

            for (const nick of this.connectionManager.getDmContacts(serverName)) {
                const active =
                    this.connectionManager.activeServer === serverName &&
                    this.connectionManager.activeChannel === nick;

                const item = new IrcTreeItem(
                    nick,
                    'member',
                    serverName,
                    nick,
                    vscode.TreeItemCollapsibleState.None,
                );
                item.contextValue = 'dmContact';
                item.description = serverName;
                item.iconPath = active
                    ? new vscode.ThemeIcon('mail', new vscode.ThemeColor('focusBorder'))
                    : new vscode.ThemeIcon('person');
                item.command = {
                    command: 'caline.selectChannel',
                    title: 'Open conversation',
                    arguments: [serverName, nick],
                };
                items.push(item);
            }
        }

        return items;
    }
}
