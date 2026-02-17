import * as vscode from 'vscode';
import { ConnectionManager } from '../../irc/manager';
import { IrcTreeItem } from './treeItem';

export class ServerTreeProvider implements vscode.TreeDataProvider<IrcTreeItem>, vscode.Disposable {
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

        for (const [name, connection] of this.connectionManager.connections) {
            const item = new IrcTreeItem(
                name,
                'server',
                name,
                undefined,
                vscode.TreeItemCollapsibleState.None,
            );
            item.contextValue = connection.status === 'connected' ? 'connectedServer' : 'disconnectedServer';
            item.description = connection.status;
            item.tooltip = `${connection.config.host}:${connection.config.port} (${connection.status})`;
            item.iconPath = statusIcon(connection.status);
            item.command = {
                command: 'caline.selectServer',
                title: 'Select Server',
                arguments: [name],
            };
            items.push(item);
        }

        return items;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}

function statusIcon(status: string): vscode.ThemeIcon {
    switch (status) {
        case 'connected':
            return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('testing.iconPassed'));
        case 'connecting':
            return new vscode.ThemeIcon('loading~spin');
        case 'reconnecting':
            return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
        default:
            return new vscode.ThemeIcon('circle-outline');
    }
}
