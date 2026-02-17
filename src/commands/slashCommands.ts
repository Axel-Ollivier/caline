import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';

export function handleSlashCommand(cm: ConnectionManager, input: string): void {
  const parts = input.substring(1).split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  const connection = cm.activeConnection;
  if (!connection) {
    return;
  }

  switch (command) {
    case 'join':
      if (args[0]) {
        connection.joinChannel(args[0]);
      }
      break;
    case 'part':
    case 'leave':
      if (args[0]) {
        connection.leaveChannel(args[0]);
      } else if (cm.activeChannel) {
        connection.leaveChannel(cm.activeChannel);
      }
      break;
    case 'msg':
    case 'privmsg':
      if (args.length >= 2) {
        connection.sendMessage(args[0], args.slice(1).join(' '));
      }
      break;
    default:
      vscode.window.showWarningMessage(`Unknown command: /${command}`);
  }
}
