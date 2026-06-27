import {useEffect, useState, useRef} from "react";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";

export function useReplayManager (replayData, playbackBounds)   {

    const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isScrubbing, setIsScrubbing] = useState(false);

    const isPlayRef = useRef(isPlaying);
    const yDocRef = useRef(null);
    const yTextRef = useRef(null);
    const editorRef = useRef(null);
    const bindingRef = useRef(null);
    const lastAppliedRef = useRef(0);

    useEffect(() => {
        if(!replayData) return;

        const yDoc = new Y.Doc();
        yDocRef.current = yDoc;

        lastAppliedRef.current = 0;
        
        if(editorRef.current)   {
            setupBinding(editorRef.current, yDoc);
        }

        return () =>    {
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
        }

    }, [replayData])

    useEffect(() => {
        if(isScrubbing || !yDocRef.current || !replayData?.timeline) return;

        const timeline = replayData.timeline;
        const currentAbsoluteTime = playbackBounds.startTime + elapsedTimeMs;

        let needsRebuild =  false;
        if(lastAppliedRef.current > 0)  {
            const lastAppliedChunkTime = new Date(timeline[lastAppliedRef.current - 1].time).getTime();
            if(currentAbsoluteTime < lastAppliedChunkTime)  {
                needsRebuild = true;
            }
        }
        
        let chunksToApply = []
        let i = needsRebuild ? 0 : lastAppliedRef.current;

        while(i < timeline.length)  {
            const chunkTime = new Date(timeline[i].time).getTime();
            if(chunkTime <= currentAbsoluteTime)    {
                chunksToApply.push(b64toUint8Array(timeline[i].update));
                i++;
            }
            else    {
                break;
            }
        }

        if (needsRebuild)   {
            if(bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
            yDocRef.current.destroy();

            const newDoc = new Y.Doc();
            yDocRef.current = newDoc;
            
            if (chunksToApply.length > 0)   {
                try {
                    const mergedUpdate = Y.mergeUpdates(chunksToApply);
                    Y.applyUpdate(yDocRef.current, mergedUpdate);
                    lastAppliedRef.current = i;
                }
                catch (err) {
                    console.error("Failed to apply update to timline ", err);
                }
            }

            if(editorRef.current)   {
                editorRef.current.getModel().setValue("");
                bindingRef.current = null;
                setupBinding(editorRef.current, newDoc);
            }

            lastAppliedRef.current = i;
        }
        else    {
            if(chunksToApply.length > 0)    {
                try {
                    const mergedUpdate = Y.mergeUpdates(chunksToApply);
                    Y.applyUpdate(yDocRef.current, mergedUpdate);
                    lastAppliedRef.current = i;
                }
                catch (err) {
                    console.error("failed to apply live update: ", err);
                }
            }
        }




    }, [elapsedTimeMs, isScrubbing, playbackBounds.startTime, replayData]);

    function setupBinding(editor, yDoc)  {
        if(bindingRef.current) return;
        const model = editor.getModel();
        
        const type = yDoc.getText("monaco");
        yTextRef.current = type;

        const binding = new MonacoBinding(
            type,
            model,
            new Set([editor])
        );

        bindingRef.current = binding;
    }

    function b64toUint8Array(chunkUpdate)    {
        const binaryString = atob(chunkUpdate);
        const bytes = new Uint8Array(binaryString.length);
        for(let i = 0; i < binaryString.length; i++)    {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return bytes;
    }

    const handleEditorMount = (editor, monaco) =>   {
        if(bindingRef.current && editorRef.current !== editor)  {
            bindingRef.current.destroy();
            bindingRef.current = null;
        }
        
        editorRef.current = editor;

        if(yDocRef.current) {
            setupBinding(editor, yDocRef.current);
        }
       
    }


    useEffect(() => {isPlayRef.current = isPlaying}, [isPlaying])
    
    const togglePlayPause = () => setIsPlaying(!isPlaying);

    const restart = () => {
        setElapsedTimeMs(0);
        setIsPlaying(true);
    };

    const seekTo = (time) => setElapsedTimeMs(time);
    
    const visibleChats = (replayData?.chats || []).filter(chat => new Date(chat.timestamp).getTime() <= playbackBounds.startTime + elapsedTimeMs);
    const visibleSubmissions = (replayData?.submissions || []).filter(submission => new Date(submission.submitted_at).getTime() <= playbackBounds.startTime + elapsedTimeMs);

    
    useEffect(() => {
        const stepSize = 100;
        const timer = setInterval(() => {
            if (!isPlayRef.current)  {
                return;
            }
            setElapsedTimeMs(prev => {
                let nextTime = prev + stepSize
                if(nextTime > playbackBounds.durationMs)  {
                    nextTime = playbackBounds.durationMs;
                    setIsPlaying(false);
                    clearInterval(timer);
                }

                return nextTime;
            });

            
        }, 100)


        return () =>    {
            clearInterval(timer);
        }
        
    }, [])

    return {elapsedTimeMs, isPlaying, controls: {togglePlayPause, seekTo, restart}, visibleChats, visibleSubmissions, handleEditorMount, setIsScrubbing};
}