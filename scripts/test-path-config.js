import { computeDefaultSettingsFor, validatePathValue } from '../electron/settings-defaults.js';

function fakeGetPath(name) {
  if (name === 'documents') return process.env.USERPROFILE ? `${process.env.USERPROFILE}\\Documents` : '/tmp/Documents';
  return '';
}

function runDefaults() {
  const winDefaults = computeDefaultSettingsFor('win32', fakeGetPath, () => { throw new Error(); });
  const linuxDefaults = computeDefaultSettingsFor('linux', () => '/home/test/Documents', () => { throw new Error(); });
  const macDefaults = computeDefaultSettingsFor('darwin', () => '/Users/test/Documents', () => { throw new Error(); });
  console.log('win32 defaults', winDefaults);
  console.log('linux defaults', linuxDefaults);
  console.log('darwin defaults', macDefaults);
}

function runValidation() {
  const cases = [
    { platform: 'win32', input: 'C:>\\bad', kind: 'directory' },
    { platform: 'win32', input: 'C:\\Windows', kind: 'directory' },
    { platform: 'linux', input: '/etc/hosts', kind: 'file' },
    { platform: 'darwin', input: '/System', kind: 'directory' }
  ];
  for (const c of cases) {
    const res = validatePathValue(c.platform, c.input, c.kind);
    console.log(c.platform, c.input, c.kind, res);
  }
}

runDefaults();
runValidation();
