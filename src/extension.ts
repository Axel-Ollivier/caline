import * as vscode from 'vscode';
import { handleSlashCommand, registerCommands } from './commands';
import { ConnectionManager } from './irc/manager';
import { ChatPanel } from './ui/chat';
import { StatusBarManager } from './ui/statusBar';
import { ChannelTreeProvider, MemberTreeProvider, PeopleTreeProvider, ServerTreeProvider } from './ui/trees';

export function activate(context: vscode.ExtensionContext): void {
  const chatPanel = new ChatPanel();
  const connectionManager = new ConnectionManager(chatPanel, context.workspaceState);

  const serverTree = new ServerTreeProvider(connectionManager);
  const channelTree = new ChannelTreeProvider(connectionManager);
  const memberTree = new MemberTreeProvider(connectionManager);
  const peopleTree = new PeopleTreeProvider(connectionManager);
  const statusBar = new StatusBarManager(connectionManager);

  vscode.window.registerTreeDataProvider('calineServers', serverTree);
  vscode.window.registerTreeDataProvider('calineChannels', channelTree);
  vscode.window.registerTreeDataProvider('calineMembers', memberTree);
  vscode.window.registerTreeDataProvider('calinePeople', peopleTree);

  connectionManager.onDidChange(() => {
    serverTree.refresh();
    channelTree.refresh();
    memberTree.refresh();
    peopleTree.refresh();
    statusBar.update();
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
    peopleTree,
    ...registerCommands(connectionManager, chatPanel),
  );

  connectionManager.loadFromConfig();
}

export function deactivate(): void { }
