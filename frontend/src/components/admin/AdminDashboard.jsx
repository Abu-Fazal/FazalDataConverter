import { MetricCard } from './MetricCard.jsx';
import { FailedJobsTable } from './FailedJobsTable.jsx';
import { SecurityLogsTable } from './SecurityLogsTable.jsx';

/**
 * Admin Dashboard page (Chunk 5.5).
 * High-level metrics, failed conversion jobs, and immutable security logs.
 * Admin-only access enforced via RBAC middleware on the backend.
 */
export function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
          <p className="text-text-muted text-sm">
            System overview, failed jobs, and security audit logs.
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total Users" value="1,234" delta={12} type="users" />
        <MetricCard title="Conversions" value="58,901" delta={-3} type="conversions" />
        <MetricCard title="Failure Rate" value="2.4%" delta={0.5} type="failure" />
        <MetricCard title="System Status" value="Healthy" delta={0} type="status" />
        <MetricCard title="Maintenance Mode" value="Off" delta={0} type="status" />
      </div>

      <div className="space-y-8">
        <FailedJobsTable />
        <SecurityLogsTable />
      </div>
    </div>
  );
}
