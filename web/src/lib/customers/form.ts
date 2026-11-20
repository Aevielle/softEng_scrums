// Rules for the Add / Edit Customer form, shared by the form (browser) and the API routes (server),
// so the same value gets the same answer in both places. No server-only imports: bundled into the browser.

/** The list on the form. The database enforces the same five values (pay_ck, S2-DBA-03). */
export const PAY_TERMS = ['Net 15', 'Net 30', 'Net 45', 'COD', 'Prepaid'] as const;

// Column sizes: customer.custname VARCHAR(20), customer.address VARCHAR(50).
export const NAME_MAX = 20;
export const ADDRESS_MAX = 50;

export type CustomerField = 'custname' | 'address' | 'payterm';
export type CustomerInput = { custname: string; address: string; payterm: string };

export type FieldProblem = {
  title: string; // short heading, shown in bold in the toast
  message: string;
  fields: CustomerField[]; // inputs to highlight
};

export type Checked = { ok: true; value: CustomerInput } | { ok: false; error: FieldProblem };

const LABEL: Record<CustomerField, string> = { custname: 'Name', address: 'Address', payterm: 'Payment terms' };

export function validateCustomerInput(input: { custname?: unknown; address?: unknown; payterm?: unknown }): Checked {
  const custname = typeof input.custname === 'string' ? input.custname.trim() : '';
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const payterm = typeof input.payterm === 'string' ? input.payterm : '';

  // 1) Empty required fields
  const empty = (
    [['custname', custname], ['address', address], ['payterm', payterm]] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (empty.length) {
    return {
      ok: false,
      error: { title: 'Empty Field', message: `Please fill in: ${empty.map((k) => LABEL[k]).join(', ')}.`, fields: [...empty] },
    };
  }

  // 2) Wrong values
  if (!(PAY_TERMS as readonly string[]).includes(payterm)) {
    return { ok: false, error: { title: 'Wrong Value', message: 'Choose the payment terms from the list.', fields: ['payterm'] } };
  }
  const tooLong: CustomerField[] = [];
  if (custname.length > NAME_MAX) tooLong.push('custname');
  if (address.length > ADDRESS_MAX) tooLong.push('address');
  if (tooLong.length) {
    return {
      ok: false,
      error: {
        title: 'Too long',
        message: tooLong
          .map((k) => `${LABEL[k]} can have at most ${k === 'custname' ? NAME_MAX : ADDRESS_MAX} characters.`)
          .join(' '),
        fields: tooLong,
      },
    };
  }

  return { ok: true, value: { custname, address, payterm } };
}

/**
 * Next customer number from the numbers already in the table: C0082 -> C0083.
 * custno is VARCHAR(5), so it is "C" plus four digits. Returns null when C9999 is taken.
 */
export function nextCustNo(existing: string[]): string | null {
  let max = 0;
  for (const c of existing) {
    const n = /^C(\d+)$/i.exec(c.trim())?.[1];
    if (n) max = Math.max(max, Number(n));
  }
  return max + 1 > 9999 ? null : `C${String(max + 1).padStart(4, '0')}`;
}
