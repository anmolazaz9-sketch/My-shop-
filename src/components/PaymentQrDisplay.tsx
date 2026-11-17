import { SmartImage } from './SmartImage';

interface PaymentQrDisplayProps {
  qrUrl?: string;
  upiId: string;
  storeName: string;
  amount?: number;
}

export function PaymentQrDisplay({ qrUrl, upiId, storeName, amount }: PaymentQrDisplayProps) {
  if (qrUrl) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-[#EFE4F7] bg-white p-4">
        <SmartImage
          src={qrUrl}
          alt={`${storeName} UPI Payment QR Code`}
          className="w-44 h-44 object-contain rounded-lg"
        />
        <p className="mt-2 text-xs font-medium text-[#581C87] font-mono-num">
          UPI ID: {upiId || '8081465761@upi'}
        </p>
        {amount !== undefined && (
          <p className="mt-1 text-xs text-[#645473]">
            Scan &amp; pay ₹{amount.toLocaleString('en-IN')} using GPay, PhonePe, or Paytm
          </p>
        )}
      </div>
    );
  }

  // Deterministic crisp SVG QR visual fallback when admin has not uploaded a photo yet
  const gridSize = 15;
  const seed = (upiId + storeName).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const cells: boolean[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < gridSize; c++) {
      const inTopLeft = r < 5 && c < 5;
      const inTopRight = r < 5 && c >= gridSize - 5;
      const inBottomLeft = r >= gridSize - 5 && c < 5;
      if (inTopLeft || inTopRight || inBottomLeft) {
        const lr = r < 5 ? r : r - (gridSize - 5);
        const lc = c < 5 ? c : c - (gridSize - 5);
        const isBorder = lr === 0 || lr === 4 || lc === 0 || lc === 4;
        const isCenter = lr === 2 && lc === 2;
        row.push(isBorder || isCenter);
      } else {
        row.push(((r * 17 + c * 31 + seed) % 3) === 0);
      }
    }
    cells.push(row);
  }

  return (
    <div className="flex flex-col items-center rounded-xl border border-[#EFE4F7] bg-white p-4">
      <svg
        viewBox={`0 0 ${gridSize} ${gridSize}`}
        className="w-40 h-40 p-2 bg-white border border-[#EFE4F7] rounded-lg"
        aria-label={`UPI QR Code for ${upiId}`}
      >
        {cells.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={0.92}
                height={0.92}
                rx={0.1}
                fill="#1E1428"
              />
            ) : null
          )
        )}
      </svg>
      <p className="mt-2.5 text-xs font-semibold text-[#581C87] font-mono-num">
        UPI ID: {upiId || '8081465761@upi'}
      </p>
      {amount !== undefined && (
        <p className="mt-1 text-xs text-[#645473]">
          Pay ₹{amount.toLocaleString('en-IN')} via any UPI app and enter UTR below
        </p>
      )}
    </div>
  );
}
