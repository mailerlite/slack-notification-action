const _ = require('underscore')
const core = require('@actions/core');
const { IncomingWebhook } = require('@slack/webhook');

const sha = process.env.GITHUB_SHA;
const repository = process.env.GITHUB_REPOSITORY;
const actor = process.env.GITHUB_ACTOR;
const ref = process.env.GITHUB_REF;
const runID = process.env.GITHUB_RUN_ID;
const workflow = process.env.GITHUB_WORKFLOW

const statusMap = {
  "success": "Completed",
  "failure": "Failed",
  "cancelled": "Canceled"
};

/**
 * Are we runnign inside jest (testing)
 * @return {boolean} If we are in jest or not.
 */
function areWeTestingWithJest() {
  return process.env.JEST_WORKER_ID !== undefined;
}

/**
 * Get tag, string based check on git ref
 * @return {string} v1.0.01.
 */
function getTag(ref) {
  if (ref.includes("refs/tags")) {
    const tag = ref.split('/').pop();
    return tag
  }

  return false
}

/**
 * Get environment, string based check on git ref
 * @return {string} Prod/Dev or Branch.
 */
function getEnvironment(ref) {
  if (ref.includes("refs/tags")) {
    return 'Prod'
  } else if (ref.includes("refs/heads/main")) {
    return 'Dev'
  } else if (ref.includes("refs/heads/master")) {
    return 'Dev'
  } else {
    return 'Branch'
  }
}

/**
 * Get the repository title from the repository string (Attempt to make it clean)
 * @param {string} repository
 * @return {string} The name of the repository.
 */
function getRepositoryTitle(repository) {
  let slug = repository ? repository.split('/')[1] : '';
  let words = slug.split('-');

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    words[i] = word.charAt(0).toUpperCase() + word.slice(1);
  }

  return words.join(' ');
}

/**
 * Get the short SHA from the full SHA.
 * @param {string} fullSha
 * @return {string} The short SHA.
 */
function getShaShort(fullSha) {
  return fullSha ? fullSha.substring(0, 8) : null;
}

/**
 * Get the status code of the github action string.
 * @param {string} status
 * @return {int} An int representation of the status.
 */
function getStatusCode(status) {
  switch (status) {
    case "success":
      return 1;
    case "cancelled":
      return 2;
    case "failure":
      return 3;
    default:
      // return 2 as neutral result
      return 2;
  }
}

async function run() {
  const { IncomingWebhook } = require('@slack/webhook');
  let url = core.getInput('slack_webhook')
  let status = core.getInput('status')

  let statusCode = getStatusCode(status);

  var buttonStyle = ''

  if (statusCode === 1) {
    buttonStyle = "primary"
  } else if (statusCode === 3) {
    buttonStyle = "danger"
  }

  let environment = getEnvironment(ref);
  let version = getTag(ref);

  const repoTitle = getRepositoryTitle(repository)

  // Initialize with defaults
  const webhook = new IncomingWebhook(url, {
    icon_emoji: ':bowtie:',
  });

  const msg = {
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `:rocket: ${repoTitle} - ${statusMap[status]}`
        }
      },
      {
        "type": "context",
        "elements": [
          {
            "text": `*Environment*: ${environment}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Commit*: ${getShaShort(sha)}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Author*: ${actor}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Workflow*: ${workflow}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Run ID*: ${runID}`,
            "type": "mrkdwn"
          }
        ]
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "url": `https://github.com/${repository}/actions/runs/${runID}`,
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": statusCode === 1 ? 'View Log' : 'View Log'
            },
            ...buttonStyle && {
              "style": buttonStyle,
            },
          }
        ]
      }
    ]
  };

  if (version) {
    msg.blocks[1].elements.unshift(
      {
        "text": `*Version*: ${version}`,
        "type": "mrkdwn"
      });
  }

  // Send the notification
  (async () => {
    await webhook.send(msg);
  })();

  // getRecords()
  //   .catch(e => {
  //     console.log('There has been a problem: ' + e.message);
  //   }).then(records => {
  //     deleteRecord(record['id'])
  //   });
}

run();
