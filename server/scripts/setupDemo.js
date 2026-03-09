import fs from 'fs/promises'
import path from 'path'
import readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'
import dotenv from 'dotenv'

const envPath = path.resolve('.env')

const readEnvFile = async () => {
  const raw = await fs.readFile(envPath, 'utf8')
  const lineEnding = raw.includes('\r\n') ? '\r\n' : '\n'
  return { raw, lineEnding, parsed: dotenv.parse(raw) }
}

const promptWithDefault = async (rl, label, fallback, { secret = false } = {}) => {
  const suffix = fallback ? ` [${fallback}]` : ''
  const answer = await rl.question(`${label}${suffix}: `, {
    hideEchoBack: secret,
  })
  return answer.trim() || fallback
}

const setEnvValue = (source, key, value) => {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const line = `${key}="${escaped}"`
  const pattern = new RegExp(`^${key}=.*$`, 'm')
  if (pattern.test(source)) {
    return source.replace(pattern, line)
  }
  const needsNewline = source.length > 0 && !source.endsWith('\n') && !source.endsWith('\r')
  return `${source}${needsNewline ? '\n' : ''}${line}`
}

const run = async () => {
  const { raw, lineEnding, parsed } = await readEnvFile()
  const rl = readline.createInterface({ input, output })

  try {
    const currentUri = parsed.MONGO_DB || ''
    let currentDbName = ''

    if (currentUri) {
      try {
        const url = new URL(currentUri.replace('mongodb+srv://', 'https://'))
        currentDbName = url.pathname.replace(/^\//, '')
      } catch {
        currentDbName = ''
      }
    }

    const adminEmail = await promptWithDefault(rl, 'Admin email', parsed.ADMIN_EMAIL || '')
    const adminPassword = await promptWithDefault(
      rl,
      'Admin password',
      parsed.ADMIN_PASSWORD || '',
      { secret: true }
    )
    const dbName = await promptWithDefault(rl, 'MongoDB database name', currentDbName)
    const port = await promptWithDefault(rl, 'Server port', parsed.PORT || '5001')

    if (!adminEmail || !adminPassword || !dbName) {
      throw new Error('Admin email, admin password, and database name are required')
    }

    let nextEnv = raw
    if (currentUri) {
      const nextUri = currentUri.replace(/\/([^/?]+)(\?[^"]*)?$/, `/${dbName}$2`)
      nextEnv = setEnvValue(nextEnv, 'MONGO_DB', nextUri)
    }
    nextEnv = setEnvValue(nextEnv, 'ADMIN_EMAIL', adminEmail)
    nextEnv = setEnvValue(nextEnv, 'ADMIN_PASSWORD', adminPassword)
    nextEnv = setEnvValue(nextEnv, 'PORT', port)
    nextEnv = nextEnv.replace(/\r?\n/g, lineEnding)

    await fs.writeFile(envPath, nextEnv, 'utf8')

    process.env.MONGO_DB = dotenv.parse(nextEnv).MONGO_DB
    process.env.ADMIN_EMAIL = adminEmail
    process.env.ADMIN_PASSWORD = adminPassword

    console.log(`Updated .env for database "${dbName}" on port ${port}`)
    await import('./seedAdmin.js')
  } finally {
    rl.close()
  }
}

run().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
