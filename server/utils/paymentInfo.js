import User from '../models/User.js'

// Payment details configured by the administrator and shared with sellers so
// they know where to transfer their subscription fees. Prefers the admin that
// actually has payment fields set (most recently updated), falling back to any
// admin with empty fields.
export async function getAdminPaymentInfo() {
  const admin =
    (await User.findOne({
      role: 'ADMIN',
      $or: [
        { ccp: { $nin: ['', null] } },
        { ccpKey: { $nin: ['', null] } },
        { baridiMob: { $nin: ['', null] } },
      ],
    })
      .sort({ updatedAt: -1 })
      .lean()) ??
    (await User.findOne({ role: 'ADMIN' }).sort({ updatedAt: -1 }).lean())

  return {
    ccp: admin?.ccp || null,
    ccpKey: admin?.ccpKey || null,
    baridiMob: admin?.baridiMob || null,
  }
}