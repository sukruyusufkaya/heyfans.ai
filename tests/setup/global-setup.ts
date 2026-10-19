import { existsSync } from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Testler gerçek bir MongoDB replika setinde (transaction destekli) çalışır.
 * Makinede kurulu mongod varsa onu kullanır (indirme yapılmaz).
 */
let replSet: MongoMemoryReplSet | undefined;

export async function setup() {
  const local = ["C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe", "/usr/bin/mongod", "/opt/homebrew/bin/mongod"].find((p) => existsSync(p));
  if (local && !process.env.MONGOMS_SYSTEM_BINARY) process.env.MONGOMS_SYSTEM_BINARY = local;
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.TEST_MONGODB_URI = replSet.getUri();
}

export async function teardown() {
  await replSet?.stop();
}
