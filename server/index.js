import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config()

const { MONGO_DB, JWT_SECRET, PORT = 5000, CLIENT_ORIGIN } = process.env

if (!MONGO_DB) {
  throw new Error('Missing MONGO_DB in environment')
}
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment')
}

mongoose
  .connect(MONGO_DB)
  .then(() => {
    const { host, name } = mongoose.connection
    console.log(`Connected to MongoDB: ${name} @ ${host}`)
  })
  .catch((error) => {
    console.error('MongoDB connection error', error)
    process.exit(1)
  })

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
)

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.passwordHash
  return obj
}

const workTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rate: { type: Number, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

const entrySchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    workTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkType',
      required: true,
    },
    workTypeName: { type: String, required: true },
    rate: { type: Number, required: true },
    hours: { type: Number, required: true },
    description: { type: String, trim: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientName: { type: String, trim: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String, trim: true },
    billed: { type: Boolean, default: false },
    deletedAt: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
)

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  },
  { timestamps: true }
)

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      trim: true,
      default: () => `DD-${new Date().getFullYear()}-xxxx`,
    },
    poDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    vendorName: { type: String, trim: true },
    vendorAddress: { type: String, trim: true },
    vendorContact: { type: String, trim: true },
    tax: { type: Number, default: 0 },
    shipping: { type: String, default: 'TBD' },
    lineItems: [
      {
        itemId: { type: String, trim: true },
        description: { type: String, trim: true },
        qty: { type: Number, min: 0, default: 0 },
        unitPrice: { type: Number, min: 0, default: 0 },
      },
    ],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)
const WorkType = mongoose.model('WorkType', workTypeSchema)
const Entry = mongoose.model('Entry', entrySchema)
const Client = mongoose.model('Client', clientSchema)
const Project = mongoose.model('Project', projectSchema)
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema)

const app = express()

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://demoworktools.netlify.app'
];

const allowedOrigins = CLIENT_ORIGIN
  ? CLIENT_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : defaultOrigins

// console.log("Incoming Origin:", origin);

console.log("Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      try {
        const url = new URL(origin)
        const isLocalhost =
          url.hostname === 'localhost' || url.hostname === '127.0.0.1'
        if (isLocalhost) {
          callback(null, true)
          return
        }
      } catch (error) {
        // Fall through to CORS rejection.
      }
      callback(new Error(`Not allowed by CORS: ${origin}`))
    },
  })
)
app.use(express.json())

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  })

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(payload.id)
    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid auth token' })
  }
}

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  return next()
}

const normalizePoPayload = (body = {}) => {
  const lineItems = Array.isArray(body.lineItems) ? body.lineItems.slice(0, 20) : []
  const fallbackDate = new Date().toISOString().slice(0, 10)
  const poDate =
    typeof body.poDate === 'string' && body.poDate
      ? body.poDate
      : fallbackDate
  const poYear = new Date(`${poDate}T00:00:00`).getFullYear()
  return {
    poNumber:
      typeof body.poNumber === 'string' && body.poNumber.trim()
        ? body.poNumber.trim()
        : `DD-${poYear}-xxxx`,
    poDate,
    vendorName: typeof body.vendorName === 'string' ? body.vendorName.trim() : '',
    vendorAddress:
      typeof body.vendorAddress === 'string' ? body.vendorAddress.trim() : '',
    vendorContact:
      typeof body.vendorContact === 'string' ? body.vendorContact.trim() : '',
    tax: Number.isFinite(Number(body.tax)) ? Number(body.tax) : 0,
    shipping:
      typeof body.shipping === 'string' && body.shipping.trim()
        ? body.shipping.trim()
        : 'TBD',
    lineItems: lineItems.map((item, index) => ({
      itemId:
        typeof item?.itemId === 'string' && item.itemId.trim()
          ? item.itemId.trim()
          : `item${index + 1}`,
      description:
        typeof item?.description === 'string' ? item.description.trim() : '',
      qty: Number.isFinite(Number(item?.qty)) ? Number(item.qty) : 0,
      unitPrice: Number.isFinite(Number(item?.unitPrice))
        ? Number(item.unitPrice)
        : 0,
    })),
  }
}

const getNextPoNumber = async (ownerId, poDate) => {
  const year = new Date(`${poDate}T00:00:00`).getFullYear()
  const pattern = new RegExp(`^DD-${year}-(\\d{4})$`)
  const existing = await PurchaseOrder.find({
    owner: ownerId,
    poNumber: { $regex: pattern },
  }).select('poNumber')

  const highest = existing.reduce((max, purchaseOrder) => {
    const match = purchaseOrder.poNumber.match(pattern)
    if (!match) {
      return max
    }
    const number = Number(match[1])
    return number > max ? number : max
  }, 0)

  return `DD-${year}-${String(highest + 1).padStart(4, '0')}`
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' })
  }
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  const token = signToken(user)
  return res.json({ token, user: user.toJSON() })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user.toJSON() })
})

app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 })
  res.json({ users })
})

app.post('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' })
  }
  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    return res.status(409).json({ message: 'User already exists' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const newUser = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role === 'admin' ? 'admin' : 'user',
  })
  res.status(201).json({ user: newUser.toJSON() })
})

app.post(
  '/api/admin/users/:id/reset-password',
  authMiddleware,
  adminOnly,
  async (req, res) => {
    const { password } = req.body
    if (!password) {
      return res.status(400).json({ message: 'Password required' })
    }
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    user.passwordHash = await bcrypt.hash(password, 10)
    await user.save()
    res.json({ message: 'Password updated' })
  }
)

app.get('/api/work-types', authMiddleware, async (req, res) => {
  const workTypes = await WorkType.find({ owner: req.user._id }).sort({
    createdAt: -1,
  })
  res.json({ workTypes })
})

app.get('/api/clients', authMiddleware, async (req, res) => {
  const clients = await Client.find().sort({ name: 1 })
  res.json({ clients })
})

app.post('/api/clients', authMiddleware, adminOnly, async (req, res) => {
  const { name } = req.body
  if (!name) {
    return res.status(400).json({ message: 'Name required' })
  }
  const existing = await Client.findOne({ name: name.trim() })
  if (existing) {
    return res.status(409).json({ message: 'Client already exists' })
  }
  const client = await Client.create({ name })
  res.status(201).json({ client })
})

app.put('/api/clients/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name } = req.body
  const client = await Client.findById(req.params.id)
  if (!client) {
    return res.status(404).json({ message: 'Client not found' })
  }
  if (name) {
    client.name = name
  }
  await client.save()
  res.json({ client })
})

app.delete('/api/clients/:id', authMiddleware, adminOnly, async (req, res) => {
  const client = await Client.findById(req.params.id)
  if (!client) {
    return res.status(404).json({ message: 'Client not found' })
  }
  const used = await Entry.exists({ clientId: client._id })
  if (used) {
    return res.status(400).json({ message: 'Client is used in entries' })
  }
  await Project.deleteMany({ clientId: client._id })
  await client.deleteOne()
  res.json({ message: 'Deleted' })
})

app.get('/api/projects', authMiddleware, async (req, res) => {
  const projects = await Project.find().sort({ name: 1 })
  res.json({ projects })
})

app.post('/api/projects', authMiddleware, adminOnly, async (req, res) => {
  const { name, clientId } = req.body
  if (!name) {
    return res.status(400).json({ message: 'Name required' })
  }
  const existing = await Project.findOne({ name: name.trim() })
  if (existing) {
    return res.status(409).json({ message: 'Project already exists' })
  }
  let client = null
  if (clientId) {
    client = await Client.findById(clientId)
    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }
  }
  const project = await Project.create({ name, clientId: client?._id })
  res.status(201).json({ project })
})

app.put('/api/projects/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, clientId } = req.body
  const project = await Project.findById(req.params.id)
  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }
  if (name) {
    project.name = name
  }
  if (clientId === '') {
    project.clientId = undefined
  } else if (clientId) {
    const client = await Client.findById(clientId)
    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }
    project.clientId = client._id
  }
  await project.save()
  res.json({ project })
})

app.delete('/api/projects/:id', authMiddleware, adminOnly, async (req, res) => {
  const project = await Project.findById(req.params.id)
  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }
  const used = await Entry.exists({ projectId: project._id })
  if (used) {
    return res.status(400).json({ message: 'Project is used in entries' })
  }
  await project.deleteOne()
  res.json({ message: 'Deleted' })
})

app.get('/api/purchase-orders', authMiddleware, async (req, res) => {
  const filter = { owner: req.user._id }
  if (req.user.role === 'admin' && req.query.all === 'true') {
    delete filter.owner
  }
  const purchaseOrders = await PurchaseOrder.find(filter)
    .sort({ updatedAt: -1 })
    .populate('owner', 'email name')
  res.json({ purchaseOrders })
})

app.get('/api/purchase-orders/latest', authMiddleware, async (req, res) => {
  const purchaseOrder = await PurchaseOrder.findOne({ owner: req.user._id })
    .sort({ updatedAt: -1 })
    .populate('owner', 'email name')
  res.json({ purchaseOrder })
})

app.post('/api/purchase-orders', authMiddleware, async (req, res) => {
  const payload = normalizePoPayload(req.body)
  if (/x{2,}/i.test(payload.poNumber)) {
    payload.poNumber = await getNextPoNumber(req.user._id, payload.poDate)
  }
  const purchaseOrder = await PurchaseOrder.create({
    ...payload,
    owner: req.user._id,
  })
  res.status(201).json({ purchaseOrder })
})

app.put('/api/purchase-orders/:id', authMiddleware, async (req, res) => {
  const purchaseOrder = await PurchaseOrder.findById(req.params.id)
  if (!purchaseOrder) {
    return res.status(404).json({ message: 'Purchase order not found' })
  }
  const isOwner = purchaseOrder.owner.toString() === req.user._id.toString()
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' })
  }
  const payload = normalizePoPayload(req.body)
  purchaseOrder.poNumber = payload.poNumber
  purchaseOrder.poDate = payload.poDate
  purchaseOrder.vendorName = payload.vendorName
  purchaseOrder.vendorAddress = payload.vendorAddress
  purchaseOrder.vendorContact = payload.vendorContact
  purchaseOrder.tax = payload.tax
  purchaseOrder.shipping = payload.shipping
  purchaseOrder.lineItems = payload.lineItems
  await purchaseOrder.save()
  res.json({ purchaseOrder })
})

app.post('/api/work-types', authMiddleware, async (req, res) => {
  const { name, rate } = req.body
  if (!name || !rate) {
    return res.status(400).json({ message: 'Name and rate required' })
  }
  const workType = await WorkType.create({
    name,
    rate,
    owner: req.user._id,
  })
  res.status(201).json({ workType })
})

app.put('/api/work-types/:id', authMiddleware, async (req, res) => {
  const { name, rate } = req.body
  const workType = await WorkType.findOne({
    _id: req.params.id,
    owner: req.user._id,
  })
  if (!workType) {
    return res.status(404).json({ message: 'Work type not found' })
  }
  if (name) {
    workType.name = name
  }
  if (rate) {
    workType.rate = rate
  }
  await workType.save()
  res.json({ workType })
})

app.delete('/api/work-types/:id', authMiddleware, async (req, res) => {
  const workType = await WorkType.findOne({
    _id: req.params.id,
    owner: req.user._id,
  })
  if (!workType) {
    return res.status(404).json({ message: 'Work type not found' })
  }
  const used = await Entry.exists({ workTypeId: workType._id })
  if (used) {
    return res
      .status(400)
      .json({ message: 'Work type is used in entries' })
  }
  await workType.deleteOne()
  res.json({ message: 'Deleted' })
})

app.get('/api/entries', authMiddleware, async (req, res) => {
  const filter = { owner: req.user._id, deletedAt: { $exists: false } }
  if (req.user.role === 'admin' && req.query.all === 'true') {
    delete filter.owner
  }
  const entries = await Entry.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate('owner', 'email name')
  res.json({ entries })
})

app.post('/api/entries', authMiddleware, async (req, res) => {
  const { date, workTypeId, hours, clientId, projectId, description } = req.body
  if (!date || !workTypeId || !hours) {
    return res
      .status(400)
      .json({ message: 'Date, work type, and hours required' })
  }
  const workType = await WorkType.findOne({
    _id: workTypeId,
    owner: req.user._id,
  })
  if (!workType) {
    return res.status(404).json({ message: 'Work type not found' })
  }
  let client = null
  if (clientId) {
    client = await Client.findById(clientId)
    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }
  }
  let project = null
  if (projectId) {
    project = await Project.findById(projectId)
    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }
  }

  const entry = await Entry.create({
    date,
    workTypeId: workType._id,
    workTypeName: workType.name,
    rate: workType.rate,
    hours,
    description: typeof description === 'string' ? description.trim() : undefined,
    clientId: client?._id,
    clientName: client?.name,
    projectId: project?._id,
    projectName: project?.name,
    billed: false,
    deletedAt: undefined,
    owner: req.user._id,
  })
  res.status(201).json({ entry })
})

app.put('/api/entries/:id', authMiddleware, async (req, res) => {
  const entry = await Entry.findById(req.params.id)
  if (!entry || entry.deletedAt) {
    return res.status(404).json({ message: 'Entry not found' })
  }
  const isOwner = entry.owner.toString() === req.user._id.toString()
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' })
  }

  const { date, hours, clientId, projectId, billed, workTypeId, description } =
    req.body
  if (date) {
    entry.date = date
  }
  if (typeof hours === 'number') {
    entry.hours = hours
  }
  if (typeof billed === 'boolean') {
    entry.billed = billed
  }
  if (typeof description === 'string') {
    const trimmed = description.trim()
    entry.description = trimmed ? trimmed : undefined
  }
  if (clientId === '') {
    entry.clientId = undefined
    entry.clientName = undefined
  } else if (clientId) {
    const client = await Client.findById(clientId)
    if (!client) {
      return res.status(404).json({ message: 'Client not found' })
    }
    entry.clientId = client._id
    entry.clientName = client.name
  }
  if (projectId === '') {
    entry.projectId = undefined
    entry.projectName = undefined
  } else if (projectId) {
    const project = await Project.findById(projectId)
    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }
    entry.projectId = project._id
    entry.projectName = project.name
  }
  if (workTypeId && workTypeId !== String(entry.workTypeId)) {
    const workType = await WorkType.findOne({
      _id: workTypeId,
      owner: entry.owner,
    })
    if (!workType) {
      return res.status(404).json({ message: 'Work type not found' })
    }
    entry.workTypeId = workType._id
    entry.workTypeName = workType.name
    entry.rate = workType.rate
  }

  await entry.save()
  res.json({ entry })
})

app.patch('/api/entries/bulk-billed', authMiddleware, async (req, res) => {
  const { entryIds, billed } = req.body
  if (!Array.isArray(entryIds) || typeof billed !== 'boolean') {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const filter = {
    _id: { $in: entryIds },
  }
  if (req.user.role !== 'admin') {
    filter.owner = req.user._id
  }
  await Entry.updateMany(filter, { billed })
  const updatedEntries = await Entry.find(filter)
  res.json({ entries: updatedEntries })
})

app.delete('/api/entries/:id', authMiddleware, async (req, res) => {
  const entry = await Entry.findById(req.params.id)
  if (!entry || entry.deletedAt) {
    return res.status(404).json({ message: 'Entry not found' })
  }
  const isOwner = entry.owner.toString() === req.user._id.toString()
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' })
  }
  entry.deletedAt = new Date()
  await entry.save()
  res.json({ message: 'Deleted' })
})

// not hter

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
})
