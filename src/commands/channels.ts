import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';
import { ServerConfig } from '../types';
import { IrcTreeItem } from '../ui/trees/treeItem';

export async function joinChannelCommand(cm: ConnectionManager): Promise<void> {
  const connection = cm.activeConnection;
  if (!connection) {
    vscode.window.showWarningMessage('No active server. Connect to a server first.');
    return;
  }

  const input = await vscode.window.showInputBox({
    prompt: 'Enter channel name to join',
    placeHolder: '#channel',
    validateInput: (v) => v ? undefined : 'Channel name is required',
  });

  if (input) {
    connection.joinChannel(input.startsWith('#') ? input : `#${input}`);
  }
}

export async function leaveChannelCommand(cm: ConnectionManager, item?: IrcTreeItem): Promise<void> {
  if (item?.itemType === 'channel' && item.channelName) {
    const connection = cm.connections.get(item.serverName);
    if (connection) {
      connection.leaveChannel(item.channelName);
    }
    return;
  }

  const connection = cm.activeConnection;
  if (!connection || !cm.activeChannel) {
    vscode.window.showWarningMessage('No active channel.');
    return;
  }

  connection.leaveChannel(cm.activeChannel);
}

export async function toggleAutoJoinCommand(item?: IrcTreeItem): Promise<void> {
  if (!item || item.itemType !== 'channel' || !item.channelName) {
    return;
  }

  const serverName = item.serverName;
  const channelName = item.channelName;

  const config = vscode.workspace.getConfiguration('caline');

  const servers = config.get<ServerConfig[]>('servers', []);

  const serverIndex = servers.findIndex(s => s.name === serverName);
  if (serverIndex === -1) {
    vscode.window.showWarningMessage(`Server "${serverName}" not found in configuration.`);
    return;
  }

  const server = { ...servers[serverIndex] };
  const autoJoin = [...(server.autoJoin || [])];

  const idx = autoJoin.indexOf(channelName);
  if (idx >= 0) {
    autoJoin.splice(idx, 1);
    vscode.window.showInformationMessage(`Removed ${channelName} from auto-join on ${serverName}.`);
  } else {
    autoJoin.push(channelName);
    vscode.window.showInformationMessage(`Added ${channelName} to auto-join on ${serverName}.`);
  }

  server.autoJoin = autoJoin;
  const updatedServers = [...servers];
  updatedServers[serverIndex] = server;

  await config.update('servers', updatedServers, vscode.ConfigurationTarget.Global);
}
