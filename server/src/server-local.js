import "dotenv/config";
import dns from "node:dns";
import app from "../app.js";

dns.setServers((process.env.DNS_SERVERS || "1.1.1.1,8.8.8.8").split(","));

const { PORT = 4000 } = process.env;
app.listen(PORT, ()=> console.log('API LOCAL EN https://localhost:${PORT}'));
