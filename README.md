# Caline

IRC client for VS Code.

![Caline screenshot](resources/screenshot.png)

## Features

- Multiple server connections
- Sidebar with servers, channels and members
- Chat tabs (channels + DMs)
- Slash commands (`/join`, `/part`, `/msg`)
- Auto-join channels on connect
- Auto-reconnect with configurable retries
- TLS support
- Nick colours

## Quick start

1. Open the **Caline IRC** panel in the activity bar
2. Click the plug icon (or `Caline: Connect to IRC Server` in the command palette)
3. Enter server info
4. `/join #channel`

## Configuration

```jsonc
// settings.json
{
  "caline.servers": [
    {
      "name": "Libera Chat",
      "host": "irc.libera.chat",
      "port": 6697,
      "nick": "myNick",
      "tls": true,
      "autoJoin": ["#vscode"]
    }
  ],
  "caline.reconnect": true,
  "caline.reconnectDelay": 5000,
  "caline.reconnectMaxRetries": 10
}
```

### Server config

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes | | Display name |
| `host` | `string` | yes | | Hostname |
| `nick` | `string` | yes | | Nickname |
| `port` | `number` | | `6667` | Port |
| `tls` | `boolean` | | `false` | Use TLS |
| `password` | `string` | | | Server password |
| `autoJoin` | `string[]` | | `[]` | Channels to join on connect |

## Commands

| Command | Description |
|---|---|
| `Caline: Connect to IRC Server` | Connect to a server |
| `Caline: Disconnect from IRC Server` | Disconnect |
| `Caline: Join Channel` | Join a channel |
| `Caline: Leave Channel` | Leave current channel |
| `Caline: Send Message` | Focus the chat input |
| `Caline: New Private Message` | DM a user |
| `Caline: Remove Server` | Remove a server |

### Slash commands

| Command | Example |
|---|---|
| `/join` | `/join #general` |
| `/part` | `/part #general` |
| `/msg` | `/msg alice hey` |

## Requirements

VS Code 1.85+

## License

See [LICENSE](LICENSE).
