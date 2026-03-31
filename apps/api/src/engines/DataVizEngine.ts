import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── DataVizEngine ────────────────────────────────────────────────────────────
//
// Generates interactive data visualization dashboards and charts:
//  - D3.js (custom SVG charts: force graphs, treemaps, sunbursts, arc diagrams)
//  - Chart.js (bar, line, pie, radar, bubble, scatter with animations)
//  - Observable Plot (statistical visualizations)
//  - ApexCharts (business dashboards)
//  - Plotly.js (scientific / financial charts)
//
// All output is CDN-based for instant blob preview.
// Generates realistic sample data matching the domain.

interface FileEntry { path: string; content: string; }
type VizLibrary = 'd3' | 'chartjs' | 'apexcharts' | 'plotly' | 'observable';

const VIZ_CDN: Record<VizLibrary, string> = {
  d3: '<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>',
  chartjs: '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>',
  apexcharts: `<script src="https://cdn.jsdelivr.net/npm/apexcharts@3.45.1/dist/apexcharts.min.js"></script>`,
  plotly: '<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>',
  observable: '<script src="https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6.13/dist/plot.umd.min.js"></script>',
};

export class DataVizEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '📊 Analyzing data visualization requirements...' }, timestamp: new Date().toISOString() });

      const plan = await this.planVisualization(task.prompt, meter);

      await emit({ type: 'log', data: { message: `📐 Library: ${plan.library} | Charts: ${plan.charts.join(', ')}` }, timestamp: new Date().toISOString() });

      const files: FileEntry[] = [];

      // Generate data file first
      await emit({ type: 'log', data: { message: '📦 Generating realistic sample dataset...' }, timestamp: new Date().toISOString() });
      const dataContent = await this.generateData(task.prompt, plan, meter);
      files.push({ path: 'data.json', content: dataContent });
      await emit({ type: 'file_created', data: { path: 'data.json', content: dataContent, language: 'json', index: 1, total: 4 }, timestamp: new Date().toISOString() });

      // Generate the dashboard HTML
      await emit({ type: 'log', data: { message: `⚡ Building ${plan.library} dashboard...` }, timestamp: new Date().toISOString() });
      const htmlContent = await this.buildDashboard(task.prompt, plan, dataContent, meter);
      files.push({ path: 'index.html', content: htmlContent });
      await emit({ type: 'file_created', data: { path: 'index.html', content: htmlContent, language: 'html', index: 2, total: 4 }, timestamp: new Date().toISOString() });

      // Generate CSS
      const cssContent = await this.generateDashboardCSS(plan.theme, meter);
      files.push({ path: 'style.css', content: cssContent });
      await emit({ type: 'file_created', data: { path: 'style.css', content: cssContent, language: 'css', index: 3, total: 4 }, timestamp: new Date().toISOString() });

      // README
      const readmeContent = this.buildReadme(task.prompt, plan);
      files.push({ path: 'README.md', content: readmeContent });
      await emit({ type: 'file_created', data: { path: 'README.md', content: readmeContent, language: 'markdown', index: 4, total: 4 }, timestamp: new Date().toISOString() });

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files, library: plan.library, chartTypes: plan.charts, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files, creditsUsed, message: `✅ ${plan.library} dashboard ready with ${plan.charts.length} chart types` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'DataVizEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan ─────────────────────────────────────────────────────────────────────

  private async planVisualization(prompt: string, meter: UsageMeter): Promise<{
    library: VizLibrary;
    charts: string[];
    theme: 'dark' | 'light';
    domain: string;
    metrics: string[];
  }> {
    const systemPrompt = `You are a data visualization expert. Return ONLY valid JSON:
{
  "library": "chartjs",
  "charts": ["line", "bar", "pie", "kpi-cards"],
  "theme": "dark",
  "domain": "SaaS business metrics",
  "metrics": ["MRR", "Churn Rate", "Active Users", "Revenue by Plan"]
}

Library selection:
- chartjs: business dashboards, KPI charts (line, bar, pie, radar, doughnut)
- d3: advanced custom charts (force graph, treemap, sankey, sunburst, arc diagram)
- apexcharts: professional business charts with animations and tooltips
- plotly: scientific/financial (candlestick, 3D scatter, heatmap, violin)
- observable: statistical analysis, distribution plots`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
    } catch { /* fallback */ }

    return {
      library: 'chartjs',
      charts: ['line', 'bar', 'doughnut'],
      theme: 'dark',
      domain: 'Business metrics',
      metrics: ['Revenue', 'Users', 'Growth'],
    };
  }

  // ─── Generate Data ────────────────────────────────────────────────────────────

  private async generateData(
    prompt: string,
    plan: { domain: string; metrics: string[]; charts: string[] },
    meter: UsageMeter
  ): Promise<string> {
    const systemPrompt = `You are a data generator. Create realistic sample JSON data for a ${plan.domain} dashboard.

Generate data for these metrics: ${plan.metrics.join(', ')}
For these chart types: ${plan.charts.join(', ')}

Structure the JSON to have:
- Time series data (12 months or 52 weeks) for line/bar charts
- Category breakdown data for pie/doughnut charts
- KPI summary values (current value, previous period, % change)
- All numbers must be realistic and internally consistent

Return ONLY valid JSON — no comments, no explanations.`;

    try {
      return await callClaudeHaiku(
        `Domain: ${plan.domain}\nMetrics: ${plan.metrics.join(', ')}\nPrompt context: ${prompt.slice(0, 300)}`,
        systemPrompt, 2048, meter
      );
    } catch {
      return JSON.stringify({
        timeSeries: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], values: [12000,15000,18000,14000,21000,25000,23000,27000,30000,28000,33000,38000] },
        categories: { labels: ['Category A','Category B','Category C','Category D'], values: [35,25,20,20] },
        kpis: [{ name: 'Total', value: 284000, change: 15.2 }, { name: 'Growth', value: 23.5, change: 3.1 }],
      }, null, 2);
    }
  }

  // ─── Build Dashboard ──────────────────────────────────────────────────────────

  private async buildDashboard(
    prompt: string,
    plan: { library: VizLibrary; charts: string[]; theme: string; domain: string; metrics: string[] },
    dataJson: string,
    meter: UsageMeter
  ): Promise<string> {
    const cdnScript = VIZ_CDN[plan.library];

    const systemPrompt = `You are an expert data visualization engineer. Build a complete, stunning dashboard.

LIBRARY: ${plan.library}
CDN: ${cdnScript}

ALSO INCLUDE:
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

DASHBOARD REQUIREMENTS:
1. LAYOUT: responsive grid (CSS Grid), sticky sidebar nav, top header with title
2. KPI CARDS: 4 metric cards with value, % change indicator (▲▼), sparkline
3. MAIN CHARTS: implement ALL of these: ${plan.charts.join(', ')}
4. FILTERS: date range selector (Last 7/30/90 days), category toggle buttons
5. THEME: ${plan.theme} — ${plan.theme === 'dark' ? 'bg:#0A0D14, cards:rgba(255,255,255,0.05)+backdrop-filter:blur(12px), text:#E2E8F0' : 'bg:#F8FAFC, cards:#FFFFFF with shadow, text:#1E293B'}
6. ANIMATIONS: GSAP CountUp on KPI values, fade-in on chart load, hover tooltips

CHART IMPLEMENTATION:
- All data comes from the embedded data.json (inline the JSON in a const DATA = {...})
- Each chart must have: responsive:true, animation, custom tooltip, legend
- Charts must update when filters change

TECHNICAL:
- Complete from <!DOCTYPE html> to </html>
- Embed the data JSON directly (no fetch needed for blob preview)
- CDN globals only — no ES6 imports
- All chart init inside DOMContentLoaded
- Output ONLY the HTML file content`;

    return await callClaudeSonnet(
      `Build dashboard for: ${prompt}\n\nDomain: ${plan.domain}\nMetrics: ${plan.metrics.join(', ')}\n\nSample data:\n${dataJson.slice(0, 2000)}`,
      systemPrompt, 8192, undefined, meter
    );
  }

  // ─── Dashboard CSS ────────────────────────────────────────────────────────────

  private async generateDashboardCSS(theme: string, meter: UsageMeter): Promise<string> {
    const systemPrompt = `Generate minimal CSS for a ${theme} data dashboard.
Include: custom scrollbar, chart container sizing, KPI card animations, tooltip styles, responsive breakpoints.
Output: raw CSS only, no fences.`;
    try {
      return await callClaudeHaiku('Generate dashboard theme CSS', systemPrompt, 1024, meter);
    } catch {
      return `* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${theme === 'dark' ? '#0A0D14' : '#F8FAFC'}; color: ${theme === 'dark' ? '#E2E8F0' : '#1E293B'}; font-family: system-ui, sans-serif; }
.chart-container { position: relative; height: 300px; }
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #6366F1; border-radius: 3px; }`;
    }
  }

  // ─── README ───────────────────────────────────────────────────────────────────

  private buildReadme(prompt: string, plan: any): string {
    return `# Dashboard: ${prompt.slice(0, 80)}

## Details
- **Library:** ${plan.library}
- **Charts:** ${plan.charts.join(', ')}
- **Theme:** ${plan.theme}

## How to view
Open \`index.html\` in any browser — no build step or server needed.

## Data
Sample data is embedded in \`data.json\` and inlined in \`index.html\`.
Replace with your real data by updating the \`DATA\` constant in the HTML.

## Customization
- Colors: edit CSS variables in \`style.css\`
- Data: update the \`DATA\` object in \`index.html\`
- Charts: each chart is initialized in the \`DOMContentLoaded\` listener
`;
  }
}
