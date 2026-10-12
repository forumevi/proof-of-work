import { useState } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useReadContract } from 'wagmi'
import { Search, Send, Inbox, Award, Users, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { arcTestnet } from 'viem/chains'
import { ProfileView } from './components/ProfileView'
import { AttestForm } from './components/AttestForm'
import { InboxView } from './components/InboxView'


type Tab = 'profile' | 'attest' | 'inbox'

const CONTRACT_ADDRESS = '0x88dc2637d699cd2bcd22fc0a56e2fcb22d1e6084' as `0x${string}`
const CHAIN_ID = arcTestnet.id

const STATS_ABI = [
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const TABS: { id: Tab; label: string; icon: typeof Search }[] = [
  { id: 'profile', label: 'Profiles', icon: Search },
  { id: 'attest', label: 'Attest', icon: Send },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
]

const spectral = 'linear-gradient(90deg, #5fbeff, #af8ff4, #f05c6b, #ffcd83, #7ef1b3)'

export default function App() {
  const [tab, setTab] = useState<Tab>('profile')

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: STATS_ABI,
    functionName: 'totalSupply',
    chainId: CHAIN_ID,
  })

  const attestCount = totalSupply != null ? Number(totalSupply) : null

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden"
      style={{ background: 'linear-gradient(180deg, #f9f9fc 0%, #fffcf7 52%, #fbf7f2 100%)' }}
    >
      {/* Soft blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '6%', left: '3%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(133,177,237,0.18) 0%, transparent 70%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,205,131,0.16) 0%, transparent 70%)', filter: 'blur(65px)' }} />
        <div style={{ position: 'absolute', top: '45%', right: '15%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(175,143,244,0.12) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 pb-16">

        {/* Header */}
        <header className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-2"
          style={{ background: 'rgba(249,249,252,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(18,45,69,0.07)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Award size={14} className="text-white" />
              </div>
              <span className="display text-base font-bold" style={{ color: 'var(--ink)' }}>ProofOfWork</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest"
                style={{ background: 'rgba(18,45,69,0.07)', color: 'var(--muted)' }}>Arc Testnet</span>
            </div>
            <ConnectKitButton />
          </div>
        </header>

        {/* Hero */}
        <div className="pt-8 pb-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="display text-4xl sm:text-5xl font-bold leading-[1.08] text-balance mb-4" style={{ color: 'var(--ink)', letterSpacing: '-0.04em' }}>
              Your work history,<br />
              <span style={{ background: spectral, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                on-chain forever.
              </span>
            </h1>
            <p className="text-base leading-relaxed max-w-lg" style={{ color: 'var(--muted)' }}>
              CVs can lie. Money never does. Every attestation is a permanent,
              tamper-proof record on Arc — where USDC is the native gas.
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex gap-3 mt-6"
          >
            {[
              {
                icon: Award,
                label: 'Attestations',
                value: attestCount != null ? attestCount.toString() : '—',
              },
              {
                icon: Users,
                label: 'On Arc Testnet',
                value: 'Live',
              },
              {
                icon: DollarSign,
                label: 'Gas Token',
                value: 'USDC',
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex-1 rounded-2xl p-3.5"
                style={{
                  background: 'rgba(255,255,255,0.64)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.68)',
                  boxShadow: '0 4px 16px rgba(18,45,69,0.06)',
                }}
              >
                <Icon size={14} style={{ color: 'var(--muted)' }} className="mb-2" />
                <p className="display text-xl font-bold tabular-nums" style={{ color: 'var(--ink)', letterSpacing: '-0.03em' }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.68)',
            boxShadow: '0 8px 40px rgba(18,45,69,0.09), inset 0 1px 0 rgba(255,255,255,0.55)',
          }}
        >
          {/* Spectral top strip */}
          <div className="h-[3px] w-full" style={{ background: spectral }} />

          <div className="p-5 sm:p-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: 'rgba(18,45,69,0.05)' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all"
                  style={tab === id
                    ? { background: 'var(--accent)', color: 'white', boxShadow: '0 2px 8px rgba(18,45,69,0.18)' }
                    : { color: 'var(--muted)' }
                  }
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
              >
                {tab === 'profile' && <ProfileView />}
                {tab === 'attest' && (
                  <div>
                    <h2 className="display text-base font-semibold mb-5" style={{ color: 'var(--ink)' }}>
                      Create attestation
                    </h2>
                    <AttestForm />
                  </div>
                )}
                {tab === 'inbox' && <InboxView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'var(--subtle)' }}>
          Deployed on Arc Testnet · USDC is the native gas token · Fully permissionless
        </p>
      </div>
    </div>
  )
}
