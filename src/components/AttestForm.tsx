import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { arcTestnet } from 'viem/chains'
import { toast } from 'sonner'
import { parseAmount } from '@/onchain-money'
import { buildTxExplorerUrl } from '@/onchain-facts'

const CONTRACT_ADDRESS = '0x88dc2637d699cd2bcd22fc0a56e2fcb22d1e6084' as `0x${string}`
const CHAIN_ID = arcTestnet.id

const ABI = [
  {
    name: 'attest',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'freelancer', type: 'address' },
      { name: 'claimedUsdcAmount', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'ipfsHash', type: 'string' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
] as const

export function AttestForm() {
  const { address, chainId: walletChainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const { writeContract, data: hash, isPending, isError, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [freelancer, setFreelancer] = useState('')
  const [usdcAmount, setUsdcAmount] = useState('')
  const [title, setTitle] = useState('')
  const [ipfsHash, setIpfsHash] = useState('')

  const isWrongChain = isConnected && walletChainId !== CHAIN_ID

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isWrongChain) {
      switchChain({ chainId: CHAIN_ID })
      return
    }

    const fl = freelancer.trim() as `0x${string}`
    if (!fl || fl.length !== 42) {
      toast.error('Enter a valid freelancer address.')
      return
    }
    if (fl.toLowerCase() === address?.toLowerCase()) {
      toast.error('You cannot attest yourself.')
      return
    }
    const parsed = parseFloat(usdcAmount)
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid USDC amount.')
      return
    }
    const t = title.trim()
    if (!t || t.length > 100) {
      toast.error('Title must be 1–100 characters.')
      return
    }

    const amount = parseAmount(CHAIN_ID, usdcAmount)

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'attest',
      args: [fl, amount.raw, t, ipfsHash.trim()],
      chainId: CHAIN_ID,
    })
  }

  if (isSuccess && hash) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
          <CheckCircle size={24} className="text-emerald-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Attestation sent</p>
          <p className="text-sm text-slate-500 mt-1">Waiting for the freelancer to accept.</p>
        </div>
        <a
          href={buildTxExplorerUrl(CHAIN_ID, hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#0f1b2d] hover:underline font-medium"
        >
          View on explorer
        </a>
        <div>
          <button
            onClick={() => { reset(); setFreelancer(''); setUsdcAmount(''); setTitle(''); setIpfsHash('') }}
            className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            Create another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Freelancer Address</label>
        <input
          type="text"
          value={freelancer}
          onChange={e => setFreelancer(e.target.value)}
          placeholder="0x…"
          required
          className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl text-sm font-mono placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b2d]/20 focus:border-[#0f1b2d]/30"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Amount Claimed (USDC)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input
            type="number"
            value={usdcAmount}
            onChange={e => setUsdcAmount(e.target.value)}
            placeholder="0.00"
            min="0.000001"
            step="any"
            required
            className="w-full pl-8 pr-16 py-3 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl text-sm tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b2d]/20 focus:border-[#0f1b2d]/30"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">USDC</span>
        </div>
        <p className="text-xs text-slate-400">Employer-asserted claim — not verified on-chain.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">Job Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Smart contract development, Q3 2026"
          maxLength={100}
          required
          className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b2d]/20 focus:border-[#0f1b2d]/30"
        />
        <p className="text-xs text-slate-400 text-right tabular-nums">{title.length}/100</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-widest">IPFS Hash <span className="normal-case font-normal text-slate-400">(optional)</span></label>
        <input
          type="text"
          value={ipfsHash}
          onChange={e => setIpfsHash(e.target.value)}
          placeholder="Qm… or bafy…"
          className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-slate-200 rounded-xl text-sm font-mono placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f1b2d]/20 focus:border-[#0f1b2d]/30"
        />
      </div>

      {isError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error?.message?.includes('user rejected') ? 'Transaction cancelled.' : 'Transaction failed. Please try again.'}</p>
        </div>
      )}

      {!isConnected ? (
        <div className="flex justify-center pt-2">
          <ConnectKitButton label="Connect to Attest" />
        </div>
      ) : isWrongChain ? (
        <button
          type="submit"
          className="w-full py-3.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 active:scale-[0.98] transition-all text-sm"
        >
          Switch to Arc Testnet
        </button>
      ) : (
        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="w-full py-3.5 bg-[#0f1b2d] text-white font-semibold rounded-xl hover:bg-[#1a2d48] active:scale-[0.98] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Confirm in wallet…</>
          ) : isConfirming ? (
            <><Loader2 size={16} className="animate-spin" /> Confirming…</>
          ) : (
            'Send Attestation'
          )}
        </button>
      )}
    </form>
  )
}
