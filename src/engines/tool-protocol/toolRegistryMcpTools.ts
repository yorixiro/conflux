import type { McpResolvedToolDefinition } from '../mcpRuntime';
import type { AssistantToolContext } from './assistantToolProtocolTypes';
import type { PolarisToolDefinition } from './toolRegistryShared';

function buildMcpToolRules(tool: McpResolvedToolDefinition) {
  return [
    'MCP 工具补充规则：',
    '- 这类工具来自外部 MCP 服务，不是 Polaris 内建动作，也不是房间卡。',
    '- 按 schema 直接传参数对象，不要再额外包一层 `input` 或 `args`。',
    '- 需要查证背景、读取或搜索信息时，可以主动调用已启用的 MCP 读取工具，不必等用户明确点名；涉及外部写入、发布、删除或其他有副作用的动作，遵守用户授权和实际工具权限。',
    '- 工具返回后按真实结果继续推进，优先使用返回里的 ID、状态和 structuredContent；如果结果已经给出可操作对象，不要因为摘要太短而重复调用同一个宽泛查询。',
    `- \`${tool.schemaName}\` 会调用 MCP 服务「${tool.serverName}」上的工具 \`${tool.toolName}\`。`
  ];
}

export function resolveMcpToolDefinitions(
  context?: Pick<AssistantToolContext, 'mcpTools'>
): PolarisToolDefinition[] {
  return (context?.mcpTools ?? []).map((tool) => ({
    name: tool.schemaName,
    group: 'mcp',
    brief: tool.description || `调用 MCP 工具 ${tool.toolName}`,
    schema: {
      name: tool.schemaName,
      description: [
        `调用 MCP 服务「${tool.serverName}」上的工具 \`${tool.toolName}\`。`,
        tool.description || null
      ].filter(Boolean).join(' '),
      parameters: tool.inputSchema
    },
    rules: buildMcpToolRules(tool)
  }));
}
