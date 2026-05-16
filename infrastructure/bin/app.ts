import { App } from 'aws-cdk-lib';
import { OpenContractStack } from '../lib/open-contract-stack.js';

const app = new App();

new OpenContractStack(app, 'OpenContract', {
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'] ?? 'us-east-1',
  },
});
