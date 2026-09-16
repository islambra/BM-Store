import { useState } from 'react'
import { Gift, Save } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAsync } from '../../hooks/useAsync'
import * as api from '../../services/api'
import { getErrorMessage } from '../../services/api'
import { Badge, ErrorNote, Loader, Table } from './adminShared'

function parsePct(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null
  const n = Number(value.trim())
  if (!Number.isInteger(n) || n < 0 || n > 100) return null
  return n
}

export default function RewardsSection() {
  const { t } = useLanguage()
  const { data, loading, error, reload } = useAsync(() => api.getAdminRewards())
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { on: boolean; normal: string; special: string }>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const refresh = () => {
    setDrafts({})
    void reload()
  }

  const toggleSystem = async () => {
    if (enabled === null || !data) return
    setBusyKey('__system__')
    setNotice('')
    try {
      await api.updateRewardSettings({ rewardSystemEnabled: !enabled })
      setEnabled(null)
      refresh()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusyKey(null)
    }
  }

  const saveCategory = async (cat: api.RewardCategoryRecord) => {
    const d = drafts[String(cat._id)]
    if (!d) return
    const normal = parsePct(d.normal)
    const special = parsePct(d.special)
    if (normal === null || special === null) {
      setNotice(t('admin.rewards.invalidPercent'))
      return
    }
    setBusyKey(String(cat._id))
    setNotice('')
    try {
      await api.updateCategoryReward(String(cat._id), {
        rewardEnabled: d.on,
        rewardNormalPercent: normal,
        rewardSpecialPercent: special,
      })
      refresh()
    } catch (err) {
      setNotice(getErrorMessage(err))
    } finally {
      setBusyKey(null)
    }
  }

  const setDraft = (id: string, patch: Partial<{ on: boolean; normal: string; special: string }>) => {
    setDrafts((m) => ({ ...m, [id]: { ...(m[id] ?? { on: false, normal: '0', special: '0' }), ...patch } }))
  }

  if (loading) return <Loader />
  if (error) return <ErrorNote message={error} />

  const systemOn = enabled ?? data!.settings.rewardSystemEnabled

  return (
    <div className="space-y-5">
      {notice && <ErrorNote message={notice} />}

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Gift size={20} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-ink-900">{t('admin.rewards.systemTitle')}</h3>
              <p className="text-xs text-ink-500">
                {data!.settings.rewardSystemEnabled ? t('admin.rewards.systemOn') : t('admin.rewards.systemOff')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void toggleSystem()}
            disabled={busyKey === '__system__'}
            className={systemOn ? 'btn-ghost text-red-700' : 'btn-primary'}
          >
            {busyKey === '__system__'
              ? t('common.saving')
              : systemOn
                ? t('admin.rewards.disableSystem')
                : t('admin.rewards.enableSystem')}
          </button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-500">{t('admin.rewards.systemDesc')}</p>

      <Table headers={[t('admin.rewards.category'), t('admin.rewards.enabled'), t('admin.rewards.normalPercent'), t('admin.rewards.specialPercent')]}>
        {(data?.categories ?? []).map((c) => {
          const d = drafts[String(c._id)]
          const on = d?.on ?? c.rewardEnabled
          const normal = d?.normal ?? String(c.rewardNormalPercent ?? 0)
          const special = d?.special ?? String(c.rewardSpecialPercent ?? 0)
          const dirty = Boolean(d)
          const busy = busyKey === String(c._id)
          return (
            <tr key={String(c._id)} className="hover:bg-canvas">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-900/5 text-xs font-bold text-ink-700">
                    {c.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">{c.nameAr ?? c.name}</p>
                    <p className="text-xs text-ink-400">{c.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setDraft(String(c._id), { on: !on })}
                  aria-pressed={on}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${on ? 'bg-brand-600' : 'bg-ink-900/15'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${on ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </span>
                  <Badge tone={on ? 'ok' : 'muted'}>{on ? t('common.yes') : t('common.no')}</Badge>
                </button>
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={normal}
                  onChange={(e) => setDraft(String(c._id), { normal: e.target.value })}
                  className="input w-20"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={special}
                  onChange={(e) => setDraft(String(c._id), { special: e.target.value })}
                  className="input w-20"
                />
              </td>
              <td className="px-4 py-3 text-end">
                <button
                  type="button"
                  onClick={() => void saveCategory(c)}
                  disabled={!dirty || busy}
                  className="btn-primary"
                >
                  {busy ? t('common.saving') : <Save size={15} className="inline-block" />}
                </button>
              </td>
            </tr>
          )
        })}
      </Table>
    </div>
  )
}