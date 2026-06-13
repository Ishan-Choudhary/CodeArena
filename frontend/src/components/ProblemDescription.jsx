import Markdown from "react-markdown";

export default function ProblemDescription({ problem }) {
    return (
        <div className="w-[420px] px-6 pt-4 border-r border-bg-border flex flex-col bg-bg-surface h-full min-h-0">
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-4">PROBLEM</p>
            <h1 className="text-xl font-medium text-text-primary mb-4">{problem?.title}</h1>
            <div className="flex-1 overflow-y-auto text-sm text-text-secondary leading-relaxed p-4 bg-bg-base border border-bg-border rounded-xl mb-6">
                <Markdown>{problem?.description}</Markdown>
            </div>
        </div>
    );
}
