#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SlurmAccountingDbStack } from '../lib/slurm-accounting-db-stack';

const app = new cdk.App();

const env = {
  account: '123456789012', // ご自身のAWSアカウントIDに置き換えてください
  region: 'ap-northeast-1', // デプロイ先のリージョンに置き換えてください
};

new SlurmAccountingDbStack(app, 'SlurmAccountingDbStack', {
  vpcId: 'vpc-054b8c5b1c1012441', // 既存VPCのIDを入力
  vpcCidr: '10.0.0.0/16', // VPCのCIDRブロックを入力
  env,
});