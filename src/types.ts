export interface ServerConfig {
  name: string;
  host: string;
  port: number;
  nick: string;
  tls: boolean;
  password?: string;
  autoJoin: string[];
}

export interface ChannelMember {
  nick: string;
  modes: string[];
}

export interface ChannelState {
  name: string;
  topic: string;
  members: Map<string, ChannelMember>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface MessageOutput {
  appendMessage(serverName: string, channel: string, message: string): void;
  appendServerMessage(serverName: string, message: string): void;
}
