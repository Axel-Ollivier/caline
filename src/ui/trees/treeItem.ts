import * as vscode from 'vscode';

type TreeItemType = 'server' | 'channel' | 'member';

export class IrcTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly itemType: TreeItemType,
        public readonly serverName: string,
        public readonly channelName?: string,
        collapsibleState?: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState);
    }
}
