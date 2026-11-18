import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/** Points lib/store.ts at a fresh scratch directory for the duration of one test. */
export async function withTempDataDir<T>(fn: () => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "discovery-studio-pass-test-"));
  const prev = process.env.DATA_DIR;
  process.env.DATA_DIR = dir;
  try {
    return await fn();
  } finally {
    process.env.DATA_DIR = prev;
    await rm(dir, { recursive: true, force: true });
  }
}
