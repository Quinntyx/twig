import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { DEFAULT_CONFIG, normalizeConfig, type TwigConfig } from '../shared/config'

export interface LoadedConfig {
  config: TwigConfig
  path: string
  error?: string
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** `~/.config/twig/twig.json`, honoring XDG_CONFIG_HOME when set. */
export function configPath(): string {
  const base = process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config')
  return join(base, 'twig', 'twig.json')
}

/**
 * Read the user config, creating a fully populated default on first boot.
 * Existing files are never rewritten: malformed or partial configs fall back
 * to defaults in memory so a typo cannot destroy the user's file.
 */
export async function loadConfig(): Promise<LoadedConfig> {
  const path = configPath()

  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      return { config: DEFAULT_CONFIG, path, error: `Could not read config: ${message(error)}` }
    }
    try {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, 'utf8')
      return { config: DEFAULT_CONFIG, path }
    } catch (writeError) {
      return {
        config: DEFAULT_CONFIG,
        path,
        error: `Could not create config: ${message(writeError)}`
      }
    }
  }

  try {
    return { config: normalizeConfig(JSON.parse(text)), path }
  } catch (error) {
    return { config: DEFAULT_CONFIG, path, error: `Invalid config JSON: ${message(error)}` }
  }
}
