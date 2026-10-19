/** Kuyruktaki işleri bir kez işler (yerel geliştirme / elle tetikleme).  npm run jobs:run */
import mongoose from "mongoose";
import { processJobs } from "@/services/jobs/jobs";

processJobs(50, 120_000)
  .then(async (r) => {
    console.log(`✓ ${r.processed} iş işlendi`);
    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
