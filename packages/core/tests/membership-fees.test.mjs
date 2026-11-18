import test from 'node:test';
import assert from 'node:assert/strict';
import { membershipFeeTotal } from '../src/membership-fees.ts';

test('新規会員は会費と入会金の合計、継続会員は会費のみ', () => {
  assert.equal(membershipFeeTotal({ annualFee: 1000, admissionFee: 500 }, false), 1500);
  assert.equal(membershipFeeTotal({ annualFee: 1000, admissionFee: 500 }, true), 1000);
  assert.equal(membershipFeeTotal({ annualFee: 2000, admissionFee: 500 }, false), 2500);
  assert.equal(membershipFeeTotal({ annualFee: 0, admissionFee: 0 }, false), 0);
});

test('負数、小数、非数とDBの整数範囲を超える設定は金額として表示しない', () => {
  for (const value of [-1, 1.5, NaN, Infinity, '1000', 2147483648]) {
    assert.throws(() => membershipFeeTotal({ annualFee: value, admissionFee: 500 }, false));
    assert.throws(() => membershipFeeTotal({ annualFee: 1000, admissionFee: value }, false));
  }
});
