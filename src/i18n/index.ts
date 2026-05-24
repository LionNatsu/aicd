import { createI18n } from 'vue-i18n'
import itemZhHans from './zh-Hans/item.json'
import facilityZhHans from './zh-Hans/facility.json'

const messages = {
  'zh-Hans': {
    item: itemZhHans,
    facility: facilityZhHans,
  },
}

const i18n = createI18n({
  legacy: false,
  locale: 'zh-Hans',
  fallbackLocale: 'zh-Hans',
  messages,
})

export default i18n
