import { Heart, X } from 'lucide-react'
import donationQr from '../../assets/lrecodex-donation-qr-focused.png'

export default function DonationDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div
      className="text-select fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="donation-title" className="w-[360px] max-w-full overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
        <header className="flex items-center justify-between border-b border-(--color-border) px-5 py-4">
          <div className="flex items-center gap-2">
            <Heart size={18} className="fill-pink-500 text-pink-500" />
            <h2 id="donation-title" className="text-base font-semibold">Support LRecodex</h2>
          </div>
          <button type="button" aria-label="Close donation" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)">
            <X size={15} />
          </button>
        </header>
        <div className="px-5 py-5 text-center">
          <p className="text-sm text-(--color-text-muted)">
            Enjoying MD Tools? Scan with MAE to support LRecodex.
          </p>
          <div className="mx-auto mt-4 w-64 rounded-xl border border-white/80 bg-white p-3 shadow-lg shadow-black/20">
            <img src={donationQr} alt="Maybank QR code for donating to LRecodex" className="block w-full rounded-md" />
          </div>
          <p className="mt-3 text-xs text-(--color-text-muted)">Thank you for helping keep the app improving.</p>
        </div>
      </section>
    </div>
  )
}
