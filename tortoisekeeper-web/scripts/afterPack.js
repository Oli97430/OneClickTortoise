const fs = require('fs-extra');
const path = require('path');

exports.default = async function afterPack(context) {
  const src = path.join(__dirname, '../../tortoisekeeper-backend/node_modules');
  const dest = path.join(context.appOutDir, 'resources', 'backend', 'node_modules');

  console.log('[afterPack] Copie backend/node_modules...');
  console.log('  src :', src);
  console.log('  dest:', dest);

  await fs.copy(src, dest, { overwrite: true });
  console.log('[afterPack] Done.');
};
