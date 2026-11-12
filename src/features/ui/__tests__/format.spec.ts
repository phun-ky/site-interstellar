import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  formatAu,
  formatDistance,
  formatNumber,
  formatPeriod
} from '../utils/format';

describe('formatNumber', () => {
  test('keeps 4 significant digits, and is compact from 100 000', () => {
    assert.equal(formatNumber(365.256), '365.3');
    assert.equal(formatNumber(12_345), '12,350');
    assert.equal(formatNumber(1_234_567), '1.23M');
  });
});

describe('formatAu', () => {
  test('uses km for a moon, au in a system and ly beyond a light year', () => {
    assert.equal(formatAu(0.00257), '384K km');
    assert.equal(formatAu(5.2038), '5.204 au');
    assert.equal(formatAu(63_241.077 * 4.37), '4.37 ly');
    assert.equal(formatDistance({ value: 1.5, unit: 'au' }), '1.5 au');
  });
});

describe('formatPeriod', () => {
  test('uses days below 1000 days, and years from there', () => {
    assert.equal(formatPeriod({ value: 687, unit: 'd' }), '687 d');
    assert.equal(formatPeriod({ value: 4332.59, unit: 'd' }), '11.86 yr');
  });
});
