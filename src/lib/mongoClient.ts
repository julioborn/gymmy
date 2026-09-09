import { MongoClient, Db } from 'mongodb';

declare global {
    // eslint-disable-next-line no-var
    var _mongoNativeClient: MongoClient | undefined;
}

let clientPromise: Promise<MongoClient>;

function getClientPromise(): Promise<MongoClient> {
    const uri = process.env.USE_ATLAS === 'true' ? process.env.ATLAS_URI : process.env.MONGODB_URI;
    if (!uri) throw new Error('Falta URI de MongoDB. Verifica las variables de entorno.');

    if (!global._mongoNativeClient) {
        global._mongoNativeClient = new MongoClient(uri, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
        });
        clientPromise = global._mongoNativeClient.connect();
    } else {
        clientPromise = Promise.resolve(global._mongoNativeClient);
    }
    return clientPromise;
}

export async function getDb(): Promise<{ client: MongoClient; db: Db }> {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);
    return { client, db };
}
