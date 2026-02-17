import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';
import { ChatPanel } from '../ui/chat';
import { joinChannelCommand, leaveChannelCommand } from './channels';
import { connectCommand } from './connect';
import { newPrivateMessageCommand } from './privateMessage';
import { disconnectCommand, removeServerCommand } from './serverManagement';

export { handleSlashCommand } from './slashCommands';

export function registerCommands(cm: ConnectionManager, chatPanel: ChatPanel): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand('caline.connect', (item) => connectCommand(cm, chatPanel, item)),
    vscode.commands.registerCommand('caline.disconnect', (item) => disconnectCommand(cm, item)),
    vscode.commands.registerCommand('caline.removeServer', (item) => removeServerCommand(cm, item)),
    vscode.commands.registerCommand('caline.joinChannel', () => joinChannelCommand(cm)),
    vscode.commands.registerCommand('caline.leaveChannel', (item) => leaveChannelCommand(cm, item)),
    vscode.commands.registerCommand('caline.sendMessage', () => chatPanel.focusInput()),
    vscode.commands.registerCommand('caline.newPrivateMessage', () => newPrivateMessageCommand(cm, chatPanel)),
    vscode.commands.registerCommand('caline.selectServer', (name: string) => {
      cm.setActiveServer(name);
      chatPanel.show(name);
    }),
    vscode.commands.registerCommand('caline.selectChannel', (server: string, channel: string) => {
      cm.setActiveChannel(server, channel);
      chatPanel.show(server, channel);
    }),
  ];
}
