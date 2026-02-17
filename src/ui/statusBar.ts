import * as vscode from 'vscode';
import { ConnectionManager } from '../irc/manager';

export class StatusBarManager implements vscode.Disposable {
  private channelItem: vscode.StatusBarItem;
  private statusItem: vscode.StatusBarItem;

  constructor(private connectionManager: ConnectionManager) {
    this.channelItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.channelItem.command = 'caline.sendMessage';
    this.channelItem.tooltip = 'Click to send a message';

    this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.statusItem.command = 'caline.connect';
    this.statusItem.tooltip = 'Click to connect/disconnect';

    this.update();
    this.channelItem.show();
    this.statusItem.show();
  }

  update(): void {
    const serverName = this.connectionManager.activeServer;
    const channelName = this.connectionManager.activeChannel;

    if (serverName && channelName) {
      this.channelItem.text = `$(comment-discussion) ${channelName}`;
    } else if (serverName) {
      this.channelItem.text = `$(comment-discussion) ${serverName}`;
    } else {
      this.channelItem.text = '$(comment-discussion) Caline IRC';
    }

    const connectedCount = Array.from(this.connectionManager.connections.values())
      .filter(c => c.status === 'connected').length;
    const totalCount = this.connectionManager.connections.size;

    if (totalCount === 0) {
      this.statusItem.text = '$(debug-disconnect) IRC: No servers';
    } else if (connectedCount === totalCount) {
      this.statusItem.text = `$(plug) IRC: Connected (${connectedCount})`;
    } else if (connectedCount > 0) {
      this.statusItem.text = `$(plug) IRC: ${connectedCount}/${totalCount}`;
    } else {
      const reconnecting = Array.from(this.connectionManager.connections.values())
        .some(c => c.status === 'reconnecting' || c.status === 'connecting');
      if (reconnecting) {
        this.statusItem.text = '$(sync~spin) IRC: Connecting...';
      } else {
        this.statusItem.text = '$(debug-disconnect) IRC: Disconnected';
      }
    }
  }

  dispose(): void {
    this.channelItem.dispose();
    this.statusItem.dispose();
  }
}
