import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button.jsx';
import { Skeleton } from '../ui/skeleton.jsx';
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
        toast.error('Could not load conversion history', {
          description: 'Please check your connection and try again.',
        });
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
    toast.success('File removed from history', {
      description: deleteConfirm.fileName,
    });
    setDeleteConfirm(null);
  }

  function goBack() {
    navigate('/converter');
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading history">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
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
            <p className="text-text-secondary text-sm">
              Manage your uploaded and converted files.
            </p>
          </div>
        </div>
        <Button size="small" onClick={() => navigate('/converter')}>
          <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
          New Conversion
        </Button>
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
          toast.info('Conversion cancelled');
        }}
      />
    </div>
  );
}