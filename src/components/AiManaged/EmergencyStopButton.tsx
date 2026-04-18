import { Octagon } from 'lucide-react';

export default function EmergencyStopButton({ onStop }: { onStop: () => void }) {
  return (
    <div
      className="
        fixed left-0 right-0 bottom-0 z-40 pointer-events-none pb-[env(safe-area-inset-bottom)]
        lg:left-auto lg:right-6 lg:bottom-6 lg:pb-0
      "
    >
      <div className="h-16 bg-gradient-to-t from-bg via-bg/80 to-transparent lg:hidden" />
      <div className="bg-bg pb-4 pt-2 pointer-events-auto lg:bg-transparent lg:p-0">
        <div className="max-w-md mx-auto px-4 lg:max-w-none lg:px-0">
          <button
            type="button"
            onClick={onStop}
            className="
              w-full lg:w-auto flex items-center justify-center gap-2
              py-4 lg:py-3 px-4 lg:px-5
              rounded-2xl lg:rounded-full
              bg-gradient-to-r from-rose-600 to-rose-500 text-white font-bold text-base lg:text-sm
              shadow-lg shadow-rose-600/30 ring-2 ring-rose-500/40
              hover:brightness-110 active:scale-[0.98] transition
            "
          >
            <Octagon className="w-5 h-5 lg:w-4 lg:h-4" />
            <span>หยุด AI ทันที</span>
          </button>
          <p className="text-[11px] text-text-muted text-center mt-1.5 lg:hidden">
            ทุกแคมเปญจะหยุดทันที — เปิดกลับใหม่เมื่อไหร่ก็ได้
          </p>
        </div>
      </div>
    </div>
  );
}
