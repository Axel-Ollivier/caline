import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';
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
