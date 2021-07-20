const process = require('process');
const cp = require('child_process');
const path = require('path');
const fs = require('fs')
const dotenv = require('dotenv')

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  const envConfig = dotenv.parse(fs.readFileSync('.env'))
  for (const k in envConfig) {
    process.env[k] = envConfig[k]
  }
  const ep = path.join(__dirname, 'index.js');
  console.log(cp.execSync(`node ${ep}`, { env: process.env }).toString());
})
