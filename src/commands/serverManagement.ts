import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';
import { ServerConfig } from '../types';

export async function disconnectCommand(cm: ConnectionManager, item?: { serverName: string }): Promise<void> {
  if (item?.serverName) {
    cm.disconnectServer(item.serverName);
    return;
  }

  const servers = [...cm.connections.keys()];
  if (servers.length === 0) {
    vscode.window.showInformationMessage('No servers connected.');
    return;
  }

  const picked = await vscode.window.showQuickPick(servers, {
    placeHolder: 'Select a server to disconnect from',
  });
  if (picked) {
    cm.disconnectServer(picked);
  }
}

export async function removeServerCommand(cm: ConnectionManager, item?: { serverName: string }): Promise<void> {
  let name = item?.serverName;

  if (!name) {
    const servers = [...cm.connections.keys()];
    if (servers.length === 0) {
      vscode.window.showInformationMessage('No servers to remove.');
      return;
    }
    name = await vscode.window.showQuickPick(servers, {
      placeHolder: 'Select a server to remove',
    });
  }
  if (!name) {
    return;
  }

  const answer = await vscode.window.showWarningMessage(`Remove server "${name}"?`, 'Yes', 'No');
  if (answer !== 'Yes') {
    return;
  }

  cm.removeServer(name);

  const config = vscode.workspace.getConfiguration('caline');
  const servers = config.get<ServerConfig[]>('servers', []);
  await config.update('servers', servers.filter(s => s.name !== name), vscode.ConfigurationTarget.Global);
}
