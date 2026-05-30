import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const MockMode = () =>   {
    const location = useLocation();
    const roomDetails = location.state?.roomDetails;
    const problem = location.state?.problem;

    // useEffect(() => {
    //     const ACCESS_TOKEN_REFRESH
    // }, [])

    return (
        <div className="h-screen flex flex-col bg-bg-base overflow-hidden relative">
            <div className="absolute z-50 h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-bg-base/50">
                <div className="box-content bg-accent rounded-xl p-4 text-center">
                <div className="flex items-center gap-2 h-auto">
                    {
                        roomDetails?.code.split("").map((curr, i) => (
                            <span 
                                key={`${curr}-${i}`}
                                className="bg-accent-dark p-4 rounded-md inline-block font-mono text-center"
                            >
                                {curr}
                            </span>
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
                     <span className="bg-accent-dark/15 text-accent border-1 border-accent p-2 rounded-2xl">{roomDetails?.testMode.toLowerCase()} mode</span>
                     <span className="text-text-secondary">{problem?.title} &middot; {problem?.difficulty.toLowerCase()}</span>
                </div>
                <div className="flex gap-4 text-sm items-center">
                    <button className="text-text-secondary border-1 px-4 py-2 rounded-xl border-bg-border">end session</button>
                </div>
            </header>
            <div className="flex">
                <div className="w-[220px]"></div>
                <div className="flex-1"></div>
                <div className="w-[180px]"></div>
            </div>
        </div>
    )
}

export default MockMode;