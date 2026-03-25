/**
 * System Validation Script
 * Verify all components are working correctly
 * Run this before demo to ensure everything is ready
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const DB_PATH = path.join(__dirname, '..', 'data', 'history.db');
const API_BASE = 'http://localhost:3000';
const TRAINS = ['12955', '12728', '17015', '12702', '11039'];

async function validate() {
  console.log('\n🔍 RailSense System Validation\n');

  let passed = 0;
  let failed = 0;

  // 1. Check database
  console.log('1️⃣  Database Check');
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log('  ❌ Database not found at', DB_PATH);
      failed++;
    } else {
      const db = new Database(DB_PATH, { readonly: true });
      const result = db.prepare('SELECT COUNT(*) as count FROM train_snapshots').get() as any;
      const count = result?.count || 0;

      if (count > 0) {
        console.log(`  ✅ Database ready (${count} snapshots)`);
        passed++;
      } else {
        console.log('  ⚠️  Database empty (start collector to populate)');
      }
      db.close();
    }
  } catch (e) {
    console.log('  ❌ Database error:', e);
    failed++;
  }

  // 2. Check Next.js server
  console.log('\n2️⃣  Server Check');
  try {
    const res = await fetch(`${API_BASE}/api/health`, { timeout: 5000 });
    if (res.ok || res.status === 404) {
      // 404 is ok, just means no /health endpoint
      console.log('  ✅ Server is running');
      passed++;
    } else {
      console.log('  ❌ Server returned status', res.status);
      failed++;
    }
  } catch (e) {
    console.log('  ❌ Server not responding:', e);
    failed++;
  }

  // 3. Check provider endpoints
  console.log('\n3️⃣  API Endpoints Check');
  for (const train of TRAINS.slice(0, 2)) {
    try {
      const res = await fetch(`${API_BASE}/api/train/${train}`, { timeout: 5000 });
      if (res.ok) {
        const data = await res.json();
        if (data.trainNumber && data.position) {
          console.log(`  ✅ /api/train/${train}: OK (${data.metadata.data_quality})`);
          passed++;
        } else {
          console.log(`  ❌ /api/train/${train}: Invalid response`);
          failed++;
        }
      } else {
        console.log(`  ❌ /api/train/${train}: Status ${res.status}`);
        failed++;
      }
    } catch (e) {
      console.log(`  ❌ /api/train/${train}: Error`, e.message);
      failed++;
    }
  }

  // 4. Check admin endpoint
  console.log('\n4️⃣  Admin Endpoint Check');
  try {
    const res = await fetch(`${API_BASE}/api/admin/providers/status`, { timeout: 5000 });
    if (res.ok) {
      const data = await res.json();
      if (data.providers && Array.isArray(data.providers)) {
        console.log(`  ✅ /api/admin/providers/status: OK`);
        console.log(`     Providers: ${data.providers.map((p: any) => p.name).join(', ')}`);
        passed++;
      } else {
        console.log('  ❌ Invalid admin response');
        failed++;
      }
    } else {
      console.log(`  ❌ Admin endpoint returned ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log('  ❌ Admin endpoint error:', e.message);
    failed++;
  }

  // 5. Check collector status
  console.log('\n5️⃣  Collector Status Check');
  try {
    if (fs.existsSync(DB_PATH)) {
      const db = new Database(DB_PATH, { readonly: true });
      const latest = db.prepare(`
        SELECT MAX(timestamp) as latest FROM train_snapshots
      `).get() as any;

      if (latest?.latest) {
        const ageMs = Date.now() - latest.latest;
        const ageSec = Math.floor(ageMs / 1000);

        if (ageSec < 60) {
          console.log(`  ✅ Collector running (last snapshot ${ageSec}s ago)`);
          passed++;
        } else if (ageSec < 300) {
          console.log(`  ⚠️  Collector may be slow (last snapshot ${ageSec}s ago)`);
        } else {
          console.log(`  ❌ Collector stalled (last snapshot ${ageSec}s ago)`);
          failed++;
        }
      }
      db.close();
    }
  } catch (e) {
    console.log('  ❌ Collector check error:', e.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Summary: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('✅ All systems ready for demo!\n');
    process.exit(0);
  } else {
    console.log('❌ Please fix issues before proceeding\n');
    process.exit(1);
  }
}

// Run validation
validate().catch(e => {
  console.error('Validation error:', e);
  process.exit(1);
});
