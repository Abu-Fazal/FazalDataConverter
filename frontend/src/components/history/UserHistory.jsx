import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { HistoryTable } from './HistoryTable.jsx';
import { get } from '@/services/api.client';

export function UserHistory() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await get('/jobs');
        setData(res.data || []);
      } catch (err) {
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
    const timer = setTimeout(fetchHistory, 30000);
    return () => clearTimeout(timer);
  }, []);

  async function handleDownload(id, fileName) {
    navigate(`/converter/progress/${id}`);
  }

  async function handleDelete(id, fileName) {
    setDeleteConfirm({ id, fileName });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setData((prev) => prev.filter((item) => item.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  }

  function goBack() {
    navigate('/converter');
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <RefreshCw className="w-10 h-10 text-[#6366F1] animate-spin" />
        <h2 className="text-lg font-semibold text-text-primary">Loading history...</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="small" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Conversion History</h1>
            <p className="text-text-muted text-sm">
              Manage your uploaded and converted files.
            </p>
          </div>
        </div>
        <Button size="small">New Conversion</Button>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="bg-surface-primary rounded-xl border border-border-subtle p-6 shadow-lg w-full max-w-md">
            <h3 className="font-semibold text-text-primary mb-2">Delete file?</h3>
            <p className="text-text-secondary text-sm mb-6">
              Are you sure you want to delete "{deleteConfirm.fileName}"?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="small" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button size="small" variant="danger" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <HistoryTable
        data={data}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onCancel={(id) => {
          setData((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, status: 'cancelled', progress: 0 } : item,
            ),
          );
        }}
      />
    </div>
  );
}