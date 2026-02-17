import * as vscode from 'vscode';
import { ConnectionManager } from '../../irc/manager';
import { ChannelMember } from '../../types';
import { IrcTreeItem } from './treeItem';

const byLabel = (a: IrcTreeItem, b: IrcTreeItem) =>
    a.label!.toString().localeCompare(b.label!.toString());

export class MemberTreeProvider implements vscode.TreeDataProvider<IrcTreeItem>, vscode.Disposable {
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
        const serverName = this.cm.activeServer;
        if (!serverName) {
            return [];
        }

        const channelName = this.cm.activeChannel;
        if (!channelName?.startsWith('#')) {
            return [];
        }
        return this.channelMembers(serverName, channelName);
    }

    private channelMembers(serverName: string, channelName: string): IrcTreeItem[] {
        const connection = this.cm.activeConnection;
        const channel = connection?.channels.get(channelName.toLowerCase());
        if (!channel) {
            return [];
        }

        const items = [...channel.members.values()].map((m) =>
            this.memberItem(serverName, channelName, m),
        );

        const ops = items.filter((i) => i.description === 'operator').sort(byLabel);
        const voiced = items.filter((i) => i.description === 'voice').sort(byLabel);
        const regular = items.filter((i) => !i.description).sort(byLabel);

        return [...ops, ...voiced, ...regular];
    }

    private memberItem(serverName: string, channelName: string, member: ChannelMember): IrcTreeItem {
        const isOp = member.modes.includes('o');
        const isVoice = member.modes.includes('v');
        const prefix = isOp ? '@' : isVoice ? '+' : '';

        const item = new IrcTreeItem(
            `${prefix}${member.nick}`,
            'member',
            serverName,
            channelName,
            vscode.TreeItemCollapsibleState.None,
        );
        item.contextValue = 'member';
        item.command = {
            command: 'caline.selectChannel',
            title: 'Open conversation',
            arguments: [serverName, member.nick],
        };

        if (isOp) {
            item.iconPath = new vscode.ThemeIcon('shield');
            item.description = 'operator';
        } else if (isVoice) {
            item.iconPath = new vscode.ThemeIcon('megaphone');
            item.description = 'voice';
        } else {
            item.iconPath = new vscode.ThemeIcon('person');
        }

        return item;
    }

    dispose(): void {
        this._onDidChangeTreeData.dispose();
    }
}
