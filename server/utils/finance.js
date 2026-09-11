import Commission from '../models/Commission.js'

const bucket = (commissions) => {
  const out = {
    pendingEarnings: 0,
    availableBalance: 0,
    payoutRequested: 0,
    paymentSent: 0,
    totalPaid: 0,
    disputed: 0,
    cancelled: 0,
    totalEarnings: 0,
  }
  for (const c of commissions) {
    const amount = Math.round((c.amount || 0) * 100) / 100
    switch (c.status) {
      case 'PENDING':
        out.pendingEarnings += amount
        break
      case 'AVAILABLE':
        out.availableBalance += amount
        break
      case 'PAYOUT_REQUESTED':
        out.payoutRequested += amount
        break
      case 'PAYMENT_SENT':
        out.paymentSent += amount
        break
      case 'RECEIVED':
        out.totalPaid += amount
        break
      case 'DISPUTED':
        out.disputed += amount
        break
      case 'CANCELLED':
        out.cancelled += amount
        break
      default:
        break
    }
    if (c.status !== 'CANCELLED') out.totalEarnings += amount
  }
  for (const key of Object.keys(out)) out[key] = Math.round(out[key] * 100) / 100
  return out
}

export async function commissionBuckets(marketerId) {
  const commissions = await Commission.find({ marketer: marketerId })
    .select('amount status')
    .lean()
  return bucket(commissions)
}

export function bucketCommissions(commissions) {
  return bucket(commissions)
}