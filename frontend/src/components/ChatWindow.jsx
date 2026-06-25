import { useEffect, useRef } from "react";
import { Send } from "lucide-react";

export default function ChatWindow({ chatMessages, chatInput, setChatInput, handleSendMessage, currentUsername, partnerUsername }) {
    const endOfMessagesRef = useRef(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    

    return (
        <div className="flex-1 flex flex-col bg-bg-surface border border-bg-border rounded-xl overflow-hidden h-full">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {chatMessages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
                        Start the conversation...
                    </div>
                ) : (
                    chatMessages.map((msg, idx) => {
                        const isSender = msg.from === "sender" || msg.role === "USER";
                        const displayUsername = isSender ? currentUsername : partnerUsername;
                        
                        return (
                            <div key={idx} className={`flex flex-col max-w-[80%] ${isSender ? "self-end items-end" : "self-start items-start"}`}>
                                <span className="text-[10px] text-text-muted mb-1 px-1">
                                    {displayUsername}
                                </span>
                                <div className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                                    isSender 
                                        ? "bg-accent text-accent-light rounded-tr-sm" 
                                        : "bg-bg-elevated text-text-primary border border-bg-border rounded-tl-sm"
                                }`}>
                                    {msg.message || msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={endOfMessagesRef} />
            </div>
            
            <div className="p-3 border-t border-bg-border bg-bg-base flex items-end gap-2">
                <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-bg-elevated border border-bg-border rounded-xl py-2 px-4 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent transition-colors min-h-[40px] max-h-[120px]"
                    rows={1}
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || waitingForInterviewer}
                    className="p-2 bg-accent hover:bg-accent-dark text-accent-light rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
