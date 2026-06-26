export interface ReceiptInput {
  donationId: string;
  createdAt: Date;
  companyName: string;
  amountCents: number;
  currency: string;
  campaignTitle: string;
  schoolName: string;
}

/** Builds a (symbolic) corporate donation receipt. Not a real tax document. */
export function buildReceipt(input: ReceiptInput) {
  const year = input.createdAt.getFullYear();
  const receiptNo = `BURSA-${year}-${input.donationId.slice(-8).toUpperCase()}`;
  return {
    receiptNo,
    date: input.createdAt,
    donor: input.companyName,
    amountCents: input.amountCents,
    currency: input.currency,
    campaign: input.campaignTitle,
    school: input.schoolName,
    issuer: 'Bursa gGmbH (prototype — not a valid tax receipt)',
  };
}
