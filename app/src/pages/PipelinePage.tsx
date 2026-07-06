import { useEffect, useState } from 'react';

const REPO = 'fivetran-jasonchletsos/CICD-ODI-Demo';
const API_URL = `https://api.github.com/repos/${REPO}/actions/runs?per_page=50`;

interface WorkflowDef {
  path: string;
  label: string;
  trigger: string;
  description: string;
}

const WORKFLOWS: WorkflowDef[] = [
  {
    path: '.github/workflows/terraform-plan.yml',
    label: 'terraform-plan',
    trigger: 'pull_request → infra/**',
    description: 'Posts a terraform plan as a PR comment before any infra change merges.',
  },
  {
    path: '.github/workflows/terraform-apply.yml',
    label: 'terraform-apply',
    trigger: 'push to main → infra/**',
    description: 'Applies infra changes, gated by a manual-approval GitHub Environment.',
  },
  {
    path: '.github/workflows/bootstrap-mdls.yml',
    label: 'bootstrap-mdls',
    trigger: 'workflow_dispatch only',
    description: 'One-time MDLS destination creation via the Fivetran REST API. Never scheduled.',
  },
  {
    path: '.github/workflows/generate_and_sync.yml',
    label: 'generate_and_sync',
    trigger: 'schedule (daily) + workflow_dispatch',
    description: 'Generates a delta of synthetic orders, uploads to the landing bucket, forces a Fivetran sync.',
  },
  {
    path: '.github/workflows/dbt_run.yml',
    label: 'dbt_run',
    trigger: 'schedule + workflow_dispatch',
    description: 'Builds + tests the dbt project on DuckDB with zero secrets, then refreshes app/public/data.',
  },
  {
    path: '.github/workflows/deploy.yml',
    label: 'deploy',
    trigger: 'push to main → app/**',
    description: 'Builds the frontend and deploys it to GitHub Pages.',
  },
];

interface GhRun {
  id: number;
  name: string;
  path: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  event: string;
}

interface RunInfo {
  status: string;
  conclusion: string | null;
  updated_at: string;
  html_url: string;
  event: string;
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusPill({ run }: { run: RunInfo | undefined }) {
  if (!run) return <span className="status-pill neutral">Not yet run</span>;
  if (run.status !== 'completed') return <span className="status-pill warn">{run.status}</span>;
  if (run.conclusion === 'success') return <span className="status-pill good">success</span>;
  if (run.conclusion === 'failure') return <span className="status-pill bad">failure</span>;
  return <span className="status-pill neutral">{run.conclusion ?? 'unknown'}</span>;
}

export default function PipelinePage() {
  const [runsByPath, setRunsByPath] = useState<Record<string, RunInfo> | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
        return res.json();
      })
      .then((data: { workflow_runs?: GhRun[] }) => {
        if (cancelled) return;
        const runs = data.workflow_runs ?? [];
        const latestByPath: Record<string, RunInfo> = {};
        for (const run of runs) {
          const existing = latestByPath[run.path];
          if (!existing || new Date(run.updated_at) > new Date(existing.updated_at)) {
            latestByPath[run.path] = {
              status: run.status,
              conclusion: run.conclusion,
              updated_at: run.updated_at,
              html_url: run.html_url,
              event: run.event,
            };
          }
        }
        setRunsByPath(latestByPath);
      })
      .catch((e) => !cancelled && setApiError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="eyebrow mb-3">Pipeline</div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
        Live workflow status
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed" style={{ color: 'var(--ink-muted)' }}>
        Pulled straight from the public GitHub REST API for{' '}
        <code className="inline-code">{REPO}</code> — no auth token required for a public repo. If this
        repo hasn't been pushed to GitHub yet, or none of the six workflows below have run, every row
        shows "Not yet run" rather than erroring.
      </p>

      {apiError && (
        <div className="mt-6 card p-4 text-[13px]" style={{ borderColor: 'var(--warn)', color: 'var(--ink-muted)' }}>
          <span className="status-pill warn mr-2">API unavailable</span>
          Could not reach the GitHub Actions API for <code className="inline-code">{REPO}</code> ({apiError}).
          This is expected if the repo isn't pushed to GitHub yet — the six workflows below are shown from
          the static definitions in <code className="inline-code">.github/workflows/</code>.
        </div>
      )}

      <div className="mt-8 card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Trigger</th>
              <th>Status</th>
              <th>Last run</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {WORKFLOWS.map((wf) => {
              const run = runsByPath?.[wf.path];
              return (
                <tr key={wf.path}>
                  <td>
                    <div className="font-semibold" style={{ color: 'var(--ink-strong)' }}>{wf.label}</div>
                    <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>{wf.description}</div>
                  </td>
                  <td className="font-mono text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>{wf.trigger}</td>
                  <td><StatusPill run={run} /></td>
                  <td className="text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                    {loading ? '…' : run ? relativeTime(run.updated_at) : '—'}
                  </td>
                  <td>
                    {run ? (
                      <a
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-semibold"
                        style={{ color: 'var(--gha)' }}
                      >
                        Open run →
                      </a>
                    ) : (
                      <span className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[12px]" style={{ color: 'var(--ink-soft)' }}>
        Matching is done by workflow file path from the GitHub Actions API response, so this table stays
        correct even before the repo has any runs — it just shows the six workflows as "Not yet run."
      </p>
    </div>
  );
}
