import * as cdk from 'aws-cdk-lib';
import { Secret, SecretStringGenerator } from 'aws-cdk-lib/aws-secretsmanager';
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { CfnSecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class SlurmAccountingDbStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const slurmDbSecret = new CfnSecret(this, 'SlurmDBPlaintextPassword', {
      name: 'slurm-db-password',
      description: 'Plaintext password for Slurm DB MySQL instance',
      generateSecretString: {
        passwordLength: 30,
        excludePunctuation: true, // 句読点を除外
        includeSpace: false,       // スペースを含めない
        requireEachIncludedType: true, // 各文字種を含む
      },
    });
  }
}