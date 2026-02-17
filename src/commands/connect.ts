import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';
import { ChatPanel } from '../ui/chat';
import { ServerConfig } from '../types';

export async function connectCommand(cm: ConnectionManager, chatPanel: ChatPanel, item?: { serverName: string }): Promise<void> {
  if (item?.serverName) {
    const connection = cm.connections.get(item.serverName);
    if (connection) {
      connection.connect();
      chatPanel.show(item.serverName);
    }
    return;
  }

  const config = vscode.workspace.getConfiguration('caline');
  const servers = config.get<ServerConfig[]>('servers', []);

  if (servers.length === 0) {
    const action = await vscode.window.showInformationMessage(
      'No IRC servers configured. Would you like to add one?',
      'Open Settings',
      'Quick Connect'
    );
    if (action === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'caline.servers');
    } else if (action === 'Quick Connect') {
      await quickConnect(cm, chatPanel);
    }
    return;
  }

  const configuredItems = servers.map(s => ({
    label: s.name,
    description: `${s.host}:${s.port || 6667}`,
    server: s,
  }));

  const picked = await vscode.window.showQuickPick(
    [...configuredItems, { label: '$(add) Quick Connect...', description: 'Connect to a new server', server: undefined }],
    { placeHolder: 'Select a server to connect to' }
  );

  if (!picked) {
    return;
  }

  if (!picked.server) {
    await quickConnect(cm, chatPanel);
    return;
  }

  const s = picked.server;
  cm.connectServer({
    ...s,
    port: s.port || 6667,
    tls: s.tls || false,
    autoJoin: s.autoJoin || [],
  });
  chatPanel.show(s.name);
}

async function quickConnect(cm: ConnectionManager, chatPanel: ChatPanel): Promise<void> {
  const host = await vscode.window.showInputBox({ prompt: 'IRC Server hostname', placeHolder: 'irc.libera.chat' });
  if (!host) { return; }

  const portStr = await vscode.window.showInputBox({ prompt: 'Port', placeHolder: '6667', value: '6667' });
  if (!portStr) { return; }

  const nick = await vscode.window.showInputBox({ prompt: 'Nickname', placeHolder: 'caline_user' });
  if (!nick) { return; }

  const tlsChoice = await vscode.window.showQuickPick(['No', 'Yes'], { placeHolder: 'Use TLS?' });
  if (!tlsChoice) { return; }

  const port = parseInt(portStr, 10);
  const tls = tlsChoice === 'Yes';
  const name = host.split('.').slice(0, -1).join('.') || host;
  const serverConfig: ServerConfig = { name, host, port, nick, tls, autoJoin: [] };

  cm.connectServer(serverConfig);

  const config = vscode.workspace.getConfiguration('caline');
  const servers = config.get<ServerConfig[]>('servers', []);
  servers.push(serverConfig);
  await config.update('servers', servers, vscode.ConfigurationTarget.Global);

  chatPanel.show(name);
}
