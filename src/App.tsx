import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { Search, Send, Inbox } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileView } from './components/ProfileView'
import { AttestForm } from './components/AttestForm'
import { InboxView } from './components/InboxView'

type Tab = 'profile' | 'attest' | 'inbox'

const TABS: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: 'profile', label: 'Profiles', icon: Search },
  { id: 'attest', label: 'Attest', icon: Send },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('profile')

  return (
    <div className="min-h-dvh">

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <span className="display text-base font-bold text-slate-900">
              ProofOfWork
            </span>
            <span className="ml-1.5 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Arc Testnet
            </span>
          </div>
          <ConnectKitButton />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Hero */}
        <div className="mb-6">
          <h1 className="display text-2xl font-bold text-slate-900 text-balance">
            Your work history,<br />
            <span className="text-[#0f1b2d]">on-chain forever.</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 text-pretty leading-relaxed">
            CVs can lie. Money never does. Every attestation is a permanent, tamper-proof record on Arc.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-1 mb-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === id
                  ? 'bg-[#0f1b2d] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'profile' && <ProfileView />}
            {tab === 'attest' && (
              <div className="bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-5">
                <h2
                  className="text-sm font-semibold text-slate-900 mb-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Create attestation
                </h2>
                <AttestForm />
              </div>
            )}
            {tab === 'inbox' && <InboxView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer note */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full px-4 py-2 text-xs text-slate-400 shadow-sm">
          Deployed on Arc Testnet · USDC native gas
        </div>
      </div>
    </div>
  )
}
