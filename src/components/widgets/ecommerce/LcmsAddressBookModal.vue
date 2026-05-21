<script setup lang="ts">
/**
 * Address Book Modal (E-commerce)
 *
 * Reusable full-CRUD modal over /customers/me/addresses. Used by:
 *  - LcmsCheckout: pick mode (emit('select') + close)
 *  - LcmsCustomerAccount: manage mode (no select emit, just CRUD)
 *
 * Two internal views: 'list' and 'form'. Empty list shows a CTA to add the
 * first address — the user is never told "you can't manage anything" from
 * outside, the modal owns the entire flow.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useStorefront } from '../../../composables/useStorefront'
import { useCustomer } from '../../../composables/useCustomer'
import { useToast } from '../../../composables/useToast'
import type { StorefrontAddress } from '../../../api/storefront'
import LcmsCountrySelect from '../../common/LcmsCountrySelect.vue'

interface Props {
  isOpen: boolean
  language?: string
  // 'pick' shows a primary "Use this address" button on each row.
  // 'manage' hides it — used from the account page where the modal IS the page.
  mode?: 'pick' | 'manage'
  selectedUuid?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  language: 'pl',
  mode: 'pick',
  selectedUuid: null,
})

const emit = defineEmits<{
  (e: 'update:isOpen', v: boolean): void
  (e: 'select', addr: StorefrontAddress): void
}>()

const { client } = useStorefront()
const customer = useCustomer()
const toast = useToast()

const t = (key: string): string => {
  const dict: Record<string, Record<string, string>> = {
    pl: {
      title: 'Książka adresowa',
      noAddresses: 'Książka adresowa jest pusta',
      noAddressesHint: 'Dodaj pierwszy adres, żeby móc szybko wybrać go przy kolejnych zamówieniach.',
      addAddress: 'Dodaj adres',
      addFirst: 'Dodaj pierwszy adres',
      newAddress: 'Nowy adres',
      editAddress: 'Edycja adresu',
      use: 'Użyj tego adresu',
      edit: 'Edytuj',
      delete: 'Usuń',
      setAsDefault: 'Ustaw jako domyślny',
      defaultBadge: 'Domyślny',
      label: 'Etykieta (np. „Dom", „Biuro")',
      street: 'Ulica i numer',
      postalCode: 'Kod pocztowy',
      city: 'Miasto',
      country: 'Kraj',
      phone: 'Telefon',
      isDefault: 'Ustaw jako domyślny',
      back: 'Wstecz',
      cancel: 'Anuluj',
      save: 'Zapisz',
      saving: 'Zapisuję…',
      saved: 'Zapisano',
      saveError: 'Nie udało się zapisać',
      confirmDelete: 'Usunąć ten adres na stałe?',
      requiredField: 'To pole jest wymagane',
      invalidPostalCode: 'Nieprawidłowy kod pocztowy (00-000)',
      close: 'Zamknij',
    },
    en: {
      title: 'Address book',
      noAddresses: 'Your address book is empty',
      noAddressesHint: 'Add your first address to reuse it on future orders.',
      addAddress: 'Add address',
      addFirst: 'Add first address',
      newAddress: 'New address',
      editAddress: 'Edit address',
      use: 'Use this address',
      edit: 'Edit',
      delete: 'Delete',
      setAsDefault: 'Set as default',
      defaultBadge: 'Default',
      label: 'Label (e.g. "Home", "Office")',
      street: 'Street and number',
      postalCode: 'Postal code',
      city: 'City',
      country: 'Country',
      phone: 'Phone',
      isDefault: 'Set as default',
      back: 'Back',
      cancel: 'Cancel',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Saved',
      saveError: 'Could not save',
      confirmDelete: 'Delete this address permanently?',
      requiredField: 'This field is required',
      invalidPostalCode: 'Invalid postal code',
      close: 'Close',
    },
  }
  const lang = props.language === 'en' ? 'en' : 'pl'
  return dict[lang]?.[key] || dict.pl[key] || key
}

type View = 'list' | 'form'
const view = ref<View>('list')

// Per-card expansion: stores UUIDs of currently expanded cards.
// Collapsed = compact summary + primary "Use this address" button only;
// the edit/delete actions live behind a chevron to keep the list scannable.
const expandedUuids = ref<Set<string>>(new Set())
function toggleExpanded(addr: StorefrontAddress) {
  if (!addr.uuid) return
  if (expandedUuids.value.has(addr.uuid)) {
    expandedUuids.value.delete(addr.uuid)
  } else {
    expandedUuids.value.add(addr.uuid)
  }
  // Trigger reactivity — Set mutation alone doesn't.
  expandedUuids.value = new Set(expandedUuids.value)
}
function isExpanded(addr: StorefrontAddress): boolean {
  return !!(addr.uuid && expandedUuids.value.has(addr.uuid))
}

type FormState = {
  uuid: string | null
  name: string
  street: string
  city: string
  postal_code: string
  country: string
  phone: string
  is_default: boolean
}

const emptyForm = (): FormState => ({
  uuid: null,
  name: '',
  street: '',
  city: '',
  postal_code: '',
  country: 'PL',
  phone: '',
  is_default: false,
})

const form = ref<FormState>(emptyForm())
const errors = ref<Record<string, string>>({})
const isSaving = ref(false)
const isLoadingList = ref(false)
const deletingUuid = ref<string | null>(null)

const addresses = computed<StorefrontAddress[]>(() => customer.customer.value?.addresses || [])
const defaultAddress = computed<StorefrontAddress | null>(() => customer.customer.value?.default_address || null)

function isDefault(addr: StorefrontAddress): boolean {
  if (!defaultAddress.value) return false
  if (addr.uuid && defaultAddress.value.uuid) return addr.uuid === defaultAddress.value.uuid
  return defaultAddress.value.street === addr.street
    && defaultAddress.value.postal_code === addr.postal_code
    && defaultAddress.value.city === addr.city
}

async function refresh() {
  isLoadingList.value = true
  try {
    await customer.refreshProfile()
  } catch {
    /* silent — list just stays empty */
  } finally {
    isLoadingList.value = false
  }
}

// Refresh whenever the modal becomes visible so a parent that mounts it
// permanently doesn't show stale data after the user comes back from
// somewhere else.
watch(() => props.isOpen, (open) => {
  if (open) {
    view.value = 'list'
    if (customer.isAuthenticated.value) refresh()
  }
})

onMounted(() => {
  if (props.isOpen && customer.isAuthenticated.value) refresh()
})

function close() {
  emit('update:isOpen', false)
}

function openAdd() {
  form.value = emptyForm()
  errors.value = {}
  view.value = 'form'
}

function openEdit(addr: StorefrontAddress) {
  form.value = {
    uuid: addr.uuid ?? null,
    name: addr.name ?? '',
    street: addr.street ?? '',
    city: addr.city ?? '',
    postal_code: addr.postal_code ?? '',
    country: addr.country ?? 'PL',
    phone: addr.phone ?? '',
    is_default: isDefault(addr),
  }
  errors.value = {}
  view.value = 'form'
}

function backToList() {
  view.value = 'list'
  errors.value = {}
}

function validate(): boolean {
  const e: Record<string, string> = {}
  if (!form.value.street.trim()) e.street = t('requiredField')
  if (!form.value.city.trim()) e.city = t('requiredField')
  if (!form.value.postal_code.trim()) e.postal_code = t('requiredField')
  else if (form.value.country === 'PL' && !/^\d{2}-\d{3}$/.test(form.value.postal_code)) {
    e.postal_code = t('invalidPostalCode')
  }
  errors.value = e
  return Object.keys(e).length === 0
}

async function save() {
  if (!client.value) return
  if (!validate()) return
  isSaving.value = true
  try {
    const { uuid, ...payload } = form.value
    if (uuid) {
      await client.value.updateAddress(uuid, payload as unknown as StorefrontAddress)
    } else {
      await client.value.addAddress(payload as unknown as StorefrontAddress)
    }
    await refresh()
    toast.success(t('saved'))
    backToList()
  } catch (err: any) {
    toast.error(err?.message || t('saveError'))
  } finally {
    isSaving.value = false
  }
}

async function remove(addr: StorefrontAddress) {
  if (!client.value || !addr.uuid) return
  if (typeof window !== 'undefined' && !window.confirm(t('confirmDelete'))) return
  deletingUuid.value = addr.uuid
  try {
    await client.value.deleteAddress(addr.uuid)
    await refresh()
    toast.success(t('saved'))
  } catch (err: any) {
    toast.error(err?.message || t('saveError'))
  } finally {
    deletingUuid.value = null
  }
}

async function setDefault(addr: StorefrontAddress) {
  if (!client.value || !addr.uuid) return
  try {
    await client.value.updateAddress(addr.uuid, { is_default: true } as unknown as Partial<StorefrontAddress>)
    await refresh()
  } catch (err: any) {
    toast.error(err?.message || t('saveError'))
  }
}

function pick(addr: StorefrontAddress) {
  emit('select', addr)
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="lcms-address-book"
      @click.self="close"
    >
      <div class="lcms-address-book__panel">
        <header class="lcms-address-book__header">
          <button
            v-if="view === 'form'"
            type="button"
            class="lcms-address-book__icon-btn"
            :aria-label="t('back')"
            @click="backToList"
          >
            ←
          </button>
          <h3 class="lcms-address-book__title">
            {{ view === 'form' ? (form.uuid ? t('editAddress') : t('newAddress')) : t('title') }}
          </h3>
          <button
            type="button"
            class="lcms-address-book__icon-btn"
            :aria-label="t('close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <div class="lcms-address-book__body">
          <!-- LIST VIEW -->
          <template v-if="view === 'list'">
            <div v-if="isLoadingList && addresses.length === 0" class="lcms-address-book__loading">
              …
            </div>

            <div v-else-if="addresses.length === 0" class="lcms-address-book__empty">
              <i class="bx bx-book-content lcms-address-book__empty-icon" aria-hidden="true" />
              <h4 class="lcms-address-book__empty-title">{{ t('noAddresses') }}</h4>
              <p class="lcms-address-book__empty-hint">{{ t('noAddressesHint') }}</p>
              <button
                type="button"
                class="lcms-address-book__btn lcms-address-book__btn--primary"
                @click="openAdd"
              >
                + {{ t('addFirst') }}
              </button>
            </div>

            <div v-else class="lcms-address-book__list">
              <div
                v-for="(addr, idx) in addresses"
                :key="addr.uuid || idx"
                class="lcms-address-book__card"
                :class="{
                  'lcms-address-book__card--selected': addr.uuid && addr.uuid === selectedUuid,
                  'lcms-address-book__card--expanded': isExpanded(addr),
                }"
              >
                <!-- Top row: badge + label + expand chevron + (when expanded) edit/delete icons -->
                <div class="lcms-address-book__card-top">
                  <div class="lcms-address-book__card-heading">
                    <span v-if="isDefault(addr)" class="lcms-address-book__badge">
                      {{ t('defaultBadge') }}
                    </span>
                    <span v-if="addr.name" class="lcms-address-book__card-name">{{ addr.name }}</span>
                  </div>
                  <div class="lcms-address-book__card-tools">
                    <template v-if="isExpanded(addr)">
                      <button
                        type="button"
                        class="lcms-address-book__icon-btn lcms-address-book__icon-btn--sm"
                        :title="t('edit')"
                        :aria-label="t('edit')"
                        @click.stop="openEdit(addr)"
                      >
                        <i class="bx bx-pencil" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        class="lcms-address-book__icon-btn lcms-address-book__icon-btn--sm lcms-address-book__icon-btn--danger"
                        :title="t('delete')"
                        :aria-label="t('delete')"
                        :disabled="deletingUuid === addr.uuid"
                        @click.stop="remove(addr)"
                      >
                        <i class="bx bx-trash" aria-hidden="true" />
                      </button>
                    </template>
                    <button
                      type="button"
                      class="lcms-address-book__icon-btn lcms-address-book__icon-btn--sm"
                      :title="isExpanded(addr) ? t('back') : (props.language === 'en' ? 'Show more' : 'Pokaż więcej')"
                      :aria-expanded="isExpanded(addr)"
                      @click.stop="toggleExpanded(addr)"
                    >
                      <i class="bx" :class="isExpanded(addr) ? 'bx-chevron-up' : 'bx-chevron-down'" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <!-- Address summary — single compact line when collapsed, full block when expanded -->
                <div v-if="!isExpanded(addr)" class="lcms-address-book__card-summary">
                  {{ addr.street }} · {{ addr.postal_code }} {{ addr.city }}
                </div>
                <div v-else class="lcms-address-book__card-details">
                  <div>{{ addr.street }}</div>
                  <div>{{ addr.postal_code }} {{ addr.city }}</div>
                  <div class="lcms-address-book__card-country">{{ addr.country }}</div>
                  <div v-if="addr.phone" class="lcms-address-book__card-phone">{{ addr.phone }}</div>
                  <button
                    v-if="!isDefault(addr) && addr.uuid"
                    type="button"
                    class="lcms-address-book__textlink"
                    @click.stop="setDefault(addr)"
                  >
                    {{ t('setAsDefault') }}
                  </button>
                </div>

                <!-- Primary action — always visible -->
                <button
                  v-if="mode === 'pick'"
                  type="button"
                  class="lcms-address-book__btn lcms-address-book__btn--primary lcms-address-book__use-btn"
                  @click="pick(addr)"
                >
                  {{ t('use') }}
                </button>
              </div>
            </div>
          </template>

          <!-- FORM VIEW -->
          <template v-else>
            <div class="lcms-address-book__field">
              <label class="lcms-address-book__label">{{ t('label') }}</label>
              <input v-model="form.name" type="text" class="lcms-address-book__input" />
            </div>

            <div class="lcms-address-book__field">
              <label class="lcms-address-book__label">{{ t('street') }} *</label>
              <input
                v-model="form.street"
                type="text"
                class="lcms-address-book__input"
                :class="{ 'lcms-address-book__input--error': errors.street }"
              />
              <span v-if="errors.street" class="lcms-address-book__error">{{ errors.street }}</span>
            </div>

            <div class="lcms-address-book__row">
              <div class="lcms-address-book__field">
                <label class="lcms-address-book__label">{{ t('postalCode') }} *</label>
                <input
                  v-model="form.postal_code"
                  type="text"
                  placeholder="00-000"
                  class="lcms-address-book__input"
                  :class="{ 'lcms-address-book__input--error': errors.postal_code }"
                />
                <span v-if="errors.postal_code" class="lcms-address-book__error">{{ errors.postal_code }}</span>
              </div>
              <div class="lcms-address-book__field">
                <label class="lcms-address-book__label">{{ t('city') }} *</label>
                <input
                  v-model="form.city"
                  type="text"
                  class="lcms-address-book__input"
                  :class="{ 'lcms-address-book__input--error': errors.city }"
                />
                <span v-if="errors.city" class="lcms-address-book__error">{{ errors.city }}</span>
              </div>
            </div>

            <div class="lcms-address-book__field">
              <label class="lcms-address-book__label">{{ t('country') }} *</label>
              <LcmsCountrySelect
                v-model="form.country"
                :language="props.language"
              />
            </div>

            <div class="lcms-address-book__field">
              <label class="lcms-address-book__label">{{ t('phone') }}</label>
              <input v-model="form.phone" type="tel" class="lcms-address-book__input" />
            </div>

            <label class="lcms-address-book__checkbox">
              <input v-model="form.is_default" type="checkbox" />
              <span>{{ t('isDefault') }}</span>
            </label>
          </template>
        </div>

        <footer v-if="view === 'list' && addresses.length > 0" class="lcms-address-book__footer">
          <button
            type="button"
            class="lcms-address-book__btn lcms-address-book__btn--ghost"
            @click="close"
          >
            {{ t('close') }}
          </button>
          <button
            type="button"
            class="lcms-address-book__btn lcms-address-book__btn--primary"
            @click="openAdd"
          >
            + {{ t('addAddress') }}
          </button>
        </footer>

        <footer v-else-if="view === 'form'" class="lcms-address-book__footer">
          <button
            type="button"
            class="lcms-address-book__btn lcms-address-book__btn--ghost"
            :disabled="isSaving"
            @click="backToList"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="button"
            class="lcms-address-book__btn lcms-address-book__btn--primary"
            :disabled="isSaving"
            @click="save"
          >
            {{ isSaving ? t('saving') : t('save') }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lcms-address-book {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 1rem;
}

.lcms-address-book__panel {
  background: var(--lcms-color-background, #fff);
  color: var(--lcms-color-text, #1f2937);
  border-radius: 0.75rem;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
  font-family: var(--lcms-font-body, system-ui, sans-serif);
}

.lcms-address-book__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--lcms-color-border, #e5e7eb);
}

.lcms-address-book__title {
  flex: 1;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.lcms-address-book__icon-btn {
  font: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-address-book__icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--lcms-color-text, #1f2937);
}

.lcms-address-book__body {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.lcms-address-book__loading {
  text-align: center;
  color: var(--lcms-color-muted, #6b7280);
}

/* Empty state */
.lcms-address-book__empty {
  text-align: center;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.lcms-address-book__empty-icon {
  font-size: 3rem;
  color: var(--lcms-color-muted, #9ca3af);
  line-height: 1;
}

.lcms-address-book__empty-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin: 0;
}

.lcms-address-book__empty-hint {
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.875rem;
  margin: 0 0 0.5rem;
  max-width: 360px;
}

/* List + card */
.lcms-address-book__list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.lcms-address-book__card {
  position: relative;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--lcms-color-border, #e5e7eb);
  border-radius: 0.625rem;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.lcms-address-book__card--selected {
  border-color: var(--lcms-color-primary, #3b82f6);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 18%, transparent);
}

.lcms-address-book__card-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lcms-address-book__card-heading {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lcms-address-book__card-name {
  font-weight: 600;
  font-size: 0.9375rem;
}

.lcms-address-book__card-tools {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}

.lcms-address-book__icon-btn--sm {
  width: 28px;
  height: 28px;
  font-size: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lcms-address-book__icon-btn--danger {
  color: rgb(220, 38, 38);
}

.lcms-address-book__icon-btn--danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.08);
  color: rgb(220, 38, 38);
}

.lcms-address-book__card-summary {
  font-size: 0.875rem;
  color: var(--lcms-color-muted, #6b7280);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lcms-address-book__card-details {
  font-size: 0.9375rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.lcms-address-book__card-country {
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.8125rem;
}

.lcms-address-book__card-phone {
  color: var(--lcms-color-muted, #6b7280);
  font-size: 0.8125rem;
}

.lcms-address-book__textlink {
  align-self: flex-start;
  margin-top: 0.25rem;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 0.8125rem;
  color: var(--lcms-color-primary, #3b82f6);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.lcms-address-book__textlink:hover {
  filter: brightness(0.85);
}

.lcms-address-book__badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: var(--lcms-color-primary, #3b82f6);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.lcms-address-book__use-btn {
  align-self: flex-end;
}

/* Form */
.lcms-address-book__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .lcms-address-book__row {
    grid-template-columns: 1fr;
  }
}

.lcms-address-book__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lcms-address-book__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--lcms-color-muted, #6b7280);
}

.lcms-address-book__input {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--lcms-color-border, #d1d5db);
  border-radius: 0.5rem;
  background: var(--lcms-color-background, #fff);
  color: inherit;
}

.lcms-address-book__input:focus {
  outline: none;
  border-color: var(--lcms-color-primary, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lcms-color-primary, #3b82f6) 18%, transparent);
}

.lcms-address-book__input--error {
  border-color: rgb(220, 38, 38);
}

.lcms-address-book__error {
  color: rgb(220, 38, 38);
  font-size: 0.75rem;
}

.lcms-address-book__checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.lcms-address-book__checkbox input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--lcms-color-primary, #3b82f6);
}

/* Footer */
.lcms-address-book__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--lcms-color-border, #e5e7eb);
  background: rgba(0, 0, 0, 0.015);
}

/* Buttons */
.lcms-address-book__btn {
  font: inherit;
  cursor: pointer;
  border: 1px solid transparent;
  padding: 0.4375rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: transparent;
  color: var(--lcms-color-text, #1f2937);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.lcms-address-book__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lcms-address-book__btn--primary {
  background: var(--lcms-color-primary, #3b82f6);
  color: var(--lcms-color-white, #fff);
}

.lcms-address-book__btn--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.lcms-address-book__btn--ghost {
  border-color: var(--lcms-color-border, #e5e7eb);
}

.lcms-address-book__btn--ghost:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
}

.lcms-address-book__btn--danger {
  border-color: rgba(220, 38, 38, 0.4);
  color: rgb(220, 38, 38);
}

.lcms-address-book__btn--danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.06);
}
</style>
