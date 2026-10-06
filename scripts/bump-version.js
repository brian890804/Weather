import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const pkgPath = path.resolve(process.cwd(), 'package.json');

try {
  // 1. 檢查 package.json 是否已經在 staged 暫存區中變更過
  let isPkgStaged = false;
  try {
    const diff = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    isPkgStaged = diff.split('\n').some((f) => f.trim() === 'package.json');
  } catch {
    // ignore
  }

  // 2. 如果使用者「已經手動改過」package.json 並且 stage 了，比對版本號是否有變更
  if (isPkgStaged) {
    try {
      const oldPkgContent = execSync('git show HEAD:package.json', { encoding: 'utf8' });
      const oldPkg = JSON.parse(oldPkgContent);
      const currentPkgContent = fs.readFileSync(pkgPath, 'utf8');
      const currentPkg = JSON.parse(currentPkgContent);

      if (oldPkg.version && currentPkg.version && oldPkg.version !== currentPkg.version) {
        console.log(`[Version Hook] 偵測到手動調整版本號: ${oldPkg.version} -> ${currentPkg.version}，保留手動設定。`);
        process.exit(0);
      }
    } catch {
      // 若無 HEAD (如初始 commit)，直接跳過手動比對
    }
  }

  // 3. 使用者未手動更改版號，自動將最後一位 X+1 (patch increment)
  const currentPkgContent = fs.readFileSync(pkgPath, 'utf8');
  const currentPkg = JSON.parse(currentPkgContent);
  const currentVersion = currentPkg.version || '1.0.0';

  const parts = currentVersion.split('.');
  if (parts.length >= 3) {
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      parts[parts.length - 1] = String(lastNum + 1);
      const newVersion = parts.join('.');
      currentPkg.version = newVersion;

      fs.writeFileSync(pkgPath, JSON.stringify(currentPkg, null, 2) + '\n', 'utf8');
      execSync('git add package.json');
      console.log(`[Version Hook] 自動遞增版本號: ${currentVersion} -> ${newVersion}`);
    }
  }
} catch (err) {
  console.warn('[Version Hook] 自動遞增版本號失敗:', err.message);
}
