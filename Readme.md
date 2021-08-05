# GitHub Action to Send Notificatios to Slack ✉️

Used for sending slack notifications based on status of deployment

## Usage

### `workflow.yml` Example

#### Run using slack webhook url
```yaml
    - name: Slack Notification
      uses: remotecompany/slack-notification-action@v0.0.1
      with:
        slack_webhook: ${{ secrets.SLACK_WEBHOOK }}
        status: ${{ job.status }}
```

### Testing

Setup .env file from .env.example `cp .env.example .env`

Add a Github token to the ENV, and setup the event.json with data (PR number etc)

```shell
yarn install
yarn test
```

### Building

The dist folder must be committed and rebuilt each time.

```shell
yarn build
```
