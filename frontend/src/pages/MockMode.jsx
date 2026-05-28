import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const MockMode = () =>   {
    const location = useLocation();
    const roomDetails = location.state?.roomDetails;
    const problem = location.state?.problem;


    return (
        <div className="h-screen flex flex-col bg-bg-base overflow-hidden">
            <header className="h-16 flex justify-between items-center px-6 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border z-50 sticky top-0 font-bold">
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