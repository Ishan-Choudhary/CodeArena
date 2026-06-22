import { Server } from "@hocuspocus/server";
import { Webhook } from "@hocuspocus/extension-webhook";
import { Redis } from "@hocuspocus/extension-redis";
import axios from "axios";
import * as Y from "yjs";


const DJANGO_API = process.env.DJANGO_API_URL || "http://backend:8000/api/yjs"

const server = new Server({
    extensions: [
        new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: process.env.REDIS_PORT || 6379
        }),

        new Webhook({
            url: `${DJANGO_API}/webhook/`,
            debounce: 60000,
            events: ['change'],
        })
    ],

    async onLoadDocument({document, documentName})    {
        try {
            const response = await axios.get(`${DJANGO_API}/docs/${documentName}/`, {
                responseType: 'arraybuffer'                
            })

            if(response.headers['x-is-starter-code'] === 'true')    {
                const starterCode = new TextDecoder().decode(response.data);
                document.getText("monaco").insert(0, starterCode);
                return document;
            }

            const binaryState =  new Uint8Array(response.data);
            Y.applyUpdate(document, binaryState);

            return document;
        }
        catch (err) {
            if(err.response?.status === 404)    {
                return document;
            }
            console.error(`❌ [Hocuspocus] Failed to fetch doc ${documentName}:`, err.message);
            throw err;
        }
    }
});

server.listen(1234);