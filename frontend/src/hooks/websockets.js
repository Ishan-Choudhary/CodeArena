import {useEffect, useState, useRef} from "react";

import {fetchWithAuth} from "../utils/api";

export function useWebsocket(url)   {
    const [conState, setConState] = useState(false);
    const [data, setData] = useState(null);
    const wsRef = useRef(null);

    useEffect(() => {
        
        const initiateConn = async (url) =>    {
            try {

                const res = await fetchWithAuth("http://127.0.0.1:8000/api/ping/", {
                method: "GET"
                });
    
                if(res.ok)  {
                  const wsConn = new WebSocket(url);
                  wsRef.current = wsConn;

                  wsConn.onopen = (event) =>    {
                      setConState(true);

                      if(wsConn.readyState == WebSocket.OPEN) {
                        wsConn.send(JSON.stringify({type: "ping"}))
                      }
                      
                      wsConn.heartbeat = setInterval(() =>    {
                          if (wsConn.readyState === WebSocket.OPEN)   {
                              wsConn.send(JSON.stringify({type: "ping"}))
                          }
                      }, 5000);
                  }
    
                  wsConn.onmessage = (event) => {
                      const data = event.data;
                      const parseData = JSON.parse(data);
                      
                      if(parseData.type === "participant_joined") {
                          setData(parseData);
                      }

                      if(parseData.type === "room_ended")  {
                          setData(parseData);
                      }
                  }

                  wsConn.onclose = () =>  {
                      clearInterval(wsConn.heartbeat);
                      wsRef.current = null;
                      setConState(false);
                  };
            
                }
            }
            catch(e)   {
                console.error(e);
            }             
        }
       
        initiateConn(url);

        return () => {
            if(wsRef.current)   {
                wsRef.current.close();
            }
        }

    }, [url]);

    return {data, sendMessage: (msg) => {}}
}
