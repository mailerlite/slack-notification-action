const process = require('process');
const cp = require('child_process');
const path = require('path');
const fs = require('fs')
const dotenv = require('dotenv');
const { GitHub } = require('@actions/github/lib/utils');

beforeAll(() => {
  const envConfig = dotenv.parse(fs.readFileSync('.env'))
  for (const k in envConfig) {
    process.env[k] = envConfig[k]
  }
});

// shows how the runner will run a javascript action with env / stdout protocol
test('test it can get pr commits', () => {
  const ep = path.join(__dirname, 'index.js');
  cp.execSync(`node ${ep}`, { env: process.env }).toString();
})

// shows how the runner will run a javascript action with env / stdout protocol
test('test it can get push commits', () => {
  process.env['GITHUB_EVENT_NAME'] = "push";
  const ep = path.join(__dirname, 'index.js');
  cp.execSync(`node ${ep}`, { env: process.env }).toString();
})
