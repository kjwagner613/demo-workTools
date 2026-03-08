import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const TOKEN_KEY = 'work-tools-token'
const MAX_PO_ITEMS = 20

const todayISO = new Date().toISOString().slice(0, 10)
const getPoDraftNumber = (dateValue = todayISO) =>
  `DD-${new Date(`${dateValue}T00:00:00`).getFullYear()}-xxxx`
const createPoLineItem = (index) => ({
  id: `item${index + 1}`,
  description: '',
  qty: '',
  unitPrice: '',
})

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))

const formatTimestampDate = (value) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))

const getWeekStart = (value) => {
  const date = new Date(`${value}T00:00:00`)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return date.toISOString().slice(0, 10)
}

const apiFetch = async (token, path, options = {}) => {
  const { method = 'GET', body } = options
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.message || 'Request failed')
  }
  return response.json()
}

function App() {
  const [token, setToken] = useState(() =>
    localStorage.getItem(TOKEN_KEY)
  )
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [workTypes, setWorkTypes] = useState([])
  const [entries, setEntries] = useState([])
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState('')
  const [viewAll, setViewAll] = useState(false)
  const [activeModule, setActiveModule] = useState('timesheet')
  const [showModuleMenu, setShowModuleMenu] = useState(true)
  const [timesheetPage, setTimesheetPage] = useState('entry')
  const [adminPage, setAdminPage] = useState('users')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [newWorkName, setNewWorkName] = useState('')
  const [newWorkRate, setNewWorkRate] = useState('65')
  const [editingWorkTypeId, setEditingWorkTypeId] = useState(null)
  const [editingWorkName, setEditingWorkName] = useState('')
  const [editingWorkRate, setEditingWorkRate] = useState('')

  const [entryDate, setEntryDate] = useState(todayISO)
  const [entryWorkTypeId, setEntryWorkTypeId] = useState('')
  const [entryHours, setEntryHours] = useState('1')
  const [entryClientId, setEntryClientId] = useState('')
  const [entryProjectId, setEntryProjectId] = useState('')
  const [entryDescription, setEntryDescription] = useState('')

  const [editingEntryId, setEditingEntryId] = useState(null)
  const [editingEntryDate, setEditingEntryDate] = useState('')
  const [editingEntryWorkTypeId, setEditingEntryWorkTypeId] = useState('')
  const [editingEntryHours, setEditingEntryHours] = useState('')
  const [editingEntryClientId, setEditingEntryClientId] = useState('')
  const [editingEntryProjectId, setEditingEntryProjectId] = useState('')
  const [editingEntryDescription, setEditingEntryDescription] = useState('')

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [adminUsers, setAdminUsers] = useState([])
  const [resetUserId, setResetUserId] = useState('')
  const [resetPassword, setResetPassword] = useState('')

  const [newClientName, setNewClientName] = useState('')
  const [editingClientId, setEditingClientId] = useState(null)
  const [editingClientName, setEditingClientName] = useState('')

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectClientId, setNewProjectClientId] = useState('')
  const [editingProjectId, setEditingProjectId] = useState(null)
  const [editingProjectName, setEditingProjectName] = useState('')
  const [editingProjectClientId, setEditingProjectClientId] = useState('')
  const [poNumber, setPoNumber] = useState(getPoDraftNumber(todayISO))
  const [poDate, setPoDate] = useState(todayISO)
  const [vendorName, setVendorName] = useState('')
  const [vendorAddress, setVendorAddress] = useState('')
  const [vendorContact, setVendorContact] = useState('')
  const [poTax, setPoTax] = useState('0')
  const [poShipping, setPoShipping] = useState('TBD')
  const [poId, setPoId] = useState('')
  const [poSaving, setPoSaving] = useState(false)
  const [poViewAll, setPoViewAll] = useState(false)
  const [poListLoading, setPoListLoading] = useState(false)
  const [poRecords, setPoRecords] = useState([])
  const [poLineItems, setPoLineItems] = useState(() =>
    Array.from({ length: 4 }, (_, index) => createPoLineItem(index))
  )

  const isAdmin = user?.role === 'admin'

  const selectedWorkType = useMemo(
    () => workTypes.find((type) => type._id === entryWorkTypeId),
    [entryWorkTypeId, workTypes]
  )

  const entryTotal =
    selectedWorkType && Number(entryHours)
      ? selectedWorkType.rate * Number(entryHours)
      : 0

  const entriesByDate = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc[entry.date] = acc[entry.date] ?? []
      acc[entry.date].push(entry)
      return acc
    }, {})
  }, [entries])

  const sortedDates = useMemo(() => {
    return Object.keys(entriesByDate).sort((a, b) =>
      a < b ? 1 : a > b ? -1 : 0
    )
  }, [entriesByDate])

  const weeklyTotals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const weekStart = getWeekStart(entry.date)
      acc[weekStart] = acc[weekStart] ?? { total: 0, hours: 0 }
      acc[weekStart].total += entry.rate * entry.hours
      acc[weekStart].hours += entry.hours
      return acc
    }, {})
  }, [entries])

  const weeklyUnbilledTotals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      if (entry.billed) {
        return acc
      }
      const weekStart = getWeekStart(entry.date)
      acc[weekStart] = acc[weekStart] ?? { total: 0, hours: 0 }
      acc[weekStart].total += entry.rate * entry.hours
      acc[weekStart].hours += entry.hours
      return acc
    }, {})
  }, [entries])

  const weeklyKeys = useMemo(() => {
    return Object.keys(weeklyTotals).sort((a, b) =>
      a < b ? 1 : a > b ? -1 : 0
    )
  }, [weeklyTotals])

  const overallTotal = useMemo(() => {
    return entries.reduce((sum, entry) => sum + entry.rate * entry.hours, 0)
  }, [entries])

  const unbilledEntries = useMemo(
    () => entries.filter((entry) => !entry.billed),
    [entries]
  )

  const unbilledTotal = useMemo(() => {
    return unbilledEntries.reduce(
      (sum, entry) => sum + entry.rate * entry.hours,
      0
    )
  }, [unbilledEntries])

  const poSubtotal = useMemo(() => {
    return poLineItems.reduce((sum, item) => {
      const qty = Number(item.qty)
      const unitPrice = Number(item.unitPrice)
      if (!qty || !unitPrice) {
        return sum
      }
      return sum + qty * unitPrice
    }, 0)
  }, [poLineItems])

  const poTaxValue = Number(poTax) || 0
  const poShippingValue = Number(poShipping)
  const poTotal = poSubtotal + poTaxValue + (Number.isFinite(poShippingValue) ? poShippingValue : 0)
  const getPoListTotal = (purchaseOrder) => {
    const subtotal = (purchaseOrder.lineItems || []).reduce((sum, item) => {
      const qty = Number(item?.qty)
      const unitPrice = Number(item?.unitPrice)
      if (!qty || !unitPrice) {
        return sum
      }
      return sum + qty * unitPrice
    }, 0)
    const tax = Number(purchaseOrder.tax) || 0
    const shipping = Number(purchaseOrder.shipping)
    return subtotal + tax + (Number.isFinite(shipping) ? shipping : 0)
  }

  const moduleOptions = [
    { id: 'timesheet', label: 'Timesheet' },
    { id: 'po', label: 'PO' },
  ]

  const refreshWorkTypes = async () => {
    const payload = await apiFetch(token, '/api/work-types')
    setWorkTypes(payload.workTypes)
  }

  const refreshEntries = async (all) => {
    const payload = await apiFetch(
      token,
      `/api/entries${all ? '?all=true' : ''}`
    )
    setEntries(payload.entries)
  }

  const refreshClients = async () => {
    const payload = await apiFetch(token, '/api/clients')
    setClients(payload.clients)
  }

  const refreshProjects = async () => {
    const payload = await apiFetch(token, '/api/projects')
    setProjects(payload.projects)
  }

  const refreshAdminUsers = async () => {
    if (!isAdmin) {
      return
    }
    const payload = await apiFetch(token, '/api/admin/users')
    setAdminUsers(payload.users)
  }

  const applyPoData = (purchaseOrder) => {
    if (!purchaseOrder) {
      setPoId('')
      setPoNumber(getPoDraftNumber(todayISO))
      setPoDate(todayISO)
      setVendorName('')
      setVendorAddress('')
      setVendorContact('')
      setPoTax('0')
      setPoShipping('TBD')
      setPoLineItems(
        Array.from({ length: 4 }, (_, index) => createPoLineItem(index))
      )
      return
    }
    setPoId(purchaseOrder._id || '')
    setPoNumber(purchaseOrder.poNumber || getPoDraftNumber(purchaseOrder.poDate || todayISO))
    setPoDate(purchaseOrder.poDate || todayISO)
    setVendorName(purchaseOrder.vendorName || '')
    setVendorAddress(purchaseOrder.vendorAddress || '')
    setVendorContact(purchaseOrder.vendorContact || '')
    setPoTax(String(purchaseOrder.tax ?? 0))
    setPoShipping(purchaseOrder.shipping || 'TBD')
    const mappedItems = Array.isArray(purchaseOrder.lineItems)
      ? purchaseOrder.lineItems.slice(0, MAX_PO_ITEMS).map((item, index) => ({
          id: item.itemId || `item${index + 1}`,
          description: item.description || '',
          qty: String(item.qty ?? ''),
          unitPrice: String(item.unitPrice ?? ''),
        }))
      : []
    setPoLineItems(
      mappedItems.length > 0
        ? mappedItems
        : Array.from({ length: 4 }, (_, index) => createPoLineItem(index))
    )
  }

  const refreshLatestPo = async () => {
    const payload = await apiFetch(token, '/api/purchase-orders/latest')
    applyPoData(payload.purchaseOrder)
  }

  const refreshPoRecords = async (all = false) => {
    setPoListLoading(true)
    try {
      const query = isAdmin && all ? '?all=true' : ''
      const payload = await apiFetch(token, `/api/purchase-orders${query}`)
      setPoRecords(payload.purchaseOrders)
    } finally {
      setPoListLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    const loadUser = async () => {
      setAuthLoading(true)
      try {
        const payload = await apiFetch(token, '/api/auth/me')
        setUser(payload.user)
        setAuthError('')
      } catch (error) {
        setAuthError(error.message)
        setToken(null)
        localStorage.removeItem(TOKEN_KEY)
      } finally {
        setAuthLoading(false)
      }
    }
    loadUser()
  }, [token])

  useEffect(() => {
    if (!user) {
      return
    }
    const loadData = async () => {
      setDataLoading(true)
      try {
        await Promise.all([
          refreshWorkTypes(),
          refreshEntries(isAdmin && viewAll),
          refreshClients(),
          refreshProjects(),
          refreshLatestPo(),
          refreshPoRecords(isAdmin && poViewAll),
        ])
        if (isAdmin) {
          await refreshAdminUsers()
        }
        setDataError('')
      } catch (error) {
        setDataError(error.message)
      } finally {
        setDataLoading(false)
      }
    }
    loadData()
  }, [user, viewAll, poViewAll])

  useEffect(() => {
    if (entryWorkTypeId || workTypes.length === 0) {
      return
    }
    setEntryWorkTypeId(workTypes[0]._id)
  }, [entryWorkTypeId, workTypes])

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthLoading(true)
    try {
      const payload = await apiFetch(null, '/api/auth/login', {
        method: 'POST',
        body: { email: loginEmail, password: loginPassword },
      })
      localStorage.setItem(TOKEN_KEY, payload.token)
      setToken(payload.token)
      setUser(payload.user)
      setLoginPassword('')
      setAuthError('')
    } catch (error) {
      setAuthError(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setShowModuleMenu(true)
    setEntries([])
    setWorkTypes([])
    setClients([])
    setProjects([])
    setPoRecords([])
    setPoViewAll(false)
    applyPoData(null)
  }

  const handleAddWorkType = async (event) => {
    event.preventDefault()
    const trimmedName = newWorkName.trim()
    const rateValue = Number(newWorkRate)
    if (!trimmedName || !rateValue) {
      return
    }
    try {
      const payload = await apiFetch(token, '/api/work-types', {
        method: 'POST',
        body: { name: trimmedName, rate: rateValue },
      })
      setWorkTypes((prev) => [payload.workType, ...prev])
      setNewWorkName('')
      setNewWorkRate('65')
      setEntryWorkTypeId((current) => current || payload.workType._id)
    } catch (error) {
      setDataError(error.message)
    }
  }

  const startEditWorkType = (type) => {
    setEditingWorkTypeId(type._id)
    setEditingWorkName(type.name)
    setEditingWorkRate(String(type.rate))
  }

  const cancelEditWorkType = () => {
    setEditingWorkTypeId(null)
    setEditingWorkName('')
    setEditingWorkRate('')
  }

  const saveEditWorkType = async (event) => {
    event.preventDefault()
    const trimmedName = editingWorkName.trim()
    const rateValue = Number(editingWorkRate)
    if (!trimmedName || !rateValue) {
      return
    }
    try {
      const payload = await apiFetch(
        token,
        `/api/work-types/${editingWorkTypeId}`,
        {
          method: 'PUT',
          body: { name: trimmedName, rate: rateValue },
        }
      )
      setWorkTypes((prev) =>
        prev.map((type) =>
          type._id === payload.workType._id ? payload.workType : type
        )
      )
      cancelEditWorkType()
    } catch (error) {
      setDataError(error.message)
    }
  }

  const deleteWorkType = async (typeId) => {
    try {
      await apiFetch(token, `/api/work-types/${typeId}`, {
        method: 'DELETE',
      })
      setWorkTypes((prev) => prev.filter((type) => type._id !== typeId))
      if (entryWorkTypeId === typeId) {
        setEntryWorkTypeId('')
      }
    } catch (error) {
      setDataError(error.message)
    }
  }

  const handleAddEntry = async (event) => {
    event.preventDefault()
    if (!selectedWorkType || !entryDate) {
      return
    }

    const hoursValue = Number(entryHours)
    if (!hoursValue) {
      return
    }

    try {
      const payload = await apiFetch(token, '/api/entries', {
        method: 'POST',
        body: {
          date: entryDate,
          workTypeId: selectedWorkType._id,
          hours: hoursValue,
          clientId: entryClientId || null,
          projectId: entryProjectId || null,
          description: entryDescription,
        },
      })
      setEntries((prev) => [payload.entry, ...prev])
      setEntryHours('1')
      setEntryClientId('')
      setEntryProjectId('')
      setEntryDescription('')
    } catch (error) {
      setDataError(error.message)
    }
  }

  const startEditEntry = (entry) => {
    setEditingEntryId(entry._id)
    setEditingEntryDate(entry.date)
    setEditingEntryWorkTypeId(entry.workTypeId)
    setEditingEntryHours(String(entry.hours))
    setEditingEntryClientId(entry.clientId || '')
    setEditingEntryProjectId(entry.projectId || '')
    setEditingEntryDescription(entry.description || '')
  }

  const cancelEditEntry = () => {
    setEditingEntryId(null)
    setEditingEntryDate('')
    setEditingEntryWorkTypeId('')
    setEditingEntryHours('')
    setEditingEntryClientId('')
    setEditingEntryProjectId('')
    setEditingEntryDescription('')
  }

  const saveEditEntry = async (event) => {
    event.preventDefault()
    const hoursValue = Number(editingEntryHours)
    if (!editingEntryDate || !hoursValue) {
      return
    }
    try {
      const payload = await apiFetch(
        token,
        `/api/entries/${editingEntryId}`,
        {
          method: 'PUT',
          body: {
            date: editingEntryDate,
            workTypeId: editingEntryWorkTypeId,
            hours: hoursValue,
            clientId: editingEntryClientId,
            projectId: editingEntryProjectId,
            description: editingEntryDescription,
          },
        }
      )
      setEntries((prev) =>
        prev.map((entry) =>
          entry._id === payload.entry._id ? payload.entry : entry
        )
      )
      cancelEditEntry()
    } catch (error) {
      setDataError(error.message)
    }
  }

  const deleteEntry = async (entryId) => {
    const confirmed = window.confirm(
      'Delete this entry? It will be hidden from the app but kept in the database.'
    )
    if (!confirmed) {
      return
    }
    try {
      await apiFetch(token, `/api/entries/${entryId}`, { method: 'DELETE' })
      setEntries((prev) => prev.filter((entry) => entry._id !== entryId))
    } catch (error) {
      setDataError(error.message)
    }
  }

  const updateEntry = async (entryId, updates) => {
    const payload = await apiFetch(token, `/api/entries/${entryId}`, {
      method: 'PUT',
      body: updates,
    })
    setEntries((prev) =>
      prev.map((entry) =>
        entry._id === payload.entry._id ? payload.entry : entry
      )
    )
  }

  const toggleBilled = async (entry) => {
    try {
      await updateEntry(entry._id, { billed: !entry.billed })
    } catch (error) {
      setDataError(error.message)
    }
  }

  const markWeekBilled = async (weekStart) => {
    const endDate = new Date(`${weekStart}T00:00:00`)
    endDate.setDate(endDate.getDate() + 6)
    const weekEnd = endDate.toISOString().slice(0, 10)
    const entryIds = entries
      .filter(
        (entry) =>
          !entry.billed && entry.date >= weekStart && entry.date <= weekEnd
      )
      .map((entry) => entry._id)

    if (entryIds.length === 0) {
      return
    }
    try {
      const payload = await apiFetch(token, '/api/entries/bulk-billed', {
        method: 'PATCH',
        body: { entryIds, billed: true },
      })
      setEntries((prev) => {
        const updated = new Map(
          payload.entries.map((entry) => [entry._id, entry])
        )
        return prev.map((entry) => updated.get(entry._id) || entry)
      })
    } catch (error) {
      setDataError(error.message)
    }
  }

  const handleExportCsv = () => {
    if (unbilledEntries.length === 0) {
      return
    }
    const includeOwner = isAdmin && viewAll
    const headers = includeOwner
      ? [
          'Date',
          'User',
          'Client',
          'Project',
          'Work Type',
          'Description',
          'Hours',
          'Rate',
          'Total',
        ]
      : [
          'Date',
          'Client',
          'Project',
          'Work Type',
          'Description',
          'Hours',
          'Rate',
          'Total',
        ]
    const rows = [
      headers,
      ...unbilledEntries.map((entry) => {
        const base = [
          entry.date,
          entry.clientName || entry.client || '',
          entry.projectName || entry.project || '',
          entry.workTypeName,
          entry.description || '',
          entry.hours,
          entry.rate,
          (entry.rate * entry.hours).toFixed(2),
        ]
        if (!includeOwner) {
          return base
        }
        const ownerLabel = entry.owner?.name || entry.owner?.email || ''
        return [entry.date, ownerLabel, ...base.slice(1)]
      }),
    ]

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `timesheet-${todayISO}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    if (!newUserEmail || !newUserPassword) {
      return
    }
    try {
      const payload = await apiFetch(token, '/api/admin/users', {
        method: 'POST',
        body: {
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
        },
      })
      setAdminUsers((prev) => [payload.user, ...prev])
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('user')
    } catch (error) {
      setDataError(error.message)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (!resetUserId || !resetPassword) {
      return
    }
    try {
      await apiFetch(token, `/api/admin/users/${resetUserId}/reset-password`, {
        method: 'POST',
        body: { password: resetPassword },
      })
      setResetUserId('')
      setResetPassword('')
    } catch (error) {
      setDataError(error.message)
    }
  }

  const handleAddClient = async (event) => {
    event.preventDefault()
    const trimmedName = newClientName.trim()
    if (!trimmedName) {
      return
    }
    try {
      const payload = await apiFetch(token, '/api/clients', {
        method: 'POST',
        body: { name: trimmedName },
      })
      setClients((prev) => [...prev, payload.client].sort((a, b) => a.name.localeCompare(b.name)))
      setNewClientName('')
    } catch (error) {
      setDataError(error.message)
    }
  }

  const startEditClient = (client) => {
    setEditingClientId(client._id)
    setEditingClientName(client.name)
  }

  const cancelEditClient = () => {
    setEditingClientId(null)
    setEditingClientName('')
  }

  const saveEditClient = async (event) => {
    event.preventDefault()
    const trimmedName = editingClientName.trim()
    if (!trimmedName) {
      return
    }
    try {
      const payload = await apiFetch(token, `/api/clients/${editingClientId}`, {
        method: 'PUT',
        body: { name: trimmedName },
      })
      setClients((prev) =>
        prev
          .map((client) =>
            client._id === payload.client._id ? payload.client : client
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      cancelEditClient()
    } catch (error) {
      setDataError(error.message)
    }
  }

  const deleteClient = async (clientId) => {
    try {
      await apiFetch(token, `/api/clients/${clientId}`, { method: 'DELETE' })
      setClients((prev) => prev.filter((client) => client._id !== clientId))
      setProjects((prev) => prev.filter((project) => project.clientId !== clientId))
    } catch (error) {
      setDataError(error.message)
    }
  }

  const handleAddProject = async (event) => {
    event.preventDefault()
    const trimmedName = newProjectName.trim()
    if (!trimmedName) {
      return
    }
    try {
      const payload = await apiFetch(token, '/api/projects', {
        method: 'POST',
        body: { name: trimmedName, clientId: newProjectClientId || null },
      })
      setProjects((prev) =>
        [...prev, payload.project].sort((a, b) => a.name.localeCompare(b.name))
      )
      setNewProjectName('')
      setNewProjectClientId('')
    } catch (error) {
      setDataError(error.message)
    }
  }

  const startEditProject = (project) => {
    setEditingProjectId(project._id)
    setEditingProjectName(project.name)
    setEditingProjectClientId(project.clientId || '')
  }

  const cancelEditProject = () => {
    setEditingProjectId(null)
    setEditingProjectName('')
    setEditingProjectClientId('')
  }

  const saveEditProject = async (event) => {
    event.preventDefault()
    const trimmedName = editingProjectName.trim()
    if (!trimmedName) {
      return
    }
    try {
      const payload = await apiFetch(
        token,
        `/api/projects/${editingProjectId}`,
        {
          method: 'PUT',
          body: {
            name: trimmedName,
            clientId: editingProjectClientId,
          },
        }
      )
      setProjects((prev) =>
        prev
          .map((project) =>
            project._id === payload.project._id ? payload.project : project
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      cancelEditProject()
    } catch (error) {
      setDataError(error.message)
    }
  }

  const deleteProject = async (projectId) => {
    try {
      await apiFetch(token, `/api/projects/${projectId}`, { method: 'DELETE' })
      setProjects((prev) => prev.filter((project) => project._id !== projectId))
    } catch (error) {
      setDataError(error.message)
    }
  }

  const getProjectOptions = (clientId) => {
    if (!clientId) {
      return projects
    }
    return projects.filter(
      (project) => !project.clientId || project.clientId === clientId
    )
  }

  const updatePoLineItem = (index, field, value) => {
    setPoLineItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    )
  }

  const addPoLineItem = () => {
    setPoLineItems((prev) => {
      if (prev.length >= MAX_PO_ITEMS) {
        return prev
      }
      return [...prev, createPoLineItem(prev.length)]
    })
  }

  const removePoLineItem = (index) => {
    setPoLineItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleExportPoPdf = () => {
    window.print()
  }

  const handleSavePo = async () => {
    const body = {
      poNumber,
      poDate,
      vendorName,
      vendorAddress,
      vendorContact,
      tax: poTax,
      shipping: poShipping,
      lineItems: poLineItems.map((item, index) => ({
        itemId: item.id || `item${index + 1}`,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
    }

    setPoSaving(true)
    try {
      const payload = poId
        ? await apiFetch(token, `/api/purchase-orders/${poId}`, {
            method: 'PUT',
            body,
          })
        : await apiFetch(token, '/api/purchase-orders', {
            method: 'POST',
            body,
          })
      applyPoData(payload.purchaseOrder)
      await refreshPoRecords(isAdmin && poViewAll)
      setDataError('')
    } catch (error) {
      setDataError(error.message)
    } finally {
      setPoSaving(false)
    }
  }

  const handleStartNewPo = () => {
    setPoId('')
    setPoNumber(getPoDraftNumber(todayISO))
    setPoDate(todayISO)
    setVendorName('')
    setVendorAddress('')
    setVendorContact('')
    setPoTax('0')
    setPoShipping('TBD')
    setPoLineItems(Array.from({ length: 4 }, (_, index) => createPoLineItem(index)))
  }

  const handleDuplicatePo = async () => {
    const body = {
      poNumber: getPoDraftNumber(poDate),
      poDate,
      vendorName,
      vendorAddress,
      vendorContact,
      tax: poTax,
      shipping: poShipping,
      lineItems: poLineItems.map((item, index) => ({
        itemId: item.id || `item${index + 1}`,
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
      })),
    }
    setPoSaving(true)
    try {
      const payload = await apiFetch(token, '/api/purchase-orders', {
        method: 'POST',
        body,
      })
      applyPoData(payload.purchaseOrder)
      await refreshPoRecords(isAdmin && poViewAll)
      setDataError('')
    } catch (error) {
      setDataError(error.message)
    } finally {
      setPoSaving(false)
    }
  }

  if (!token || authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">Work Tools</p>
          <h1>Sign in</h1>
          <p className="hero-subtitle">Admin-created accounts only.</p>
          {authError && <div className="alert">{authError}</div>}
          <form className="form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={authLoading}>
              Sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {showModuleMenu ? (
        <section className="module-screen">
          <div className="module-screen-header">
            <img
              src="/DD-logo-vented-wAlpha.png"
              alt="Discrete Development logo"
              className="module-screen-logo"
            />
            <p className="eyebrow">Discrete Development</p>
            <h1>Work Tools</h1>
            <p className="module-screen-subtitle">
              Choose a workspace module. More tools can be added here later.
            </p>
            <span className="pill">
              {user?.name || user?.email} · {user?.role}
            </span>
          </div>
          <div className="module-grid">
            {moduleOptions.map((module) => (
              <button
                key={module.id}
                type="button"
                className="module-card"
                onClick={() => {
                  setActiveModule(module.id)
                  if (module.id === 'timesheet') {
                    setTimesheetPage('entry')
                  }
                  setShowModuleMenu(false)
                }}
              >
                <h2>{module.label}</h2>
                <span>Open {module.label}</span>
              </button>
            ))}
          </div>
          {isAdmin && (
            <div className="module-admin">
              <button
                type="button"
                className="module-card admin-card"
                onClick={() => {
                  setActiveModule('admin')
                  setAdminPage('users')
                  setShowModuleMenu(false)
                }}
              >
                <h2>Admin Controls</h2>
                <span>Manage users, clients, and projects</span>
              </button>
            </div>
          )}
          <button type="button" className="ghost" onClick={handleLogout}>
            Log out
          </button>
        </section>
      ) : (
        <>
      <header className="top-nav">
        <div className="brand-block">
          <img
            src="/DD-logo-vented-wAlpha.png"
            alt="Discrete Development logo"
            className="brand-logo"
          />
          <div>
            <p className="eyebrow">Discrete Development</p>
            <h1 className="brand-title">Work Tools</h1>
          </div>
        </div>
        <div className="top-nav-actions">
          <button
            type="button"
            className="ghost nav-toggle"
            onClick={() => setShowModuleMenu(true)}
          >
            Menu
          </button>
          <span className="pill">
            {user?.name || user?.email} · {user?.role}
          </span>
          <button type="button" className="ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {activeModule === 'timesheet' && (
        <>
      <header className="hero">
        <div>
          <p className="eyebrow">Discrete Development's Work Tools</p>
          <h1>Timesheets</h1>
          <p className="user-name">
            Welcome, {user?.name || user?.email}
          </p>
          {/* <p className="hero-subtitle">
            Capture billable work, keep weekly totals for invoicing, and stay
            ready for follow-ups.
          </p> */}
          <div className="hero-actions">
            <span className="pill">
              {user?.name || user?.email} · {user?.role}
            </span>
            <button type="button" className="ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
          {dataError && <div className="alert">{dataError}</div>}
        </div>
        <div className="hero-card">
          <h2>Invoice Tallys</h2>
          <div className="hero-metric">
            <span>Total logged</span>
            <strong>{formatCurrency(overallTotal)}</strong>
          </div>
          <div className="hero-metric">
            <span>Unbilled total</span>
            <strong>{formatCurrency(unbilledTotal)}</strong>
          </div>
          <div className="hero-metric">
            <span>Active work types</span>
            <strong>{workTypes.length}</strong>
          </div>
          <div className="hero-metric">
            <span>Entries</span>
            <strong>{entries.length}</strong>
          </div>
        </div>
      </header>

      <nav className="timesheet-subnav">
        <button
          type="button"
          className={`timesheet-subnav-button ${timesheetPage === 'entry' ? 'is-active' : ''}`}
          onClick={() => setTimesheetPage('entry')}
        >
          Entry
        </button>
        <button
          type="button"
          className={`timesheet-subnav-button ${timesheetPage === 'daily' ? 'is-active' : ''}`}
          onClick={() => setTimesheetPage('daily')}
        >
          Daily Log
        </button>
        <button
          type="button"
          className={`timesheet-subnav-button ${timesheetPage === 'weekly' ? 'is-active' : ''}`}
          onClick={() => setTimesheetPage('weekly')}
        >
          Weekly Totals
        </button>
      </nav>

      {timesheetPage !== 'weekly' && (
      <section className="grid">
        {timesheetPage === 'entry' && (
          <>
        <div className="panel" style={{ '--delay': '60ms' }}>
          <div className="panel-header">
            <h2>Work Types</h2>
            <p>Keep your rates handy.</p>
          </div>
          {dataLoading && workTypes.length === 0 ? (
            <div className="empty-state">Loading work types...</div>
          ) : (
            <ul className="worktype-list">
              {workTypes.map((type) => (
                <li key={type._id}>
                  {editingWorkTypeId === type._id ? (
                    <form className="worktype-edit" onSubmit={saveEditWorkType}>
                      <div className="worktype-inputs">
                        <input
                          type="text"
                          value={editingWorkName}
                          onChange={(event) =>
                            setEditingWorkName(event.target.value)
                          }
                        />
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={editingWorkRate}
                          onChange={(event) =>
                            setEditingWorkRate(event.target.value)
                          }
                        />
                      </div>
                      <div className="worktype-actions">
                        <button type="submit" className="worktype-button">
                          Save
                        </button>
                        <button
                          type="button"
                          className="worktype-button ghost"
                          onClick={cancelEditWorkType}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="worktype-info">
                        <span>{type.name}</span>
                        <span>{formatCurrency(type.rate)}/hr</span>
                      </div>
                      <div className="worktype-actions">
                        <button
                          type="button"
                          className="worktype-button ghost"
                          onClick={() => startEditWorkType(type)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="worktype-button ghost danger"
                          onClick={() => deleteWorkType(type._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form className="form" onSubmit={handleAddWorkType}>
            <label>
              Work name
              <input
                type="text"
                value={newWorkName}
                onChange={(event) => setNewWorkName(event.target.value)}
                placeholder="Implementation sprint"
              />
            </label>
            <label>
              Hourly rate
              <input
                type="number"
                min="0"
                step="1"
                value={newWorkRate}
                onChange={(event) => setNewWorkRate(event.target.value)}
              />
            </label>
            <button type="submit">Add work type</button>
          </form>
        </div>

        <div className="panel" style={{ '--delay': '120ms' }}>
          <div className="panel-header">
            <h2>Timesheet</h2>
            <p>Log today or backfill the last few weeks.</p>
          </div>
          {workTypes.length === 0 ? (
            <div className="empty-state">
              Add a work type to start tracking time.
            </div>
          ) : (
            <form className="form" onSubmit={handleAddEntry}>
              <label>
                Date
                <input
                  type="date"
                  value={entryDate}
                  onChange={(event) => setEntryDate(event.target.value)}
                />
              </label>
              <label>
                Client
                <select
                  value={entryClientId}
                  onChange={(event) => {
                    setEntryClientId(event.target.value)
                    setEntryProjectId('')
                  }}
                >
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Project
                <select
                  value={entryProjectId}
                  onChange={(event) => setEntryProjectId(event.target.value)}
                >
                  <option value="">No project</option>
                  {getProjectOptions(entryClientId).map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Work type
                <select
                  value={entryWorkTypeId}
                  onChange={(event) => setEntryWorkTypeId(event.target.value)}
                >
                  {workTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name} · {formatCurrency(type.rate)}/hr
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Duration (hours)
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={entryHours}
                  onChange={(event) => setEntryHours(event.target.value)}
                />
              </label>
              <label>
                Description of Work
                <input
                  type="text"
                  minLength="5"
                  maxLength="100"
                  placeholder="Brief description of the work performed"
                  value={entryDescription}
                  onChange={(event) => setEntryDescription(event.target.value)}
                />
              </label>
              <div className="total-row">
                <span>Entry total</span>
                <strong>{formatCurrency(entryTotal)}</strong>
              </div>
              <button type="submit">Add to timesheet</button>
            </form>
          )}
        </div>
          </>
        )}

        {timesheetPage === 'daily' && (
        <div className="panel panel-wide" style={{ '--delay': '180ms' }}>
          <div className="panel-header">
            <h2>Daily Log</h2>
            <p>Grouped by date for quick invoice checks.</p>
          </div>
          {sortedDates.length === 0 ? (
            <div className="empty-state">
              No entries yet. Add your first time block.
            </div>
          ) : (
            <div className="log">
              {sortedDates.map((date) => {
                const dayEntries = entriesByDate[date]
                const dayTotal = dayEntries.reduce(
                  (sum, entry) => sum + entry.rate * entry.hours,
                  0
                )
                return (
                  <div className="log-day" key={date}>
                    <div className="log-day-header">
                      <h3>{formatDate(date)}</h3>
                      <span>{formatCurrency(dayTotal)}</span>
                    </div>
                    <div className="log-rows">
                      {dayEntries.map((entry) => {
                        const ownerLabel =
                          entry.owner?.name || entry.owner?.email || ''
                        const canEditEntry =
                          isAdmin || entry.owner?._id === user?._id || !entry.owner
                        return (
                          <div className="log-row" key={entry._id}>
                            <div>
                              <strong>{entry.workTypeName}</strong>
                              {ownerLabel && viewAll && (
                                <span className="tagline">{ownerLabel}</span>
                              )}
                              {(entry.clientName ||
                                entry.projectName ||
                                entry.client ||
                                entry.project) && (
                                  <span className="tagline">
                                    {[
                                      entry.clientName || entry.client,
                                      entry.projectName || entry.project,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                )}
                              <span>
                                {entry.hours}h · {formatCurrency(entry.rate)}/hr
                              </span>
                              {entry.description && (
                                <span className="tagline">
                                  {entry.description}
                                </span>
                              )}
                            </div>
                            <div className="log-row-actions">
                              <div className="row-total">
                                {formatCurrency(entry.rate * entry.hours)}
                              </div>
                              <label className="billed-toggle">
                                <input
                                  type="checkbox"
                                  checked={entry.billed}
                                  onChange={() => toggleBilled(entry)}
                                />
                                <span>
                                  {entry.billed ? 'Billed' : 'Unbilled'}
                                </span>
                              </label>
                              <div className="row-buttons">
                                {canEditEntry && (
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => startEditEntry(entry)}
                                  >
                                    Edit
                                  </button>
                                )}
                                {canEditEntry && (
                                  <button
                                    type="button"
                                    className="ghost danger"
                                    onClick={() => deleteEntry(entry._id)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        )}
      </section>
      )}

      {timesheetPage === 'daily' && editingEntryId && (
        <section className="grid">
          <div className="panel" style={{ '--delay': '200ms' }}>
            <div className="panel-header">
              <h2>Edit entry</h2>
              <p>Adjust time, work type, or tags.</p>
            </div>
            <form className="form" onSubmit={saveEditEntry}>
              <label>
                Date
                <input
                  type="date"
                  value={editingEntryDate}
                  onChange={(event) => setEditingEntryDate(event.target.value)}
                />
              </label>
              <label>
                Client
                <select
                  value={editingEntryClientId}
                  onChange={(event) => {
                    setEditingEntryClientId(event.target.value)
                    setEditingEntryProjectId('')
                  }}
                >
                  <option value="">No client</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Project
                <select
                  value={editingEntryProjectId}
                  onChange={(event) => setEditingEntryProjectId(event.target.value)}
                >
                  <option value="">No project</option>
                  {getProjectOptions(editingEntryClientId).map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Work type
                <select
                  value={editingEntryWorkTypeId}
                  onChange={(event) =>
                    setEditingEntryWorkTypeId(event.target.value)
                  }
                >
                  {workTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name} · {formatCurrency(type.rate)}/hr
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Duration (hours)
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={editingEntryHours}
                  onChange={(event) => setEditingEntryHours(event.target.value)}
                />
              </label>
              <label>
                Description of Work
                <input
                  type="text"
                  minLength="5"
                  maxLength="100"
                  value={editingEntryDescription}
                  onChange={(event) =>
                    setEditingEntryDescription(event.target.value)
                  }
                />
              </label>
              <div className="row-buttons">
                <button type="submit">Save changes</button>
                <button type="button" className="ghost" onClick={cancelEditEntry}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {timesheetPage === 'weekly' && (
      <section className="grid">
        <div className="panel" style={{ '--delay': '240ms' }}>
          <div className="panel-header">
            <h2>Weekly Totals</h2>
            <p>Track what is ready to invoice.</p>
          </div>
          {weeklyKeys.length === 0 ? (
            <div className="empty-state">
              Weekly totals appear after your first entry.
            </div>
          ) : (
            <div className="weekly">
              {weeklyKeys.map((weekStart) => {
                const week = weeklyTotals[weekStart]
                const unbilledWeek = weeklyUnbilledTotals[weekStart]
                const weekStartDate = formatDate(weekStart)
                const endDate = new Date(`${weekStart}T00:00:00`)
                endDate.setDate(endDate.getDate() + 6)
                return (
                  <div className="weekly-row" key={weekStart}>
                    <div>
                      <strong>{weekStartDate}</strong>
                      <span>
                        through {formatDate(endDate.toISOString().slice(0, 10))}
                      </span>
                    </div>
                    <div className="row-total">
                      {week.hours.toFixed(2)}h · {formatCurrency(week.total)}
                    </div>
                    <button
                      type="button"
                      className="weekly-bill-button"
                      onClick={() => markWeekBilled(weekStart)}
                      disabled={!unbilledWeek || unbilledWeek.total === 0}
                    >
                      Mark week billed
                    </button>
                  </div>
                )
              }
              )}
            </div>
          )}
          <button
            type="button"
            className="export-button"
            onClick={handleExportCsv}
            disabled={unbilledEntries.length === 0}
          >
            Export CSV for QuickBooks
          </button>
        </div>
      </section>
      )}
        </>
      )}

      {activeModule === 'admin' && isAdmin && (
        <section className="admin-shell">
          <div className="panel-header">
            <h2>Admin Controls</h2>
            <p>Manage users, clients, projects, and global timesheet visibility.</p>
          </div>
          <nav className="admin-subnav">
            <button
              type="button"
              className={`timesheet-subnav-button ${adminPage === 'users' ? 'is-active' : ''}`}
              onClick={() => setAdminPage('users')}
            >
              Users
            </button>
            <button
              type="button"
              className={`timesheet-subnav-button ${adminPage === 'clients' ? 'is-active' : ''}`}
              onClick={() => setAdminPage('clients')}
            >
              Clients
            </button>
            <button
              type="button"
              className={`timesheet-subnav-button ${adminPage === 'projects' ? 'is-active' : ''}`}
              onClick={() => setAdminPage('projects')}
            >
              Projects
            </button>
          </nav>

          {dataError && <div className="alert">{dataError}</div>}

          {adminPage === 'users' && (
            <section className="grid">
              <div className="panel" style={{ '--delay': '20ms' }}>
                <div className="admin-controls">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={viewAll}
                      onChange={(event) => setViewAll(event.target.checked)}
                    />
                    <span>View all timesheet entries</span>
                  </label>
                </div>
                <form className="form" onSubmit={handleCreateUser}>
                  <label>
                    Name
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(event) => setNewUserName(event.target.value)}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(event) => setNewUserEmail(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Temp password
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={(event) => setNewUserPassword(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Role
                    <select
                      value={newUserRole}
                      onChange={(event) => setNewUserRole(event.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <button type="submit">Create account</button>
                </form>
                <form className="form" onSubmit={handleResetPassword}>
                  <label>
                    Reset password for
                    <select
                      value={resetUserId}
                      onChange={(event) => setResetUserId(event.target.value)}
                    >
                      <option value="">Select a user</option>
                      {adminUsers.map((entry) => (
                        <option key={entry._id} value={entry._id}>
                          {entry.name || entry.email} · {entry.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    New temp password
                    <input
                      type="text"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                    />
                  </label>
                  <button type="submit">Reset password</button>
                </form>
                {adminUsers.length > 0 && (
                  <div className="admin-list">
                    {adminUsers.map((entry) => (
                      <div className="admin-row" key={entry._id}>
                        <div>
                          <strong>{entry.name || entry.email}</strong>
                          <span>{entry.email}</span>
                        </div>
                        <span className="pill">{entry.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {adminPage === 'clients' && (
            <section className="roster-workbench">
              <div className="panel roster-column" style={{ '--delay': '20ms' }}>
                <div className="panel-header">
                  <h2>Client Roster</h2>
                  <p>Scroll list on the left. Edit or remove clients.</p>
                </div>
                <ul className="roster-list">
                  {clients.map((client) => (
                    <li key={client._id}>
                      {editingClientId === client._id ? (
                        <form className="roster-edit" onSubmit={saveEditClient}>
                          <input
                            type="text"
                            value={editingClientName}
                            onChange={(event) =>
                              setEditingClientName(event.target.value)
                            }
                          />
                          <div className="roster-actions">
                            <button type="submit" className="ghost">
                              Save
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={cancelEditClient}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <span>{client.name}</span>
                          <div className="roster-actions">
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => startEditClient(client)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ghost danger"
                              onClick={() => deleteClient(client._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="panel" style={{ '--delay': '40ms' }}>
                <div className="panel-header">
                  <h2>Add Client</h2>
                  <p>Use this form on the right to add a new client.</p>
                </div>
                <form className="form" onSubmit={handleAddClient}>
                  <label>
                    New client
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(event) => setNewClientName(event.target.value)}
                    />
                  </label>
                  <button type="submit">Add client</button>
                </form>
              </div>
            </section>
          )}

          {adminPage === 'projects' && (
            <section className="roster-workbench">
              <div className="panel roster-column" style={{ '--delay': '20ms' }}>
                <div className="panel-header">
                  <h2>Project Roster</h2>
                  <p>Scroll list on the left. Projects can link to clients.</p>
                </div>
                <ul className="roster-list">
                  {projects.map((project) => {
                    const clientName = clients.find(
                      (client) => client._id === project.clientId
                    )?.name
                    return (
                      <li key={project._id}>
                        {editingProjectId === project._id ? (
                          <form className="roster-edit" onSubmit={saveEditProject}>
                            <input
                              type="text"
                              value={editingProjectName}
                              onChange={(event) =>
                                setEditingProjectName(event.target.value)
                              }
                            />
                            <select
                              value={editingProjectClientId}
                              onChange={(event) =>
                                setEditingProjectClientId(event.target.value)
                              }
                            >
                              <option value="">No client</option>
                              {clients.map((client) => (
                                <option key={client._id} value={client._id}>
                                  {client.name}
                                </option>
                              ))}
                            </select>
                            <div className="roster-actions">
                              <button type="submit" className="ghost">
                                Save
                              </button>
                              <button
                                type="button"
                                className="ghost"
                                onClick={cancelEditProject}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div>
                              <strong>{project.name}</strong>
                              {clientName && (
                                <span className="tagline">{clientName}</span>
                              )}
                            </div>
                            <div className="roster-actions">
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => startEditProject(project)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ghost danger"
                                onClick={() => deleteProject(project._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="panel" style={{ '--delay': '40ms' }}>
                <div className="panel-header">
                  <h2>Add Project</h2>
                  <p>Use this form on the right to add a project.</p>
                </div>
                <form className="form" onSubmit={handleAddProject}>
                  <label>
                    New project
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(event) => setNewProjectName(event.target.value)}
                    />
                  </label>
                  <label>
                    Client (optional)
                    <select
                      value={newProjectClientId}
                      onChange={(event) => setNewProjectClientId(event.target.value)}
                    >
                      <option value="">No client</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Add project</button>
                </form>
              </div>
            </section>
          )}
        </section>
      )}

      {activeModule === 'po' && (
        <section className="po-shell">
          <div className="po-layout">
            <aside className="po-history">
              <div className="po-history-header">
                <h3>PO History</h3>
                {isAdmin && (
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={poViewAll}
                      onChange={(event) => setPoViewAll(event.target.checked)}
                    />
                    <span>View all users</span>
                  </label>
                )}
              </div>
              {poListLoading ? (
                <div className="empty-state">Loading purchase orders...</div>
              ) : poRecords.length === 0 ? (
                <div className="empty-state">No saved purchase orders yet.</div>
              ) : (
                <ul className="po-history-list">
                  {poRecords.map((record) => (
                    <li key={record._id}>
                      <button
                        type="button"
                        className={`po-history-item ${poId === record._id ? 'is-active' : ''}`}
                        onClick={() => applyPoData(record)}
                      >
                        <strong>{record.poNumber || 'Untitled PO'}</strong>
                        <span>{record.vendorName || 'No vendor'}</span>
                        <span>{formatTimestampDate(record.updatedAt)}</span>
                        {isAdmin && poViewAll && (
                          <span>{record.owner?.name || record.owner?.email || 'Unknown user'}</span>
                        )}
                        <span>{formatCurrency(getPoListTotal(record))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div>
              <div className="po-toolbar">
                <button type="button" onClick={handleSavePo} disabled={poSaving}>
                  {poSaving ? 'Saving...' : poId ? 'Update PO' : 'Save PO'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleDuplicatePo}
                  disabled={poSaving || !poId}
                >
                  Duplicate PO
                </button>
                <button type="button" onClick={handleExportPoPdf}>
                  Export PDF
                </button>
                <button type="button" className="ghost" onClick={handleStartNewPo}>
                  New PO
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setActiveModule('timesheet')}
                >
                  Back to Timesheet
                </button>
              </div>

              {dataError && <div className="alert">{dataError}</div>}

              <article className="po-doc">
            <div className="po-headline">
              <img
                src="/DD-logo-vented-wAlpha.png"
                alt="Discrete Development logo"
                className="po-logo"
              />
              <div>
                <h2>DISCRETE DEVELOPMENT LLC</h2>
                <h3>Purchase Order</h3>
              </div>
            </div>

            <div className="po-meta-grid">
              <label>
                PO Number
                <input
                  type="text"
                  value={poNumber}
                  onChange={(event) => setPoNumber(event.target.value)}
                />
              </label>
              <label>
                PO Date
                <input
                  type="date"
                  value={poDate}
                  onChange={(event) => setPoDate(event.target.value)}
                />
              </label>
            </div>
            {poId && <p className="po-saved-meta">Stored in MongoDB</p>}

            <div className="po-addresses">
              <div>
                <h4>Vendor</h4>
                <label>
                  Vendor Name
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(event) => setVendorName(event.target.value)}
                    placeholder="Vendor Name"
                  />
                </label>
                <label>
                  Vendor Address
                  <textarea
                    rows="3"
                    value={vendorAddress}
                    onChange={(event) => setVendorAddress(event.target.value)}
                    placeholder="Vendor Address"
                  />
                </label>
                <label>
                  Vendor Contact
                  <input
                    type="text"
                    value={vendorContact}
                    onChange={(event) => setVendorContact(event.target.value)}
                    placeholder="Vendor Contact"
                  />
                </label>
              </div>
              <div>
                <h4>Ship To</h4>
                <p>Discrete Development LLC</p>
                <p>1800 Esplanade Ave, Number 3</p>
                <p>Klamath Falls, Oregon 97601</p>
                <p>Contact: Kevin Wagner | 805.651.3043</p>
              </div>
            </div>

            <div className="po-line-items">
              <div className="po-line-header">
                <h4>Line Items</h4>
                <span className="po-line-count">{poLineItems.length}/{MAX_PO_ITEMS}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Ext. Price</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {poLineItems.map((item, index) => {
                    const qty = Number(item.qty) || 0
                    const unitPrice = Number(item.unitPrice) || 0
                    const extPrice = qty * unitPrice
                    return (
                      <tr key={`po-item-${index}`}>
                        <td>
                          <input
                            type="text"
                            value={item.id}
                            onChange={(event) =>
                              updatePoLineItem(index, 'id', event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(event) =>
                              updatePoLineItem(index, 'description', event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.qty}
                            onChange={(event) =>
                              updatePoLineItem(index, 'qty', event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              updatePoLineItem(index, 'unitPrice', event.target.value)
                            }
                          />
                        </td>
                        <td>{formatCurrency(extPrice)}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost po-row-remove"
                            onClick={() => removePoLineItem(index)}
                            disabled={poLineItems.length <= 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button
                type="button"
                className="ghost po-add-line"
                onClick={addPoLineItem}
                disabled={poLineItems.length >= MAX_PO_ITEMS}
              >
                Add Line Item
              </button>
            </div>

            <div className="po-totals">
              <div>
                <span>Subtotal:</span>
                <strong>{formatCurrency(poSubtotal)}</strong>
              </div>
              <label>
                Tax
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={poTax}
                  onChange={(event) => setPoTax(event.target.value)}
                />
              </label>
              <label>
                Shipping
                <input
                  type="text"
                  value={poShipping}
                  onChange={(event) => setPoShipping(event.target.value)}
                />
              </label>
              <div>
                <span>Total:</span>
                <strong>{formatCurrency(poTotal)}</strong>
              </div>
            </div>

            <div className="po-terms">
              <h4>Terms & Conditions</h4>
              <ul>
                <li>Net 30 from invoice date.</li>
                <li>No substitutions without approval.</li>
                <li>PO number must appear on all invoices.</li>
                <li>Please include PO# on invoice.</li>
              </ul>
            </div>

            <div className="po-signature">
              <p>Authorized By:</p>
              <p>Kevin Wagner, Founder & Architect</p>
              <p>Discrete Development LLC</p>
            </div>
              </article>
            </div>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  )
}

export default App
