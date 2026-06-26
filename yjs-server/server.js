import { Server } from "@hocuspocus/server";
import { Redis } from "@hocuspocus/extension-redis";
import IORedis from "ioredis";
import axios from "axios";
import * as Y from "yjs";


const DJANGO_API = process.env.DJANGO_API_URL || "http://backend:8000/api/yjs";
const redisConfig  =    {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number.parseInt(process.env.REDIS_PORT || 6379, 10),
}
const redisClient = new IORedis(redisConfig);

const server = new Server({

    port: process.env.port || 1234,
    debounce: 60000,
    maxDebounce: 120000,

    extensions: [
        new Redis(redisConfig),
    ],

    async onLoadDocument({document, documentName})    {
        try {
            const response = await axios.get(`${DJANGO_API}/docs/${documentName}/`, {
                responseType: 'arraybuffer'                
            })


            if(response.headers['x-is-starter-code'] === 'true')    {
                const starterCode = new TextDecoder().decode(response.data);
                document.getText("monaco").insert(0, starterCode);
                
                const chunkKey = `chunks:{${documentName}}`;
                const initialUpdate = Y.encodeStateAsUpdate(document);
                const initialChunkData = JSON.stringify({
                    time: Date.now(),
                    update: Buffer.from(initialUpdate).toString("base64")
                });

                await redisClient.rpush(chunkKey, initialChunkData);
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
            console.error(`[Hocuspocus] Failed to fetch doc ${documentName}:`, err.message);
            throw err;
        }
    },

    async onChange({documentName, document, update})    {
        const chunkKey = `chunks:{${documentName}}`;
        const chunkData = JSON.stringify({
            time: Date.now(),
            update: Buffer.from(update).toString("base64")
        })

        await redisClient.rpush(chunkKey, chunkData);
    },

    async onStoreDocument({documentName, document}) {
        const lockKey = `lock:store:{${documentName}}`;
        const chunkKey = `chunks:{${documentName}}`;

        const acquiredLock = await redisClient.set(lockKey, "locked", "NX", "EX", 10);

        if(!acquiredLock)   {
            return null;
        }

        try {
            const rawChunks = await redisClient.lrange(chunkKey, 0, -1);
            const chunksToSend = rawChunks.map(c => JSON.parse(c));

            const masterState = Buffer.from(Y.encodeStateAsUpdate(document)).toString("base64");

            await axios.post(`${DJANGO_API}/webhook/`,  {                
                event: "change",
                documentName: documentName,
                document: {state: masterState},
                new_chunks: chunksToSend
            });

            await redisClient.ltrim(chunkKey, chunksToSend.length, -1);
        }
        catch (err) {
            console.error("-----------SOMETHING WENT WRONG UPDATING THE CHUNK------------------");
            console.error(err.message);
        }
        finally {
            await redisClient.del(lockKey);
        }

    }
});

server.listen(1234);