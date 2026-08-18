import { describe, expectTypeOf, it } from 'vitest'
import {
  boolean,
  dateRange,
  defineFilters,
  multiSelect,
  numberRange,
  select,
  text,
  type InferFilterState,
} from '../index'

const filters = defineFilters({
  search: text(),
  status: select(['pending', 'paid', 'failed']),
  tags: multiSelect(['urgent', 'review']),
  active: boolean(),
  createdAt: dateRange(),
  amount: numberRange(),
})

type State = InferFilterState<typeof filters>

describe('InferFilterState type inference', () => {
  it('infers text filter as string | undefined', () => {
    expectTypeOf<State['search']>().toEqualTypeOf<string | undefined>()
  })

  it('infers select filter as literal union | undefined', () => {
    expectTypeOf<State['status']>().toEqualTypeOf<'pending' | 'paid' | 'failed' | undefined>()
  })

  it('infers multiSelect filter as Array<literal union> | undefined', () => {
    expectTypeOf<State['tags']>().toEqualTypeOf<Array<'urgent' | 'review'> | undefined>()
  })

  it('infers boolean filter as boolean | undefined', () => {
    expectTypeOf<State['active']>().toEqualTypeOf<boolean | undefined>()
  })

  it('infers dateRange filter as range object | undefined', () => {
    expectTypeOf<State['createdAt']>().toEqualTypeOf<{ from?: string; to?: string } | undefined>()
  })

  it('infers numberRange filter as range object | undefined', () => {
    expectTypeOf<State['amount']>().toEqualTypeOf<{ min?: number; max?: number } | undefined>()
  })

  it('select infers literal types without as const', () => {
    const f = defineFilters({ role: select(['admin', 'viewer', 'editor']) })
    type RoleState = InferFilterState<typeof f>
    expectTypeOf<RoleState['role']>().toEqualTypeOf<'admin' | 'viewer' | 'editor' | undefined>()
  })

  it('multiSelect infers literal types without as const', () => {
    const f = defineFilters({ perms: multiSelect(['read', 'write', 'delete']) })
    type PermsState = InferFilterState<typeof f>
    expectTypeOf<PermsState['perms']>().toEqualTypeOf<
      Array<'read' | 'write' | 'delete'> | undefined
    >()
  })
})
