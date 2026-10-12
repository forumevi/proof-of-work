import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { CheckCircle, XCircle, Loader2, Inbox } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { arcTestnet } from 'viem/chains'
import { formatUsdc } from '@/onchain-money'
import { buildAddressExplorerUrl } from '@/onchain-facts'

const CONTRACT_ADDRESS = '0x88dc2637d699cd2bcd22fc0a56e2fcb22d1e6084' as `0x${string}`
const CHAIN_ID = arcTestnet.id

const ABI = [
  {
    name: 'getPendingAttestationsByFreelancer',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'freelancer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
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
  {
    name: 'acceptAttestation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'rejectAttestation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
] as const

function fmt(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function PendingCard({ tokenId, onAction }: { tokenId: bigint; onAction: () => void }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getAttestation',
    args: [tokenId],
    chainId: CHAIN_ID,
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess) {
    onAction()
    return null
  }

  if (!data) return <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />

  const [employer, , claimedUsdcAmount, title, completedAt] = data
  const formatted = Number(formatUsdc(claimedUsdcAmount)).toFixed(2)
  const date = new Date(Number(completedAt) * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  function handleAccept() {
    writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'acceptAttestation', args: [tokenId], chainId: CHAIN_ID })
  }
  function handleReject() {
    writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'rejectAttestation', args: [tokenId], chainId: CHAIN_ID })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="bg-white/70 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-4"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            From{' '}
            <a
              href={buildAddressExplorerUrl(CHAIN_ID, employer)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-700 font-mono hover:underline"
            >
              {fmt(employer)}
            </a>
            {' · '}{date}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-semibold text-emerald-600 tabular-nums">${formatted}</p>
          <p className="text-xs text-slate-400">USDC</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0f1b2d] text-white text-xs font-semibold rounded-xl hover:bg-[#1a2d48] active:scale-[0.97] transition-all disabled:opacity-60"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          Accept
        </button>
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 active:scale-[0.97] transition-all disabled:opacity-60"
        >
          {isPending ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
          Reject
        </button>
      </div>
    </motion.div>
  )
}

export function InboxView() {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const isWrongChain = isConnected && walletChainId !== CHAIN_ID

  const { data: pendingIds, isLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getPendingAttestationsByFreelancer',
    args: [address as `0x${string}`],
    chainId: CHAIN_ID,
    query: { enabled: !!address },
  })

  if (!isConnected) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
          <Inbox size={22} className="text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">Connect your wallet to see pending attestations.</p>
        <ConnectKitButton />
      </div>
    )
  }

  if (isWrongChain) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-slate-500">Switch to Arc Testnet to view your inbox.</p>
        <button
          onClick={() => switchChain({ chainId: CHAIN_ID })}
          className="px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 active:scale-[0.97] transition-all"
        >
          Switch to Arc Testnet
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
        {isLoading ? '…' : (pendingIds?.length ?? 0)} pending
      </p>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : pendingIds && pendingIds.length > 0 ? (
        <AnimatePresence>
          {[...pendingIds].map(id => (
            <PendingCard key={id.toString()} tokenId={id} onAction={() => { void refetch() }} />
          ))}
        </AnimatePresence>
      ) : (
        <div className="text-center py-10 space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <Inbox size={22} className="text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">No pending attestations.</p>
        </div>
      )}
    </div>
  )
}
