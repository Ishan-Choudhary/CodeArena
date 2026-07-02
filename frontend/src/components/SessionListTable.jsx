import React from 'react';

export default function SessionListTable({ rooms, loadingRooms, username, handleRejoinRoom, handleReplay, handleDeleteRoom }) {
  return (
    <div className="overflow-auto bg-bg-base rounded-lg border border-bg-border max-h-[500px]">
      {loadingRooms ? (
        <div className="p-8 text-center text-text-secondary animate-pulse">loading sessions...</div>
      ) : (
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="sticky top-0 bg-bg-surface border-b border-bg-border shadow-sm z-10">
            <tr>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Room Code</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Host</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Language</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Mode</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider">Status</th>
              <th className="p-4 text-[10px] font-medium text-text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <tr key={room.code} className="group border-b border-bg-border/50 transition-colors hover:bg-bg-surface/50">
                  <td className="p-4 text-sm font-medium text-text-primary">{room.code}</td>
                  <td className="p-4 text-sm text-text-secondary">{room.host}</td>
                  <td className="p-4 text-sm text-text-secondary">{room.language}</td>
                  <td className="p-4 text-sm text-text-secondary">{room.testMode}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border bg-[#1A1400] text-warning border-[#854F0B]">
                      {room.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2 justify-end">
                    {(room.status === 'ACTIVE' || room.status === 'WAITING') && (room.host === username || room.participant === username) && (
                      <button 
                        onClick={() => handleRejoinRoom(room.code)}
                        className="text-xs bg-accent/20 text-accent hover:bg-accent/30 transition-colors px-3 py-1 rounded cursor-pointer"
                      >
                        Join
                      </button>
                    )}
                    {room.status === 'ENDED' && (
                      <button 
                        onClick={() => handleReplay(room.code)}
                        className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors px-3 py-1 rounded cursor-pointer"
                      >
                        Replay
                      </button>
                    )}
                    {room.host === username && (
                      <button 
                        onClick={() => handleDeleteRoom(room.code)}
                        className="text-xs bg-error/20 text-error hover:bg-error/30 transition-colors px-3 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-sm text-text-secondary">
                  No sessions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
