import React from 'react';
import { Search } from 'lucide-react';

export default function FilterBar({ searchQuery, setSearchQuery, difficultyFilter, setDifficultyFilter }) {
  return (
    <div className="flex p-4 gap-4 border-b border-bg-border items-center">
      <div className="flex-1 flex items-center bg-bg-base border border-bg-border rounded-lg px-3 py-2 focus-within:border-accent transition-colors">
        <Search size={16} className="text-text-muted mr-2" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="search problems or categories..." 
          className="bg-transparent text-text-primary text-sm font-ui outline-none w-full placeholder-text-muted" 
        />
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => setDifficultyFilter('all')}
          className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'all' ? 'bg-bg-elevated border-text-secondary text-text-primary' : 'bg-bg-base border-bg-border text-text-secondary hover:bg-bg-elevated'}`}>
          all
        </button>
        <button 
          onClick={() => setDifficultyFilter('easy')}
          className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'easy' ? 'bg-[#0F1A14] border-[#0F6E56] text-success' : 'bg-bg-base border-bg-border text-success hover:bg-bg-elevated'}`}>
          easy
        </button>
        <button 
          onClick={() => setDifficultyFilter('medium')}
          className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'medium' ? 'bg-[#1A1400] border-[#854F0B] text-warning' : 'bg-bg-base border-bg-border text-warning hover:bg-bg-elevated'}`}>
          med
        </button>
        <button 
          onClick={() => setDifficultyFilter('hard')}
          className={`border rounded-lg px-3 py-2 text-xs transition-colors ${difficultyFilter === 'hard' ? 'bg-[#1A0D0D] border-[#A32D2D] text-error' : 'bg-bg-base border-bg-border text-error hover:bg-bg-elevated'}`}>
          hard
        </button>
      </div>
    </div>
  );
}
