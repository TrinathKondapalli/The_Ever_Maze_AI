import assert from 'assert';
import { isValidUuidV4 } from '../../server/src/sessions/sessionManager.js';

describe('isValidUuidV4', () => {
  it('should validate correct UUID v4 strings', () => {
    assert.strictEqual(isValidUuidV4('3d5c907a-245c-42b7-a3cf-1a1a1a1a1a1a'), true);
    assert.strictEqual(isValidUuidV4('a5a5a5a5-a5a5-45a5-b5a5-a5a5a5a5a5a5'), true);
    assert.strictEqual(isValidUuidV4('00000000-0000-4000-8000-000000000000'), true);
  });

  it('should reject non-v4 UUID strings', () => {
    // v1 UUID (time-based)
    assert.strictEqual(isValidUuidV4('2b6e5114-1a9e-11ed-861d-0242ac120002'), false);
    // Invalid version digit (must be 4)
    assert.strictEqual(isValidUuidV4('3d5c907a-245c-32b7-a3cf-1a1a1a1a1a1a'), false);
    // Invalid variant digit (must be 8, 9, a, or b)
    assert.strictEqual(isValidUuidV4('3d5c907a-245c-42b7-73cf-1a1a1a1a1a1a'), false);
  });

  it('should reject malformed or non-string inputs', () => {
    assert.strictEqual(isValidUuidV4('not-a-uuid'), false);
    assert.strictEqual(isValidUuidV4(null), false);
    assert.strictEqual(isValidUuidV4(undefined), false);
    assert.strictEqual(isValidUuidV4({}), false);
    assert.strictEqual(isValidUuidV4(12345), false);
  });
});

// Basic test framework runner logic if run directly with Node.js
function describe(name, fn) {
  console.log(`\n=== Running Suite: ${name} ===`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}
