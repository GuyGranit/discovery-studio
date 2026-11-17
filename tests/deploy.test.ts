import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repoRoot = path.resolve(import.meta.dirname, "..");
const SERVICE_NAME = "discovery-studio-app-dev";

interface ComposeFile {
  services?: Record<
    string,
    { environment?: string[] | Record<string, string>; volumes?: string[] }
  >;
  volumes?: Record<string, unknown>;
}

function loadCompose(): ComposeFile {
  const raw = readFileSync(path.join(repoRoot, "docker-compose.yml"), "utf8");
  return parse(raw) as ComposeFile;
}

/** Reads DATA_DIR out of a service's `environment` block, in either the
 * list ("DATA_DIR=/data") or mapping (DATA_DIR: /data) form. */
function dataDirFromEnvironment(environment: string[] | Record<string, string> | undefined): string {
  if (Array.isArray(environment)) {
    const entry = environment.find((line) => line.startsWith("DATA_DIR="));
    if (!entry) throw new Error("docker-compose.yml service environment has no DATA_DIR entry");
    return entry.slice("DATA_DIR=".length);
  }
  if (environment && typeof environment === "object") {
    const value = environment.DATA_DIR;
    if (!value) throw new Error("docker-compose.yml service environment has no DATA_DIR entry");
    return value;
  }
  throw new Error("docker-compose.yml service has no environment block");
}

/**
 * Guards the one rule that actually matters for DEV data durability: the
 * directory lib/store.ts writes passes.json under (DATA_DIR) must sit on a
 * named volume declared in docker-compose.yml, not an anonymous volume, a
 * bind mount, or the writable container layer. This fails the moment
 * DATA_DIR and the volume's mount target drift apart, or the mount source
 * stops being one of the file's own top-level `volumes:` entries.
 */
describe("docker-compose data directory", () => {
  it(`mounts the ${SERVICE_NAME} service's DATA_DIR on a named top-level volume`, () => {
    const compose = loadCompose();
    const service = compose.services?.[SERVICE_NAME];
    expect(service, `docker-compose.yml must define a "${SERVICE_NAME}" service`).toBeTruthy();

    const dataDir = dataDirFromEnvironment(service!.environment);
    expect(dataDir.startsWith("/")).toBe(true);

    const volumeMounts = service!.volumes ?? [];
    const matching = volumeMounts
      .map((entry) => entry.split(":"))
      .find(([, target]) => target === dataDir);

    expect(
      matching,
      `expected a volume mount targeting DATA_DIR (${dataDir}) on service "${SERVICE_NAME}"; found volumes: ${JSON.stringify(volumeMounts)}`,
    ).toBeTruthy();

    const [volumeSource] = matching!;
    const topLevelVolumes = compose.volumes ?? {};
    expect(
      Object.prototype.hasOwnProperty.call(topLevelVolumes, volumeSource),
      `volume mount source "${volumeSource}" must be declared under docker-compose.yml's top-level \`volumes:\` (a named volume) — ` +
        `a bind-mount path or an undeclared/anonymous volume would not survive the lifecycle guarantees a DEV deploy needs`,
    ).toBe(true);
  });
});
