// Yerel geliştirme veritabanı: makinedeki MongoDB ikilisiyle tek düğümlü replika seti (transaction desteği).
// Kullanım: npm run db:start   (ön planda çalışır; Ctrl+C ile durur)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.MONGO_LOCAL_PORT ?? 27047);
const dbPath = path.resolve(".data/mongo");
mkdirSync(dbPath, { recursive: true });

const candidates = [
  process.env.MONGOD_PATH,
  "C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe",
  "C:/Program Files/MongoDB/Server/8.0/bin/mongod.exe",
  "/usr/bin/mongod",
  "/opt/homebrew/bin/mongod",
].filter(Boolean);
const mongod = candidates.find((p) => existsSync(p));
if (!mongod) {
  console.error("mongod bulunamadı. MONGOD_PATH ortam değişkeniyle yolunu verin.");
  process.exit(1);
}

const child = spawn(mongod, ["--dbpath", dbPath, "--port", String(PORT), "--replSet", "rs0", "--bind_ip", "127.0.0.1"], {
  stdio: ["ignore", "ignore", "inherit"],
});

// Replika setini (ilk çalıştırmada) başlat
setTimeout(async () => {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(`mongodb://127.0.0.1:${PORT}/?directConnection=true`);
  try {
    await client.connect();
    const admin = client.db("admin");
    try {
      await admin.command({ replSetGetStatus: 1 });
      console.log(`MongoDB hazır: mongodb://127.0.0.1:${PORT}/?replicaSet=rs0 (mevcut replika seti)`);
    } catch {
      await admin.command({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: `127.0.0.1:${PORT}` }] } });
      console.log(`MongoDB replika seti başlatıldı: mongodb://127.0.0.1:${PORT}/?replicaSet=rs0`);
    }
  } catch (err) {
    console.error("Replika seti başlatılamadı:", err.message);
  } finally {
    await client.close();
  }
}, 2500);

const stop = () => {
  child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => {
  console.log(`mongod çıktı (kod ${code})`);
  process.exit(code ?? 0);
});
