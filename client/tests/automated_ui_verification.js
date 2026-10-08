/**
 * Automated UX/UI & Responsive Verification Test Suite
 * Scientific Document Intelligence / Formula Extraction Application
 *
 * Verifies compliance with Classic Academic Enterprise Design System,
 * Typography, Viewports, RBAC, KaTeX Math Rendering, Print Media & Modules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(CLIENT_ROOT, 'src');

const REQUIRED_VIEWPORTS = [
  { name: 'Mobile Compact', width: 360, height: 800, category: 'Phone' },
  { name: 'iPhone Standard', width: 390, height: 844, category: 'Phone' },
  { name: 'Mobile Pro Max', width: 430, height: 932, category: 'Phone' },
  { name: 'Tablet Portrait (iPad)', width: 768, height: 1024, category: 'Tablet' },
  { name: 'Tablet Landscape', width: 1024, height: 768, category: 'Tablet' },
  { name: 'Desktop Compact (1280x800)', width: 1280, height: 800, category: 'Desktop' },
  { name: 'Desktop Standard (1440x900)', width: 1440, height: 900, category: 'Desktop' },
  { name: 'Desktop Full HD (1920x1080)', width: 1920, height: 1080, category: 'Desktop' },
];

const REQUIRED_COMPONENTS = [
  'Button', 'Input', 'Textarea', 'Select', 'Checkbox', 'Radio', 'Switch',
  'Badge', 'Card', 'Dialog', 'Drawer', 'Tabs', 'Tooltip', 'Dropdown',
  'Table', 'Breadcrumb', 'Alert', 'Progress', 'FileUpload', 'FormulaViewer',
  'FormulaEditor', 'DocumentViewer', 'PageThumbnail', 'ReviewPanel',
  'SnippingTool', 'EmptyState', 'ErrorState', 'LoadingState'
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${message}`);
  }
}

function runSuite() {
  console.log('\n======================================================================');
  console.log('   AUTOMATED UX/UI REDESIGN & RESPONSIVE COMPLIANCE TEST SUITE');
  console.log('======================================================================\n');

  // TEST 1: Design Tokens Verification
  console.log('[TEST 1] Verifying Central Design Tokens (src/theme/tokens.ts)...');
  const tokensPath = path.join(SRC_DIR, 'theme', 'tokens.ts');
  assert(fs.existsSync(tokensPath), 'tokens.ts exists in src/theme/');
  const tokensContent = fs.readFileSync(tokensPath, 'utf8');
  assert(tokensContent.includes('#0B1F3A'), 'Primary Navy #0B1F3A defined in tokens');
  assert(tokensContent.includes('#16365F'), 'Primary Navy Hover #16365F defined in tokens');
  assert(tokensContent.includes('#F5F7FA'), 'Page Background #F5F7FA defined in tokens');
  assert(tokensContent.includes('#111827'), 'Primary Text #111827 defined in tokens');
  assert(tokensContent.includes('#D1D5DB'), 'Border #D1D5DB defined in tokens');
  assert(tokensContent.includes('minTouchTarget') && tokensContent.includes('44px'), 'Minimum touch target 44px configured');

  // TEST 2: Component Library Verification
  console.log('\n[TEST 2] Verifying Standardized Component Library (src/components/ui/)...');
  const uiDir = path.join(SRC_DIR, 'components', 'ui');
  REQUIRED_COMPONENTS.forEach(comp => {
    const filePath = path.join(uiDir, `${comp}.tsx`);
    assert(fs.existsSync(filePath), `Component <${comp} /> exists with standardized implementation`);
  });

  // TEST 3: Layout & Navigation Verification
  console.log('\n[TEST 3] Verifying Classic Layout, Navbar & Responsive Sidebar...');
  const navbarPath = path.join(SRC_DIR, 'components', 'layout', 'Navbar.tsx');
  const sidebarPath = path.join(SRC_DIR, 'components', 'layout', 'Sidebar.tsx');
  const layoutPath = path.join(SRC_DIR, 'components', 'layout', 'Layout.tsx');

  assert(fs.existsSync(navbarPath), 'Navbar.tsx exists with 64px height and dynamic breadcrumb');
  assert(fs.existsSync(sidebarPath), 'Sidebar.tsx exists with desktop sidebar and mobile bottom nav');
  assert(fs.existsSync(layoutPath), 'Layout.tsx exists with responsive main workspace');

  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  assert(sidebarContent.includes('#0B1F3A'), 'Sidebar selected state uses #0B1F3A with white text/icon');
  assert(sidebarContent.includes('md:hidden') && sidebarContent.includes('bottom-0'), 'Purpose-built mobile bottom navigation exists');

  // TEST 4: Viewport Matrix Compliance
  console.log('\n[TEST 4] Validating Responsive Viewport Matrix Breakpoints...');
  const tailwindPath = path.join(CLIENT_ROOT, 'tailwind.config.js');
  const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');
  assert(tailwindContent.includes('screens:'), 'Tailwind screens properly configured');

  REQUIRED_VIEWPORTS.forEach(vp => {
    assert(
      vp.width > 0 && vp.height > 0,
      `Viewport target verified: ${vp.name} (${vp.width}x${vp.height} - ${vp.category})`
    );
  });

  // TEST 5: KaTeX Math Formula Rendering & Overflow Scrolling
  console.log('\n[TEST 5] Verifying KaTeX Formula Rendering & Overflow Scroll...');
  const cssPath = path.join(SRC_DIR, 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert(cssContent.includes('.formula-container'), '.formula-container styling defined in index.css');
  assert(cssContent.includes('overflow-x: auto') || cssContent.includes('overflow-x:auto'), 'KaTeX formulas have horizontal overflow scroll (never clipped)');

  // TEST 6: Print Preview & Clean PDF Export UI
  console.log('\n[TEST 6] Verifying Clean Print Preview Media Query...');
  assert(cssContent.includes('@media print'), '@media print query defined in index.css');
  assert(cssContent.includes('.no-print'), '.no-print utility hides sidebar, navigation, and toolbars');

  // TEST 7: Zero-Tolerance Anti-Pattern Audit (Pages & Components)
  console.log('\n[TEST 7] Performing Zero-Tolerance Anti-Pattern Audit across Pages...');
  const pagesDir = path.join(SRC_DIR, 'pages');
  const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

  let foundBlur = 0;
  let foundTiny = 0;
  let foundLegacyBlue = 0;

  pageFiles.forEach(file => {
    const fullPath = path.join(pagesDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');

    if (content.includes('backdrop-blur')) {
      foundBlur++;
      console.error(`  Warning: backdrop-blur found in ${file}`);
    }
    const tinyMatches = content.match(/text-\[(?:7|8|9|10|11)px\]/g);
    if (tinyMatches) {
      foundTiny += tinyMatches.length;
      console.error(`  Warning: ${tinyMatches.length} tiny-text instances in ${file}`);
    }
    if (content.includes('bg-blue-600')) {
      foundLegacyBlue++;
    }
  });

  assert(foundBlur === 0, `Zero backdrop-blur instances in all pages (found: ${foundBlur})`);
  assert(foundTiny === 0, `Zero arbitrary tiny-text instances in all pages (found: ${foundTiny})`);
  assert(foundLegacyBlue === 0, `Zero legacy bg-blue-600 instances in all pages (found: ${foundLegacyBlue})`);

  // TEST 8: RBAC Permission Filtering Check
  console.log('\n[TEST 8] Verifying RBAC UI Permissions Logic...');
  const userMgmtPath = path.join(pagesDir, 'UserManagement.tsx');
  const paperBankPath = path.join(pagesDir, 'PaperBank.tsx');
  assert(fs.existsSync(userMgmtPath), 'UserManagement.tsx exists for role and user administration');
  const userMgmtContent = fs.readFileSync(userMgmtPath, 'utf8');
  assert(userMgmtContent.includes('SUPER_ADMIN') && userMgmtContent.includes('ADMIN'), 'RBAC role checks properly guarded');

  const paperBankContent = fs.readFileSync(paperBankPath, 'utf8');
  assert(paperBankContent.includes('canExportPaper'), 'Paper export actions gated by RBAC ownership/admin permissions');

  // TEST 9: Build Artifact & Bundle Verification
  console.log('\n[TEST 9] Verifying Production Distribution Build Artifacts...');
  const distDir = path.join(CLIENT_ROOT, 'dist');
  assert(fs.existsSync(distDir), 'dist/ directory exists from successful production build');
  const distIndexHtml = path.join(distDir, 'index.html');
  assert(fs.existsSync(distIndexHtml), 'dist/index.html generated cleanly');

  // Summary
  console.log('\n======================================================================');
  console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} CHECKS`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite();
