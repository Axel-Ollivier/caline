import * as vscode from 'vscode';
import { handleSlashCommand, registerCommands } from './commands';
import { ConnectionManager } from './irc/manager';
import { ChatPanel } from './ui/chat';
import { StatusBarManager } from './ui/statusBar';
import { ChannelTreeProvider, MemberTreeProvider, ServerTreeProvider } from './ui/trees';

export function activate(context: vscode.ExtensionContext): void {
  const chatPanel = new ChatPanel();
  const connectionManager = new ConnectionManager(chatPanel, context.workspaceState);

  const serverTree = new ServerTreeProvider(connectionManager);
  const channelTree = new ChannelTreeProvider(connectionManager);
  const memberTree = new MemberTreeProvider(connectionManager);
  const statusBar = new StatusBarManager(connectionManager);

  vscode.window.registerTreeDataProvider('calineServers', serverTree);
  vscode.window.registerTreeDataProvider('calineChannels', channelTree);
  vscode.window.registerTreeDataProvider('calineMembers', memberTree);
  connectionManager.onDidChange(() => {
    serverTree.refresh();
    channelTree.refresh();
    memberTree.refresh();
    statusBar.update();
  });

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('caline.servers')) {
      channelTree.refresh();
    }
  });

  chatPanel.onSendMessage(({ server, channel, text }) => {
    if (channel) {
      connectionManager.setActiveChannel(server, channel);
    } else {
      connectionManager.setActiveServer(server);
    }

    if (text.startsWith('/')) {
      handleSlashCommand(connectionManager, text);
    } else if (channel) {
      connectionManager.sendMessage(text);
    }
  });

  chatPanel.onTabFocused(({ server, channel }) => {
    if (channel) {
      connectionManager.setActiveChannel(server, channel);
    } else {
      connectionManager.setActiveServer(server);
    }
  });

  context.subscriptions.push(
    chatPanel,
    connectionManager,
    statusBar,
    serverTree,
    channelTree,
    memberTree,
    ...registerCommands(connectionManager, chatPanel),
  );

  connectionManager.loadFromConfig();
}

export function deactivate(): void { }
