import { BIP_CANONICAL_FIELD_KEYS_ARRAY, isValidBipFieldKey } from '../constants/fieldKeysBip';

describe('BIP Field Keys', () => {
  it('validates all canonical BIP field keys', () => {
    for (const key of BIP_CANONICAL_FIELD_KEYS_ARRAY) {
      expect(isValidBipFieldKey(key)).toBe(true);
    }
  });

  it('rejects invalid BIP field keys', () => {
    const invalidKeys = ['invalid_key', 'student_name', 's504_student_name', 'bip_invalid_field', 'BIP_STUDENT_NAME'];
    for (const key of invalidKeys) {
      expect(isValidBipFieldKey(key)).toBe(false);
    }
  });

  it('has correct number of canonical BIP field keys (31 fields)', () => {
    expect(BIP_CANONICAL_FIELD_KEYS_ARRAY.length).toBe(33);
  });

  it('all BIP field keys start with bip_ prefix', () => {
    for (const key of BIP_CANONICAL_FIELD_KEYS_ARRAY) {
      expect(key.startsWith('bip_')).toBe(true);
    }
  });

  it('all BIP field keys are lowercase snake_case', () => {
    const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
    for (const key of BIP_CANONICAL_FIELD_KEYS_ARRAY) {
      expect(snakeCaseRegex.test(key)).toBe(true);
    }
  });
});
