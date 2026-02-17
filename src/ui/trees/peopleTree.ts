import * as vscode from 'vscode';
import { ConnectionManager } from '../../irc/manager';
import { IrcTreeItem } from './treeItem';

export class PeopleTreeProvider implements vscode.TreeDataProvider<IrcTreeItem>, vscode.Disposable {
    private readonly _onDidChangeTreeData = new vscode.EventEmitter<IrcTreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private readonly cm: ConnectionManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: IrcTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): IrcTreeItem[] {
        const items: IrcTreeItem[] = [];

        for (const [serverName, connection] of this.cm.connections) {
            if (connection.status !== 'connected') {
                continue;
            }

            for (const nick of this.cm.getDmContacts(serverName)) {
                const active =
                    this.cm.activeServer === serverName &&
                    this.cm.activeChannel === nick;

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

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
