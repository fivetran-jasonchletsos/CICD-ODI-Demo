import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/architecture', label: 'Architecture' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/runbook', label: 'Runbook' },
];

function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-full flex flex-col" style={{ background: 'var(--paper)' }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'rgba(11,18,32,0.96)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(6px)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
              <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--terraform)' }}>
                <Mark className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-semibold text-white text-[15px] tracking-tight truncate">CICD-ODI-Demo</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--terraform-bright)' }}>
                  Terraform + GitHub Actions for ODI
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `relative px-3 py-2 text-[13px] font-semibold uppercase tracking-wide font-mono transition-colors ${
                      isActive ? 'text-white' : 'text-white/60 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive && (
                        <span
                          className="absolute left-3 right-3 -bottom-[1px] h-[2px] rounded-full"
                          style={{ background: 'var(--gha)' }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-white/80 hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>

          {mobileOpen && (
            <div className="md:hidden pb-4 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <nav className="grid grid-cols-2 gap-1.5 text-sm">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-center font-semibold border font-mono text-[12px] uppercase tracking-wide ${
                        isActive ? 'text-white' : 'border-white/15 text-white/75 hover:bg-white/10'
                      }`
                    }
                    style={({ isActive }) =>
                      isActive ? { background: 'var(--terraform)', borderColor: 'var(--terraform)' } : undefined
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 page-enter">
        <Outlet />
      </main>

      <footer className="mt-16 border-t" style={{ background: 'var(--slate-deep)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-white/70">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: 'var(--terraform)' }}>
                <Mark className="h-4 w-4 text-white" />
              </div>
              <div className="font-semibold text-white">CICD-ODI-Demo</div>
            </div>
            <p className="leading-relaxed">
              An internal Fivetran SE teaching demo. Synthetic orders data, one Fivetran S3 connector,
              a small dbt project — wrapped in Terraform (infra-as-code) and GitHub Actions (CI/CD) so
              the DevOps mechanics, not the vertical, are the star.
            </p>
          </div>
          <div>
            <div className="eyebrow-light mb-2">Three-zone architecture</div>
            <p className="leading-relaxed">
              Source (S3 landing) to MDLS Data Lakehouse (Iceberg + Glue, bronze/silver/gold) to
              Consumers (DuckDB always-on, Athena always-on, Snowflake as-needed) — one copy of the
              data in S3, queried in place by every engine on top.
            </p>
          </div>
          <div>
            <div className="eyebrow-light mb-2">Built for</div>
            <p className="leading-relaxed">
              #se_demo_improvements, in reply to Aaron Dear — every other ODI demo in this workspace
              applies Terraform by hand with no PR-gated infra workflow. This repo is the template
              to replicate; see the Runbook page.
            </p>
          </div>
        </div>
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 text-[11px] text-white/45 flex flex-col sm:flex-row gap-1 sm:items-center sm:justify-between">
            <div>CICD-ODI-Demo — internal Fivetran SE reference, all data synthetic.</div>
            <div>Not a customer-facing demo.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
