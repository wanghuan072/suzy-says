import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
const [stage, command, ...args] = process.argv.slice(2);
if (!command) throw new Error("stage and command required");
fs.mkdirSync("reports/logs", { recursive: true });
const started = new Date().toISOString();
const id = `${stage}-${Date.now()}`;
const logPath = `reports/logs/${id}.log`;
const log = fs.createWriteStream(logPath);
let captured = "";
const child = spawn(command, args, {
  shell: process.platform === "win32",
  cwd: process.cwd(),
  env: process.env,
});
child.stdout.on("data", (d) => {
  captured += d.toString();
  process.stdout.write(d);
  log.write(d);
});
child.stderr.on("data", (d) => {
  captured += d.toString();
  process.stderr.write(d);
  log.write(d);
});
child.on("close", (exitCode) => {
  log.end();
  const file = "reports/command-results.json";
  const old = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { commands: [] };
  old.commands.push({
    id,
    stage,
    command: [command, ...args],
    cwd: path.resolve("."),
    type: "one-shot",
    startedAt: started,
    endedAt: new Date().toISOString(),
    exitCode,
    pid: child.pid,
    port: null,
    readiness: null,
    buildId: fs.existsSync(".next/BUILD_ID")
      ? fs.readFileSync(".next/BUILD_ID", "utf8").trim()
      : null,
    log: logPath,
    stopMethod: "natural-exit",
    testStats: /tests (\d+)/.test(captured)
      ? {
          tests: Number(captured.match(/tests (\d+)/)?.[1] ?? 0),
          passed: Number(captured.match(/pass (\d+)/)?.[1] ?? 0),
          failed: Number(captured.match(/fail (\d+)/)?.[1] ?? 0),
          method: "parsed-node-test-runner-output",
        }
      : null,
  });
  fs.writeFileSync(file, JSON.stringify(old, null, 2) + "\n");
  process.exitCode = exitCode ?? 1;
});
