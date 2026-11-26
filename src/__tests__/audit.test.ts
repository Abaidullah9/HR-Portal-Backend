import { diffFields } from '../utils/helper/audit';

describe('diffFields', () => {
  it('stops at a parent reference instead of recursing forever', () => {
    const line: Record<string, unknown> = { type: 'Transport', amount: 5000 };
    // Mongoose subdocuments carry a reference back to the owning document.
    line.parent = { line };

    const changes = diffFields({}, { allowances: [line] });

    expect(changes).toHaveLength(1);
    expect(changes[0].field).toBe('allowances');
    expect(JSON.stringify(changes[0].to)).toContain('[circular]');
  });

  it('still reports the fields that changed', () => {
    expect(diffFields({ salary: 100 }, { salary: 120 })).toEqual([
      { field: 'salary', from: 100, to: 120 },
    ]);
  });
});
