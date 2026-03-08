import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config()

const { MONGO_DB, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env

if (!MONGO_DB) {
  throw new Error('Missing MONGO_DB in environment')
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment')
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)

const run = async () => {
  await mongoose.connect(MONGO_DB)
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })
  if (existing) {
    existing.role = 'admin'
    await existing.save()
    console.log('Admin user updated')
    return
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  await User.create({
    name: 'Admin',
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: 'admin',
  })
  console.log('Admin user created')
}

run()
  .catch((error) => {
    console.error(error)
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
