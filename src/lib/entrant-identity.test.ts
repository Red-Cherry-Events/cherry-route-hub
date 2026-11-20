import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { matchEntrantIdentity } from './entrant-identity'

describe('shared-email family entries', () => {
  const family = [
    { id: 'denise', full_name: 'Denise Brooke', id_number_hash: 'denise-id' },
    { id: 'richard', full_name: 'Richard Brooke', id_number_hash: 'richard-id' },
    { id: 'abbey', full_name: 'Abbey Brooke', id_number_hash: 'abbey-id' },
    { id: 'suzanne', full_name: 'Suzanne Brooke', id_number_hash: 'suzanne-id' },
  ]
  it('keeps all four family members separate', () => {
    assert.deepEqual(family.map(r => matchEntrantIdentity(family, r.full_name, r.id_number_hash)), ['denise', 'richard', 'abbey', 'suzanne'])
  })
  it('rejects conflicting identities even with the same name', () => {
    assert.equal(matchEntrantIdentity(family, 'Denise Brooke', 'another-id'), null)
  })
  it('matches an unambiguous name without an ID', () => {
    assert.equal(matchEntrantIdentity(family, ' Denise  Brooke ', null), 'denise')
  })
  it('does not guess between same-name people', () => {
    assert.equal(matchEntrantIdentity([...family, { id: 'other', full_name: 'Denise Brooke', id_number_hash: null }], 'Denise Brooke', null), null)
  })
})