export default function TestResultsPanel({ submitLoading, latestResult, submissions }) {
    return (
        <div className="w-[350px] flex flex-col px-6 pt-4 bg-bg-surface overflow-y-auto h-full min-h-0">
            <div className="mb-6">
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-4">
                    TEST RESULTS
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
                                Time: <span className="text-text-primary">{latestResult?.execution_time} ms</span>
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
                                {latestResult.actual_output !== undefined && (
                                    <div className="mt-2">
                                        <p className="text-xs text-text-secondary mb-1">Function Returned:</p>
                                        <pre className="text-sm bg-bg-elevated border border-bg-border p-3 rounded-md font-mono text-error overflow-x-auto">
                                            {JSON.stringify(latestResult.actual_output)}
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
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-4">
                    SUBMISSIONS
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
                                        Execution Time: {sub?.execution_time} ms
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
    );
}
