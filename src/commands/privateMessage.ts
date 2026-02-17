import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';
import { ChatPanel } from '../ui/chat';

export async function newPrivateMessageCommand(cm: ConnectionManager, chatPanel: ChatPanel): Promise<void> {
  if (!cm.activeServer) {
    vscode.window.showWarningMessage('No active server. Connect to a server first.');
    return;
  }

  const nick = await vscode.window.showInputBox({
    prompt: 'Enter nickname to message',
    placeHolder: 'nickname',
    validateInput: (v) => v ? undefined : 'Nickname is required',
  });

  if (!nick) {
    return;
  }

  const server = cm.activeServer;
  cm.setActiveChannel(server, nick);
  chatPanel.show(server, nick);
  chatPanel.focusInput();
}
