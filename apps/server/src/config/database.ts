import { Client } from "cassandra-driver";

const client = new Client({
  contactPoints: [process.env.CASSANDRA_HOST || "127.0.0.1"],
  localDataCenter: process.env.CASSANDRA_DC || "datacenter1",
  keyspace: process.env.CASSANDRA_KEYSPACE || "enovis",
  credentials: {
    username: process.env.CASSANDRA_USER || "cassandra",
    password: process.env.CASSANDRA_PASSWORD || "cassandra",
  },
  queryOptions: {
    consistency: 1, // LOCAL_ONE
    prepare: true,
  },
});

export async function connectDB(): Promise<void> {
  try {
    await client.connect();
    console.log("[DB] Connected to Cassandra cluster");
  } catch (err) {
    console.error("[DB] Failed to connect to Cassandra:", err);
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  await client.shutdown();
  console.log("[DB] Disconnected from Cassandra");
}

export default client;
