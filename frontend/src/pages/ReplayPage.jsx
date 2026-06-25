import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Play, Pause, RotateCcw, Circle } from "lucide-react";

import ProblemDescription from "../components/ProblemDescription";
import TestResultsPanel from "../components/TestResultsPanel";
import ChatWindow from "../components/ChatWindow";

import { useReplayManager } from "../hooks/useReplayManager";

const formatTime = (ms) => {
  if (isNaN(ms) || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const ReplayPage = () => {
    const navigate = useNavigate();
    const location = useLocation();


    const roomDetails = location.state?.roomDetails;
    const problem = location.state?.problem;
    const replayData = location.state?.replayData || { timeline: [], submissions: [], chats: [] };
    const playbackBounds = location.state?.playbackBounds || { startTime: 0, endTime: 0, durationMs: 0 };
    

      const {
          elapsedTimeMs,
          isPlaying,
          controls: { togglePlayPause, seekTo, restart },
          visibleChats,
          visibleSubmissions,
          handleEditorMount,
          setIsScrubbing
      } = useReplayManager(replayData, playbackBounds);

    const hasChats = replayData.chats && replayData.chats.length > 0;

    return (
        <div className="h-screen flex flex-col bg-bg-base overflow-hidden relative">
            <header className="h-16 flex-shrink-0 flex justify-between items-center px-6 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border z-40 sticky top-0 font-bold">
                <div className="flex items-center gap-4">
                    <p className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer" onClick={() => navigate('/')}>
                        code<span className="text-accent">arena</span>
                    </p>
                    <div className="flex items-center gap-2 bg-error/10 text-error border border-error px-3 py-1 rounded-full text-xs animate-pulse">
                        <Circle size={8} fill="currentColor" />
                        REPLAYING
                    </div>
                </div>


                <div className="flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2 w-1/3 min-w-[400px]">
                    <div className="flex w-full items-center gap-4 bg-bg-elevated px-4 py-2 rounded-xl border border-bg-border shadow-sm">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={restart} className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-surface">
                                <RotateCcw size={16} />
                            </button>
                            <button onClick={togglePlayPause} className="text-accent hover:text-accent-dark transition-colors flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 shadow-inner">
                                {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                            </button>
                        </div>
                        
                        <div className="flex-1 flex items-center gap-3">
                            <span className="font-mono text-xs text-text-secondary w-10 text-right flex-shrink-0">
                                {formatTime(elapsedTimeMs)}
                            </span>
                            <input 
                                type="range" 
                                min="0" 
                                max={playbackBounds.durationMs || 100} 
                                value={elapsedTimeMs} 
                                onChange={(e) => seekTo(Number(e.target.value))}
                                onMouseDown={() => setIsScrubbing(true)}
                                onMouseUp={() => setIsScrubbing(false)}
                                className="w-full h-1 bg-bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                            />
                            <span className="font-mono text-xs text-text-secondary w-10 flex-shrink-0">
                                {formatTime(playbackBounds.durationMs)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 text-sm items-center">
                    <div className="flex items-center gap-3 mr-2">
                        {roomDetails?.code && (
                            <span className="bg-bg-elevated text-text-secondary border border-bg-border px-3 py-1 rounded-full text-[11px] font-mono">
                                ROOM: {roomDetails.code}
                            </span>
                        )}
                        {roomDetails?.testMode && (
                            <span className="bg-accent-dark/15 text-accent border border-accent px-3 py-1 rounded-full text-[11px] uppercase tracking-wider">
                                {roomDetails.testMode} MODE
                            </span>
                        )}
                        <span className="text-text-secondary">
                            {problem?.title} &middot; {problem?.difficulty?.toLowerCase()}
                        </span>
                    </div>
                    <button className="text-text-secondary border-1 px-4 py-2 rounded-xl border-bg-border hover:bg-bg-elevated transition-colors" onClick={() => navigate('/problems')}>
                        Leave Replay
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden min-h-0">
                <ProblemDescription problem={problem} />
                
                <div className="flex-1 pt-4 border-r border-bg-border px-6 flex flex-col bg-bg-base overflow-hidden min-w-0">
                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider m-0">EDITOR (READ ONLY)</p>
                    </div>
                    
                    <div className={`border border-bg-border rounded-xl overflow-hidden mb-4 min-h-0 ${hasChats ? 'flex-[3]' : 'flex-1'}`}>
                        <Editor
                            height="100%"
                            language={roomDetails?.language?.toLowerCase() || 'javascript'}
                            theme="vs-dark"
                            options={{
                                readOnly: true,
                                domReadOnly: true,
                                minimap: { enabled: false }
                            }}
                            onMount={handleEditorMount}
                        />
                    </div>
                    
                    {hasChats && (
                        <div className="flex-[2] flex flex-col pb-6 min-h-0">
                            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2 flex-shrink-0">CHAT REPLAY</p>
                            <ChatWindow 
                                chatMessages={visibleChats}
                                chatInput=""
                                setChatInput={() => {}}
                                handleSendMessage={() => {}}
                                currentUsername=""
                                partnerUsername="Partner"
                                readOnly={true}
                            />
                        </div>
                    )}
                </div>

                <TestResultsPanel 
                    submitLoading={false} 
                    latestResult={visibleSubmissions[visibleSubmissions.length - 1]} 
                    submissions={visibleSubmissions} 
                />
            </div>
        </div>
    );
};

export default ReplayPage;
