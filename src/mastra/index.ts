import { env } from 'cloudflare:workers';
import { Mastra } from '@mastra/core/mastra';
import { D1Store } from '@mastra/cloudflare-d1';
import {
  MastraPlatformExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { agent } from './agents/agent';
import { startScheduleTool, stopScheduleTool } from './tools/schedule-tools';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare'


export const mastra = new Mastra({
  agents: { agent },
  tools: { startScheduleTool, stopScheduleTool },
  storage: new D1Store({ id: 'd1-storage', binding: env.DB }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  deployer: new CloudflareDeployer({
    name: process.env.CLOUDFLARE_DEPLOYER_NAME || 'mastra',
    ai: {
      binding: 'AI',
    },
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'life-with-agent-db',
        database_id: '31559b36-27a5-4178-b9ae-73802390c156',
      },
    ],
  }),
});