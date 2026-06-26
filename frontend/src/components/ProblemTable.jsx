import React from 'react';

const ProblemTable = React.memo(({ filteredProblems, loading, selectedProblem, setSelectedProblem }) => {
  const getDifficultyStyles = (diff) => {
    switch(diff?.toLowerCase()) {
      case 'easy': return 'bg-[#0F1A14] text-success border-[#0F6E56]';
      case 'medium': return 'bg-[#1A1400] text-warning border-[#854F0B]';
      case 'hard': return 'bg-[#1A0D0D] text-error border-[#A32D2D]';
      default: return 'bg-bg-elevated text-text-secondary border-bg-border';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      {loading ? (
        <div className="p-8 text-center text-text-secondary animate-pulse">loading problems...</div>
      ) : (
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="sticky top-0 bg-bg-surface border-b border-bg-border shadow-sm z-10">
            <tr>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-12">#</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Title</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-32">Diff</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-32">Category</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.length > 0 ? (
              filteredProblems.map((prob, idx) => {
                const isSelected = selectedProblem?.id === prob.id;
                return (
                  <tr 
                    key={prob.id}
                    onClick={() => setSelectedProblem(prob)}
                    className={`group border-b border-bg-border/50 cursor-pointer transition-colors ${isSelected ? 'bg-bg-elevated' : 'hover:bg-bg-base/80'}`}
                  >
                    <td className="p-4 text-sm text-text-muted group-hover:text-text-secondary transition-colors">{idx + 1}</td>
                    <td className="p-4 text-sm font-medium text-text-primary">{prob.title}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${getDifficultyStyles(prob.difficulty)}`}>
                        {prob.difficulty || 'easy'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{prob.category || 'arrays'}</td>
                    <td className="p-4 text-sm text-text-muted">-</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-sm text-text-secondary">
                  No problems found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
});

export default ProblemTable;
