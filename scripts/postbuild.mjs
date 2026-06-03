import { writeFileSync } from "fs";
writeFileSync("build/server/package.json", JSON.stringify({ type: "module" }));
