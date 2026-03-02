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

    const lines = text.split('\n').filter(line => line.trim().length > 0);
    for (const line of lines) {
      if (line.startsWith('/')) {
        handleSlashCommand(connectionManager, line);
      } else if (channel) {
        connectionManager.sendMessage(line);
      }
    }
  });

  connectionManager.onNotification(({ type, server, channel, nick, message }) => {
    const label = type === 'dm' ? `DM from ${nick}` : `${nick} in ${channel}`;
    vscode.window.showInformationMessage(`${label}: ${message}`, 'Open').then((choice) => {
      if (choice === 'Open') {
        connectionManager.setActiveChannel(server, channel);
        chatPanel.show(server, channel);
      }
    });
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
