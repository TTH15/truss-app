export type MembershipFees = { annualFee: number; admissionFee: number };

export function membershipFeeTotal(fees: MembershipFees, isRenewal: boolean): number {
  for (const amount of [fees.annualFee, fees.admissionFee]) {
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > 2147483647) {
      throw new Error('Invalid membership fee');
    }
  }
  return fees.annualFee + (isRenewal ? 0 : fees.admissionFee);
}
