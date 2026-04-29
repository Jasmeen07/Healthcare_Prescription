const { execSync, spawn } = require('child_process');

console.log('Initialising database...');
try {
  execSync('node backend/init-db.js', { stdio: 'inherit' });
} catch (err) {
  console.log('DB may already exist, continuing...\n');
}

const server = spawn('node', ['backend/server.js'], { stdio: 'inherit' });
server.on('exit', (code) => process.exit(code));