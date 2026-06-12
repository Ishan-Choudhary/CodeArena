    import { useEffect, useState, useRef } from "react";
    import { useLocation, useNavigate } from "react-router-dom";
    import {toast} from "react-hot-toast";

    import Markdown from "react-markdown"
    import Editor from "@monaco-editor/react";
    import * as Y from "yjs";
    import {WebsocketProvider} from "y-websocket";
    import {MonacoBinding} from "y-monaco";

    import { useWebsocket } from "../hooks/websockets";
    import { fetchWithAuth } from "../utils/api";
    import { useAuthStore } from "../store/authStore";


    const MockMode = () =>   {
        const navigate = useNavigate();
        const location = useLocation();
        const roomDetails = location.state?.roomDetails;
        const problem = location.state?.problem;

        const {data, sendMessage} = useWebsocket(`ws://127.0.0.1:8000/ws/room/${roomDetails?.code}/`)
        const [loading, setLoading] = useState(false);
        const [submitLoading, setSubmtiLoading] = useState(false);

        const editorRef = useRef(null);

        const yDocRef = useRef(null);
        const yTextRef = useRef(null);
        const providerRef = useRef(null);
        const bindingRef = useRef(null);
        const undoManagerRef = useRef(null);
        
        const username = useAuthStore(state => state.username)
        const [participantJoined, setParticipantJoined] = useState(false);
        const [latestResult, setLatestResult] = useState(null);
        const [submissions, setSubmissions] = useState([]);

        useEffect(() => {        
            const yDoc = new Y.Doc();
            const provider = new WebsocketProvider("ws://127.0.0.1:1234", roomDetails?.code, yDoc);

            yDocRef.current = yDoc;
            providerRef.current = provider;

            if(editorRef.current)   {
                setupBinding(editorRef.current, yDoc, provider);
            }

            return () =>    {
                if(bindingRef.current) {
                    bindingRef.current.destroy();
                    bindingRef.current = null;
                }
                provider.destroy();
                yDoc.destroy();
            }

        }, [roomDetails?.code]);

        useEffect(() => {
            if(data?.type === "participant_joined") {
                document.documentElement.style.setProperty("--partner-name", `"${data?.user}"`)
                setParticipantJoined(true);
            }
            else if(data?.type === "room_ended") {
                toast.success("The session has been ended.");
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
        }, [data, navigate]);


        const handleEndSesh = async () => {
            if(loading) return;
            setLoading(true);
            try {
                const res = await fetchWithAuth(`http://127.0.0.1:8000/api/rooms/${roomDetails?.code}/end/`, {
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

        const setupBinding = (editor, yDoc, provider) =>    {
            if(bindingRef.current) return;
            
            const model = editor.getModel()
            if(!model)  return;

            provider.awareness.setLocalStateField("user",{
                name: username,
                color: "#9fed2b",
            })
                    
            const type = yDoc.getText("monaco");
            
            yTextRef.current = type;

            const binding = new MonacoBinding(
                type, 
                model,
                new Set([editor]),
                provider.awareness,
            )

            bindingRef.current = binding;
            
            const yUndoManager = new Y.UndoManager(type, {
                trackedOrigins: new Set([binding])
            });
            
            undoManagerRef.current = yUndoManager;
            
            const setupInitialView = () =>  {
                if(type.toString().length === 0)    {
                    yDoc.transact(() => {
                        type.insert(0, problem?.starter_code?.[roomDetails?.language.toLowerCase()]);
                    }, "setup");
                }
                
                editor.layout();
                
                setTimeout(() => {
                    if (editor && editor.getModel()) {
                        editor.focus();
                        editor.setPosition({ lineNumber: 1, column: 1 });
                    }
                }, 100);
            };
            
            if(provider.synced) {
                setupInitialView();
            }
            else    {
                provider.once("sync", setupInitialView);
            }
                       
        }
        
        const handleEditorMount = (editor, monaco) =>   {
            editorRef.current = editor;

            const model = editor.getModel();

            if(model)   {
                model.setEOL(monaco.editor.EndOfLineSequence.LF);
            }

            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () =>    {
                undoManagerRef.current?.undo();
            })

            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () =>    {
                undoManagerRef.current?.redo();
            })

            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () =>    {
                undoManagerRef.current?.redo();
            })
            
            const yDoc = yDocRef.current;
            const provider = providerRef.current;

            if(!yDoc || !provider) return;
            
            if(yDoc && provider)    {
                setupBinding(editor, yDoc, provider);
            }

        }

        const handleSubmit = async () =>   {
            const codeContent = yTextRef.current.toString();
            
            setSubmtiLoading(true);
            sendMessage({code: codeContent}, "submission.request");

        }

        return (
            <div className="h-screen flex flex-col bg-bg-base overflow-hidden relative">
                <div className={`absolute z-50 h-screen w-full  flex-col items-center justify-center overflow-hidden bg-bg-base/50 ${participantJoined ? "hidden" : "flex"}`}>
                    <div className="box-content bg-accent rounded-xl p-4 text-center">
                        <div className="flex items-center gap-2 h-auto">
                            {
                                roomDetails?.code.split("").map((curr, i) => (
                                    <span 
                                        key={`${curr}-${i}`}
                                        className="bg-accent-dark p-4 rounded-md inline-block font-mono text-center"
                                    >
                                        {curr}</span>
                                ))
                            }
                        </div>
                        <h1 className="mt-2 font-bold">CODE</h1>
                        <p>Waiting for Participant</p>
                    </div>
                </div>
                <header className="h-16 flex justify-between items-center px-6 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border z-40 sticky top-0 font-bold">
                    <p className="font-medium text-xl text-text-primary hover:text-text-primary transition-colors cursor-pointer">code<span className="text-accent">arena</span></p>
                    <div className="flex gap-4 text-sm items-center">
                        <span className="bg-accent-dark/15 text-accent border border-accent p-2 rounded-2xl">{roomDetails?.testMode.toLowerCase()} mode</span>
                        <span className="text-text-secondary">{problem?.title} &middot; {problem?.difficulty.toLowerCase()}</span>
                    </div>
                    <div className="flex gap-4 text-sm items-center">
                        <button className="text-text-secondary border-1 px-4 py-2 rounded-xl border-bg-border" onClick={handleEndSesh}>end session</button>
                    </div>
                </header>
                <div className="flex h-full">
                    <div className="w-[420px] px-6 pt-2 border-2 border-bg-border">
                        <p className="text-text-secondary font-bold">PROBLEM</p>
                        <h1 className="text-text-primary text-2xl font-bold mb-2">{problem?.title}</h1>
                        <div className="w-full h-fit min-h-[100px] max-h-[600px] resize-y overflow-y-auto overflow-x-hidden border border-bg-border p-4 box-border ">
                            <Markdown>{problem?.description}</Markdown>
                        </div>
                    </div>
                    <div className="flex-1 pt-2 border-2 border-bg-border px-6">
                        <div className="flex justify-between items-end font-bold text-text-secondary mb-5 mt-2">
                            <p>EDITOR</p>
                            <button className="bg-accent text-text-primary px-2 py-2 rounded-xl" onClick={handleSubmit} disabled={submitLoading}>SUBMIT CODE</button>
                        </div>
                        <Editor
                            height="50vh"
                            language={roomDetails?.language.toLowerCase()}
                            theme="vs-dark"
                            onMount={handleEditorMount}
                        />
                        <div>
                            <p className="text-text-secondary font-bold mt-2">CHAT</p>
                            <div>

                            </div>
                        </div>
                    </div>
                    <div className="w-[350px] flex flex-col px-6 pt-2 border-t-2 border-bg-border overflow-y-auto">
                        
                        <div className="mb-6 mt-2">
                            <p className="text-text-secondary font-bold text-sm tracking-wider uppercase mb-4">
                                Test Results
                            </p>
                            
                            {submitLoading ? (
                                <p className="text-text-muted text-sm animate-pulse">Running code...</p>
                            ) : !latestResult ? (
                                <p className="text-text-muted text-sm">not submitted yet</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <span className={`font-bold text-lg ${latestResult.status === 'accepted' ? 'text-success' : 'text-error'}`}>
                                        {latestResult.status === 'wrong_answer' ? 'Wrong Answer' : 
                                        latestResult.status === 'accepted' ? 'Accepted' : 
                                        latestResult.status === 'timeout' ? 'Time Limit Exceeded' :
                                        latestResult.status === 'server_error' ? 'Server Error' : 'Runtime Error'}
                                    </span>

                                    {latestResult.execution_time && latestResult.execution_time !== -1 && (
                                        <span className="text-sm text-text-secondary">
                                            Time: <span className="text-text-primary">{latestResult.execution_time.toFixed(2)} ms</span>
                                        </span>
                                    )}

                                    {(latestResult.message || latestResult.traceback || latestResult.details) && (
                                        <div className="mt-2">
                                            <p className="text-xs text-text-secondary mb-1">
                                                {latestResult.message ? latestResult.message : "Error Traceback:"}
                                            </p>
                                            <pre className="text-xs bg-bg-elevated border border-bg-border p-3 rounded-md font-mono text-error overflow-x-auto whitespace-pre-wrap">
                                                {latestResult.traceback || latestResult.details || latestResult.message}
                                            </pre>
                                        </div>
                                    )}
                                    {latestResult.stdout && (
                                        <div className="mt-2">
                                            <p className="text-xs text-text-secondary mb-1">Standard Output (Logs):</p>
                                            <pre className="text-sm bg-bg-elevated border border-bg-border p-3 rounded-md font-mono text-text-primary overflow-x-auto">
                                                {latestResult.stdout}
                                            </pre>
                                        </div>
                                    )}

                                    {latestResult.status === 'wrong_answer' && (
                                        <>
                                            {latestResult.output !== undefined && (
                                                <div className="mt-2">
                                                    <p className="text-xs text-text-secondary mb-1">Function Returned:</p>
                                                    <pre className="text-sm bg-bg-elevated border border-bg-border p-3 rounded-md font-mono text-error overflow-x-auto">
                                                        {JSON.stringify(latestResult.output)}
                                                    </pre>
                                                </div>
                                            )}
                                            <div className="mt-2">
                                                <p className="text-xs text-text-secondary mb-1">Expected Output:</p>
                                                <pre className="text-sm bg-bg-elevated border border-bg-border p-3 rounded-md font-mono text-success overflow-x-auto">
                                                    {JSON.stringify(latestResult.expected_output)}
                                                </pre>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <hr className="border-bg-border mb-6" />

                        <div className="flex-1 pb-6">
                            <p className="text-text-secondary font-bold text-sm tracking-wider uppercase mb-4">
                                Submissions
                            </p>
                            
                            {submissions.length === 0 ? (
                                <p className="text-text-muted text-sm">no submissions yet</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {submissions.map((sub, idx) => (
                                        <div key={idx} className="bg-bg-elevated p-4 rounded-lg border border-bg-border flex flex-col gap-1">
                                            <div className={`font-bold ${sub.status === 'accepted' ? 'text-success' : 'text-error'}`}>
                                                {sub.status === 'wrong_answer' ? 'Wrong Answer' : 
                                                sub.status === 'accepted' ? 'Accepted' : 
                                                sub.status === 'timeout' ? 'Time Limit Exceeded' :
                                                sub.status === 'server_error' ? 'Server Error' : 'Runtime Error'}
                                            </div>
                                            {sub.status === 'accepted' ? (
                                                <div className="text-text-secondary text-xs">
                                                    Execution Time: {sub.execution_time.toFixed(2)} ms
                                                </div>
                                            ) : (
                                                <div className="text-text-secondary text-xs truncate">
                                                    {sub.traceback ? "Failed due to exception" : "Failed on test case"}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    export default MockMode;