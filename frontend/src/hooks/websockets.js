import {useEffect, useState, useRef} from "react";

import {fetchWithAuth} from "../utils/api";

export function useWebsocket(url)   {
    const [data, setData] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const heartBeatRef = useRef(null);
    const reconnCountRef = useRef(0);
    const timerRef = useRef(null);
    const missedPongRef = useRef(0);

    useEffect(() => {
        let isMounted = true;
        
        const initiateConn = async (url) =>    {
            try {

                const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/api/ping/`, {
                method: "GET"
                });
    
                if(res.ok)  {
                  if (!isMounted) return;
                  const wsConn = new WebSocket(url);
                  wsRef.current = wsConn;

                  wsConn.onopen = () =>    {
                      setIsConnected(true);
                      if(wsConn.readyState === WebSocket.OPEN) {
                        reconnCountRef.current = 0;
                        missedPongRef.current = 0;

                        wsRef.current.send(JSON.stringify({type: "ping"}))
                        missedPongRef.current += 1;
                      }
                      
                      heartBeatRef.current = setInterval(() =>    {
                        if (wsConn.readyState === WebSocket.OPEN)   {
                            if(missedPongRef.current >= 2)  {
                                wsRef.current.close();
                            }
                            else    {
                                missedPongRef.current += 1
                                wsRef.current.send(JSON.stringify({type: "ping"}))
                            }
                          }
                      }, 30000);
                  }
    
                  wsConn.onmessage = (event) => {
                    const data = event.data;
                    const parseData = JSON.parse(data);
                    
                    if(parseData.type === "pong") {
                        missedPongRef.current = 0;
                    }
                    else    {
                        setData(parseData);
                    }
                  }

                  wsConn.onclose = (event) =>  {
                    setIsConnected(false);
                    clearInterval(heartBeatRef.current);

                    if(event.code === 4000)   {
                        setData({type: "room_ended"});
                        wsRef.current = null;
                        return;
                    }
                    else if (event.code === 4001) {
                        setData({type: "force_disconnected"});
                        wsRef.current = null;
                        return;
                    }
                    else    {
                        let waitTime = Math.min( (2 ** reconnCountRef.current) * 1000, 10000);
                        
                        if(waitTime < 10 * 1000)   {
                            reconnCountRef.current += 1;
                        }
                        clearTimeout(timerRef.current);
                        timerRef.current = setTimeout(() => {
                            initiateConn(url);

                        }, waitTime);

                    }
                  };
            
                }
            }
            catch(e)   {
                console.error(e);

                let waitTime = Math.min( (2 ** reconnCountRef.current) * 1000, 10000);
                
                if(waitTime < 10 * 1000)   {
                    reconnCountRef.current += 1;
                }
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    initiateConn(url);

                }, waitTime);
            }             
        }
       
        initiateConn(url);

        return () => {
            isMounted = false;
            clearTimeout(timerRef.current);
            clearInterval(heartBeatRef.current);
            if(wsRef.current)   {
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        }

    }, [url]);

    return {data, isConnected, sendMessage: (details, eventType) => {
            if(wsRef.current && wsRef.current.readyState === WebSocket.OPEN)   {
                wsRef.current.send(JSON.stringify({data: details, type: eventType}))
            }
    }}
}
