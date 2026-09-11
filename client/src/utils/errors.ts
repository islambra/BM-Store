import axios from 'axios'
import { getErrorMessage } from '../services/api'

const SERVER_ERROR_KEYS: Record<string, string> = {
  'An account with this phone number already exists': 'auth.errPhoneExists',
  'Invalid phone or password': 'auth.errInvalidCredentials',
  'Phone number and password are required': 'auth.errRequiredFields',
  'Full name, phone number and password are required': 'auth.errRequiredFields',
  'Name, phone number and password are required': 'auth.errRequiredFields',
  'A record with this value already exists': 'auth.errDuplicate',
  'Password must be at least 8 characters': 'auth.passwordMin',
  'Session expired, please log in again': 'auth.sessionExpired',
}

export function localizeError(err: unknown, t: (key: string) => string): string {
  if (axios.isAxiosError(err) && !err.response) {
    return t('auth.errNetwork')
  }
  const raw = getErrorMessage(err)
  const key = SERVER_ERROR_KEYS[raw]
  return key ? t(key) : raw
}