export interface McpServerConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  command: string;
  transport: 'stdio' | 'sse';
  envVars?: Record<string, string>;
  enabled: boolean;
  status: 'connected' | 'disabled' | 'error';
  pingMs?: number;
  tools: string[];
}

export const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
  {
    id: 'brave_search',
    name: 'Brave Real-Time Web Search',
    description: 'Enables live internet browsing, webpage scraping, and web fact checking.',
    icon: '🌐',
    command: 'npx -y @modelcontextprotocol/server-brave-search',
    transport: 'stdio',
    enabled: true,
    status: 'connected',
    pingMs: 82,
    tools: ['brave_web_search', 'brave_local_search', 'fetch_webpage', 'extract_markdown'],
  },
  {
    id: 'github_tools',
    name: 'GitHub Developer Toolkit',
    description: 'Autonomous repository inspection, pull requests, issue filing, and branch code search.',
    icon: '🐙',
    command: 'npx -y @modelcontextprotocol/server-github',
    transport: 'stdio',
    enabled: true,
    status: 'connected',
    pingMs: 145,
    tools: ['search_repositories', 'create_issue', 'create_pull_request', 'get_file_contents', 'fork_repository'],
  },
  {
    id: 'filesystem_sandbox',
    name: 'Extended Filesystem Sandbox',
    description: 'High-speed recursive ripgrep search, AST code parsing, and safe disk manipulation.',
    icon: '📁',
    command: 'npx -y @modelcontextprotocol/server-filesystem',
    transport: 'stdio',
    enabled: true,
    status: 'connected',
    pingMs: 16,
    tools: ['read_file', 'write_file', 'list_directory', 'grep_search', 'directory_tree'],
  },
  {
    id: 'sqlite_postgres',
    name: 'Local Database & SQL Explorer',
    description: 'Query SQLite, PostgreSQL, and ChromaDB schemas and execute analytical queries.',
    icon: '🗄️',
    command: 'npx -y @modelcontextprotocol/server-postgres',
    transport: 'stdio',
    enabled: false,
    status: 'disabled',
    tools: ['query_database', 'list_tables', 'describe_schema', 'execute_transaction'],
  },
  {
    id: 'slack_messaging',
    name: 'Slack & Team Communications',
    description: 'Post automated notifications, read customer feedback threads, and report status.',
    icon: '💬',
    command: 'npx -y @modelcontextprotocol/server-slack',
    transport: 'stdio',
    enabled: false,
    status: 'disabled',
    tools: ['post_message', 'list_channels', 'get_thread_replies'],
  },
];
