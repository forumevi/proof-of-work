import { useState } from 'react'
import { useReadContract } from 'wagmi'
import { Search, ExternalLink, Award, Briefcase, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { arcTestnet } from 'viem/chains'
import { formatUsdc } from '@/onchain-money'
import { buildAddressExplorerUrl } from '@/onchain-facts'

const CONTRACT_ADDRESS = '0x88dc2637d699cd2bcd22fc0a56e2fcb22d1e6084' as `0x${string}`
const CHAIN_ID = arcTestnet.id

const ABI = [
  {
    name: 'getAttestationsByFreelancer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'freelancer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getTotalEarnings',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'freelancer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAttestation',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'employer', type: 'address' },
      { name: 'freelancer', type: 'address' },
      { name: 'claimedUsdcAmount', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'completedAt', type: 'uint64' },
      { name: 'ipfsHash', type: 'string' },
    ],
  },
] as const

function fmt(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function AttestationCard({ tokenId }: { tokenId: bigint }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getAttestation',
    args: [tokenId],
    chainId: CHAIN_ID,
  })

  if (!data) return null

  const [employer, , claimedUsdcAmount, title, completedAt] = data
  const formatted = Number(formatUsdc(claimedUsdcAmount)).toFixed(2)
  const date = new Date(Number(completedAt) * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-xl bg-navy-900 bg-[#0f1b2d] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Award size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{title}</p>
        <p className="text-slate-500 text-xs mt-0.5">
          From{' '}
          <a
            href={buildAddressExplorerUrl(CHAIN_ID, employer)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 font-mono hover:underline"
          >
            {fmt(employer)}
          </a>
          {' · '}
          {date}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-emerald-600 tabular-nums">${formatted}</p>
        <p className="text-xs text-slate-400">USDC</p>
      </div>
    </motion.div>
  )
}

export function ProfileView() {
  const [input, setInput] = useState('')
  const [searched, setSearched] = useState('')

  const { data: tokenIds, isLoading: loadingIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getAttestationsByFreelancer',
    args: [searched as `0x${string}`],
    chainId: CHAIN_ID,
    query: { enabled: searched.length === 42 },
  })

  const { data: totalEarnings } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getTotalEarnings',
    args: [searched as `0x${string}`],
    chainId: CHAIN_ID,
    query: { enabled: searched.length === 42 },
  })

  const totalFormatted = totalEarnings != null ? Number(formatUsdc(totalEarnings)).toFixed(2) : '0.00'

  function handleSearch() {
    const trimmed = input.trim()
    if (trimmed.length === 42 && trimmed.startsWith('0x')) {
      setSearched(trimmed)
    }
  }

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="0x… freelancer address"
            className="w-full pl-9 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl text-sm font-mono placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b2d]/20 focus:border-[#0f1b2d]/30"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-3 bg-[#0f1b2d] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2d48] active:scale-95 transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {searched && searched.length === 42 && (
          <motion.div
            key={searched}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Profile card */}
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-1">Freelancer</p>
                  <a
                    href={buildAddressExplorerUrl(CHAIN_ID, searched)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-slate-800 hover:underline flex items-center gap-1"
                  >
                    {fmt(searched)}
                    <ExternalLink size={12} className="text-slate-400" />
                  </a>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-1">Total Claimed</p>
                  <p className="display text-2xl font-bold text-slate-900 tabular-nums">
                    ${totalFormatted}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <Briefcase size={13} className="text-slate-400" />
                <span className="text-xs text-slate-500">
                  {loadingIds ? '…' : (tokenIds?.length ?? 0)} accepted attestation{tokenIds?.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Attestation list */}
            {loadingIds ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : tokenIds && tokenIds.length > 0 ? (
              <div className="space-y-2">
                {[...tokenIds].reverse().map(id => (
                  <AttestationCard key={id.toString()} tokenId={id} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                No accepted attestations yet.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
