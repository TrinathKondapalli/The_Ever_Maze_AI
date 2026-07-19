import assert from 'assert';
import { generateMap } from '../../server/src/map/mapGenerator.js';
import { bfsPath } from '../../server/src/map/mapValidator.js';

describe('Map Generator Procedural Test', () => {
  it('should generate 50 valid maps within 500ms time budget', () => {
    const totalMaps = 50;
    let failedBfsCount = 0;
    let slowGenCount = 0;

    console.log(`[Test] Launching batch generation of ${totalMaps} procedural maps...`);

    const startTime = Date.now();

    for (let i = 0; i < totalMaps; i++) {
      const seed = Math.floor(Math.random() * 10000000);
      
      const mapGenStart = Date.now();
      const map = generateMap(seed);
      const duration = Date.now() - mapGenStart;

      if (duration > 500) {
        console.warn(`    ⚠️ Slow Generation detected: Seed ${seed} took ${duration}ms`);
        slowGenCount++;
      }

      // Check spawn positions
      assert.ok(map.spawnA, 'Spawn A must be defined');
      assert.ok(map.spawnB, 'Spawn B must be defined');
      assert.ok(map.treasurePos, 'Treasure position must be defined');
      assert.ok(map.exitPos, 'Exit position must be defined');

      // Verify reachability paths
      const pathA = bfsPath(map.chunks, map.spawnA, map.treasurePos);
      const pathB = bfsPath(map.chunks, map.spawnB, map.treasurePos);
      const pathExit = bfsPath(map.chunks, map.treasurePos, map.exitPos);

      if (!pathA) {
        console.error(`    ✗ Path A failed reachability for seed ${seed}`);
        failedBfsCount++;
      }
      if (!pathB) {
        console.error(`    ✗ Path B failed reachability for seed ${seed}`);
        failedBfsCount++;
      }
      if (!pathExit) {
        console.error(`    ✗ Path Exit failed reachability for seed ${seed}`);
        failedBfsCount++;
      }
    }

    const elapsedTotal = Date.now() - startTime;
    console.log(`[Test] Total duration: ${elapsedTotal}ms (Average: ${(elapsedTotal/totalMaps).toFixed(1)}ms/map)`);

    assert.strictEqual(failedBfsCount, 0, 'All paths must be valid across all 50 generated maps');
    assert.strictEqual(slowGenCount, 0, 'No map generation should exceed the 500ms budget limit');
  });
});

// Basic test framework runner logic
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
