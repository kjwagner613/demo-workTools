# WorkTools — Operations for Small Companies
<div style="display: flex; align-items: center; width: 100%;">
  <h1 style="margin: 0; font-size: 2rem;">
    A Discrete Development Project 
  </h1>
  <img src="./assets/dd-badge.png" alt="Discrete Development Badge" style="margin-left: 35%; width: 64px">
  </div>

### Overview
WorkTools is a lightweight, deterministic operational system designed for founders who want clarity, structure, and control from day one. It began as an internal toolset for Discrete Development LLC and has grown into a replicable framework for early‑stage companies who need real operational scaffolding without the noise of bloated SaaS platforms.
WorkTools is not a product you subscribe to.
It’s a system you own, deploy, and evolve.

### What WorkTools Is Today
WorkTools currently provides a clean, minimal operational backbone built around six core collections:
- clients — who you serve
- projects — what you’re delivering
- worktypes — how you categorize labor
- entries — time and work logs
- purchase orders — procurement and vendor operations
- users — your internal team (Admin and User)

This structure is intentionally simple, stable, and drift‑free. It gives founders a cockpit instead of a pile of spreadsheets.

WorkTools is deployed as:
- a MongoDB Atlas database
- a GitHub repository containing the full codebase
- a Netlify frontend
- a Heroku (or similar) backend
Each founder owns their entire stack.

### What WorkTools Is Becoming
WorkTools is evolving into a small‑company operating system — a modular, extensible framework that supports:
- procurement workflows
- client and vendor masters
- project tracking
- time and labor management
- document generation (POs, invoices, etc.)
- asset tracking
- expense and receipt logging
- approvals and audit trails
- clean versioning and migrations
The philosophy is simple:
- Give founders the structure they need without creating dependency
- Teach clarity
- Avoid drift
- Respect boundaries
WorkTools will continue to grow, but always with the same principles:
- deterministic architecture
- minimalism
- transparency
- user sovereignty
- no hidden data, no lock‑in

### Data Ownership
WorkTools is built on a simple principle: your data is yours.
All operational data lives in your own MongoDB Atlas database, under your account, in your region, with your security settings. This means:
- you own your data
- you control your data
- you can export or migrate it at any time
- you can move to another platform without losing history
- you are never locked into WorkTools or Discrete Development
WorkTools is intentionally designed to avoid dependency.
If you choose to adopt a new operational platform in the future, your entire dataset moves with you.
This is structural sovereignty — not a service contract.

### What I’m Now Offering
Initially I created this for the new small business owners coming out of Inc Authority with me — but now I’m offering WorkTools to anyone who needs to start their business infrasructure for a low cost. How about free.

This includes:
- helping you set up your own Atlas database
- helping you fork and configure your own GitHub repo
- helping you deploy your own frontend and backend
- giving you a demo environment to explore
- teaching you the operational patterns that keep companies clean and scalable
You own everything.
You control everything.
I simply help you assemble the system and understand how to use it.
Updates to WorkTools will be versioned.
Founders can choose to adopt new releases when they’re ready.
This keeps every company sovereign while still benefiting from a shared operational language.

### Setup 
1. Create Your MongoDB Atlas Database
- Sign in or create an Atlas account
- Create a free or paid cluster
- Add your IP to the access list
- Create a database user
- Copy your connection string
This connection string becomes your server’s MONGODB_URI.

2. Fork the WorkTools Repository
- Fork the GitHub repo into your own account
- Clone it locally
- Review the folder structure (client/ and server/)
- Confirm .env files are ignored
You now own your codebase.

3. Configure the Backend (server/)
Create a .env file inside /server with:
MONGODB_URI=your_atlas_connection_string
JWT_SECRET=your_secret_key
PORT=4000


Install dependencies:
npm install


Run locally:
npm run dev



4. Configure the Frontend (client/)
Create a .env file inside /client with:
VITE_API_URL=https://your-backend-url


Install dependencies:
npm install


Run locally:
npm run dev



5. Deploy the Backend
Deploy to:
- Heroku
- Render
- Railway
- Fly.io
Set your environment variables:
- MONGODB_URI
- JWT_SECRET
- PORT
Copy the backend URL for the frontend.

6. Deploy the Frontend
Deploy to:
- Netlify
- Vercel
- Cloudflare Pages
Set:
VITE_API_URL=https://your-backend-url


Publish the site.

7. Log In and Begin Using WorkTools
Once both services are live:
- visit your frontend URL
- create your first user
- begin adding clients, projects, and entries
You now have a fully owned operational system.

### Philosophy
WorkTools is built on the core principles of Discrete Development:
- Clarity over complexity
- Boundaries over entanglement
- Ownership over dependency
- Determinism over drift
- Structure over chaos
It’s not meant to be everything.
It’s meant to be the right things — the things that matter early, the things that keep a company honest, the things that prevent operational debt.

### Roadmap (High‑Level)
- Vendor master
- Asset tracker
- Expense receipts
- Billing cycles
- Document vault
- Audit log
- Optional integrations (email, storage, etc.)
- Guided onboarding for new founders
WorkTools will grow slowly and intentionally.
Every addition must earn its place.

### License
WorkTools is free 

- If you fork it, you own it.
- If you deploy it, it's yours.
- If you extend it, you shape your own operational future.

### Versioning & Releases
WorkTools follows a simple, intentional versioning model designed to protect clarity and founder sovereignty.

Each release is:
- small
- deterministic
- fully documented
- optional to adopt

You choose when to upgrade.
No one is forced forward.

v1 — Initial Release
This version represents the first formalized release of WorkTools as a replicable operational system. 

It includes:
- the six‑collection operational backbone
- the Netlify frontend
- the Heroku‑ready backend
- the Atlas database structure
- the helper‑guided onboarding flow
- the clean, deterministic repo layout
- the foundational philosophy and operational patterns

v1 is intentionally minimal.

It establishes the structure that all future versions will build on.



<div style="display: flex; align-items: center; justify-content: center; width: 100%;">
  <a href="https://discrete-dev.com" style="text-decoration: none;">
    <img src="assets/SignatureBlock.png" alt="Signature Block" width="300" />
  </a>
</div>




