import * as vscode from 'vscode';
import { ConnectionManager } from '../../irc/manager';
import { IrcTreeItem } from './treeItem';

export class ChannelTreeProvider implements vscode.TreeDataProvider<IrcTreeItem>, vscode.Disposable {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<IrcTreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly connectionManager: ConnectionManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: IrcTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): IrcTreeItem[] {
        const items: IrcTreeItem[] = [];

        for (const [serverName, connection] of this.connectionManager.connections) {
            if (connection.status !== 'connected') {
                continue;
            }

            for (const [, channelState] of connection.channels) {
                const active =
                    this.connectionManager.activeServer === serverName &&
                    this.connectionManager.activeChannel === channelState.name;

                const item = new IrcTreeItem(
                    channelState.name,
                    'channel',
                    serverName,
                    channelState.name,
                    vscode.TreeItemCollapsibleState.None,
                );
                item.contextValue = 'channel';
                item.description = serverName;
                item.tooltip = channelState.topic || channelState.name;
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
        }

        return items;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
