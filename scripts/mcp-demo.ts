/**
 * ДРУГИЙ БІК (крок 09): застосунок викликає ті самі інструменти.
 * Запуск: npx tsx scripts/mcp-demo.ts "код помилки E-418"
 */
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/client/stdio';

const query = process.argv[2] ?? 'код помилки E-418';
const clientLabel = process.env.MCP_CLIENT_LABEL ?? 'lab2-app';

const client = new Client({ name: clientLabel, version: '1.0.0' });

const transport = new StdioClientTransport({
  command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
  args: ['tsx', 'src/mcp/server.ts'],
  // НЕ ...process.env: інакше ви віддаєте серверу всі секрети застосунку.
  // MCP_CLIENT_LABEL — підпис у журналі сервера: за ним видно, що виклик ЗВІДСИ.
  env: { ...getDefaultEnvironment(), MCP_CLIENT_LABEL: clientLabel },
});

function show(result: Awaited<ReturnType<typeof client.callTool>>): void {
  // Тип блоку перевіряємо ДО читання .text — це канонічна форма з документації.
  for (const block of result.content) {
    if (block.type === 'text') console.log(block.text);
  }
  if (result.isError) console.log('^ це ВІДМОВА сервера, і вона очікувана');
}

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  for (const tool of tools) console.log(tool.name, '—', tool.description);

  show(await client.callTool({ name: 'search_corpus', arguments: { query, topK: 3 } }));
  show(await client.callTool({ name: 'fetch_chunk', arguments: { id: 'doc-01#0000' } }));

  // третій виклик навмисно за межею: доказ, що застосунок бачить відмову
  show(await client.callTool({ name: 'fetch_chunk', arguments: { id: 'doc-99#0000' } }));
} finally {
  // без close() процес сервера залишиться живим — порада з документації
  await client.close();
}
