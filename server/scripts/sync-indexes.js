import "dotenv/config";
import mongoose from "mongoose";
import Task from "../src/models/task.js";
import User from "../src/models/user.js";
import PushSubscription from "../src/models/PushSubscription.js";

await mongoose.connect(process.env.MONGO_URI, {dbName: 'BackPWA'});
for (const Model of [User, Task, PushSubscription]) {
    const dropped = await Model.syncIndexes();
    const indexes = await Model.collection.listIndexes();
    console.log(`${Model.modelName}: ${indexes.map((i) => i.name).join(', ')}`);
    if (dropped.length) console.log(`eliminados: ${dropped.join(', ')}`);
}
await mongoose.disconnect();