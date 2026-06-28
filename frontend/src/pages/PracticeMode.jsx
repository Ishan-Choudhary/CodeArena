    import { useEffect, useState } from "react";
    import { useLocation, useNavigate } from "react-router-dom";
    import {toast} from "react-hot-toast";

    import Editor from "@monaco-editor/react";
    import ProblemDescription from "../components/ProblemDescription";
    import TestResultsPanel from "../components/TestResultsPanel";
    import ChatWindow from "../components/ChatWindow";
    import { useYjsMonaco } from "../hooks/useYjsMonaco";

    import { useWebsocket } from "../hooks/websockets";
    import { fetchWithAuth } from "../utils/api";
    import { useAuthStore } from "../store/authStore";


    const PracticeMode = () =>   {
        const navigate = useNavigate();
        const location = useLocation();
        const roomDetails = location.state?.roomDetails;
        const problem = location.state?.problem;

        const {data, isConnected, sendMessage} = useWebsocket(`${import.meta.env.VITE_WS_URL}/ws/practice/${roomDetails?.code}/`)
        const [loading, setLoading] = useState(false);
        const [submitLoading, setSubmtiLoading] = useState(false);

        const { handleEditorMount, getCode } = useYjsMonaco(roomDetails?.code, isConnected);
        
        const username = useAuthStore(state => state.username)
        const [chatMessages, setChatMessages] = useState([]);
        const [chatInput, setChatInput] = useState("");
        const [latestResult, setLatestResult] = useState(null);
        const [submissions, setSubmissions] = useState([]);
        const [isWaitingForLLM, setIsWaitingForLLM] = useState(false);



        useEffect(() => {
            if(data?.type === "room_ended") {
                toast.success("The session has been ended.");
                navigate("/");
            }
            else if(data?.type === "force_disconnected") {
                toast.error("Session transferred to another device.");
                navigate("/");
            }
            else if(data?.type === "submission.loading")    {
                setSubmtiLoading(true);
            }
            else if(data?.type === "submission.result") {
                setSubmtiLoading(false);
                setLatestResult(data);
                setSubmissions((prev) => [data, ...prev]);
            }
            else if(data?.type === "chat.message") {
                setChatMessages((prev) => [...prev, data]);
            }
            else if(data?.type === "chat.stream_start")  {
                setChatMessages((prev) => [...prev, {from: "receiver", message: ""}]);
            }
            else if(data?.type === "chat.stream_chunk")   {
                setChatMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex].message = data.text_so_far;
                    return newMessages;
                })
            }
            else if(data?.type === "chat.stream_end")   {
                setChatMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex].message = data.message;
                    return newMessages;
                })
                setIsWaitingForLLM(false);
            }
            else if(data?.type === "chat.stream_error") {
                setIsWaitingForLLM(false);
                toast.error(data.error_message);
            }
        }, [data, navigate]);


        const handleEndSesh = async () => {
            if(loading) return;
            setLoading(true);
            try {
                const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/rooms/${roomDetails?.code}/end/`, {
                    method: "POST"
                })
        
                if(!res.ok)    {
                    const response = await res.json();
                    toast.error(response.detail || "Failed to end session");
                }
            }
            catch(error)    {
                console.error(error);
                toast.error("Network error ending session");
            } finally   {
                setLoading(false);
            }
        }



        const handleSubmit = async () =>   {
            const codeContent = getCode();
            setSubmtiLoading(true);
            sendMessage({code: codeContent}, "submission.request");

        }

        const handleSendMessage = () => {
            if (!chatInput.trim()) return;
            setIsWaitingForLLM(true);
            sendMessage({ message: chatInput, role: "USER", code: getCode() }, "chat.message");
            setChatInput("");
        }


        return (
            <div className="h-screen flex flex-col bg-bg-base overflow-hidden relative">
                <header className="h-16 flex-shrink-0 flex justify-between items-center px-6 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border z-40 sticky top-0 font-bold">
                    <p className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer">code<span className="text-accent">arena</span></p>
                    <div className="flex gap-4 text-sm items-center">
                        <span className="bg-accent-dark/15 text-accent border border-accent p-2 rounded-2xl">{roomDetails?.testMode.toLowerCase()} mode</span>
                        <span className="text-text-secondary">{problem?.title} &middot; {problem?.difficulty.toLowerCase()}</span>
                    </div>
                    <div className="flex gap-4 text-sm items-center">
                        <button className="text-text-secondary border-1 px-4 py-2 rounded-xl border-bg-border" onClick={handleEndSesh}>end session</button>
                    </div>
                </header>
                <div className="flex-1 flex overflow-hidden min-h-0">
                    <ProblemDescription problem={problem} />
                    <div className="flex-1 pt-4 border-r border-bg-border px-6 flex flex-col bg-bg-base overflow-hidden min-w-0">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider m-0">EDITOR</p>
                            <button className="px-4 py-2 bg-accent hover:bg-accent-dark text-accent-light rounded-lg text-sm font-medium transition-colors disabled:opacity-50" onClick={handleSubmit} disabled={submitLoading}>submit code</button>
                        </div>
                        <div className="flex-[3] border border-bg-border rounded-xl overflow-hidden mb-4 min-h-0">
                            <Editor
                                height="100%"
                                language={roomDetails?.language.toLowerCase()}
                                theme="vs-dark"
                                onMount={handleEditorMount}
                            />
                        </div>
                        <div className="flex-[2] flex flex-col pb-6 min-h-0">
                            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2 flex-shrink-0">CHAT</p>
                            <ChatWindow 
                                chatMessages={chatMessages}
                                chatInput={chatInput}
                                setChatInput={setChatInput}
                                handleSendMessage={handleSendMessage}
                                currentUsername={username}
                                partnerUsername={"Partner"}
                                waitingForInterviewer={isWaitingForLLM}
                            />
                        </div>
                    </div>
                    <TestResultsPanel 
                        submitLoading={submitLoading} 
                        latestResult={latestResult} 
                        submissions={submissions} 
                    />
                </div>
            </div>
        )
    }

    export default PracticeMode;