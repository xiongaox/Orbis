import { useState } from 'react';
import './legacy.css'; // Keep using the legacy styles for now
import MainLayout from './components/Layout/MainLayout';
import BaziChart from './components/Bazi/BaziChart';
import type { Case } from './types';

function App() {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCaseUpdate = async () => {
    // Increment key to refresh list
    setRefreshKey(prev => prev + 1);
    // Also re-fetch current case if needed, or MainLayout/CaseList will handle it.
    // If selectedCase needs update, we might rely on the user re-selecting or manual fetch.
    // For now simple refresh of list. Ideally update selectedCase too.
    if (selectedCase) {
      // Optimistic or simple re-set to trigger re-render if we had data fetching here.
      // Actually, since selectedCase is just state, we should probably re-fetch it from service to get new data.
      // But for mock/simple implementation, let's assume CaseList parent refresh will eventually propagate or user re-clicks.
      // Better implementation:
      try {
        const { caseService } = await import('./services/caseService');
        const updated = await caseService.getCaseById(selectedCase.id);
        if (updated) setSelectedCase(updated);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <MainLayout
      onSelectCase={setSelectedCase}
      selectedCaseId={selectedCase?.id}
      refreshKey={refreshKey}
    >
      {selectedCase ? (
        <BaziChart data={selectedCase} onCaseUpdated={handleCaseUpdate} />
      ) : (
        <div className="empty-state">
          请选择一个案例查看排盘
        </div>
      )}
    </MainLayout>
  );
}

export default App;
