import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SlurmAccountingDbStackProps extends cdk.StackProps {
  vpcId: string;
  vpcCidr: string;
}

export class SlurmAccountingDbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SlurmAccountingDbStackProps) {
    super(scope, id, props);

    // Secrets Manager でプレーンテキストパスワードを生成
    const dbPasswordSecret = new secretsmanager.Secret(this, 'SlurmDBPlaintextPassword', {
      secretName: 'slurmdb-password',
      description: 'Plaintext password for Slurm DB MySQL instance',
      generateSecretString: {
        passwordLength: 30,
        excludePunctuation: true,
        includeSpace: false,
        requireEachIncludedType: true,
      },
    });

    // 既存の VPC を参照
    const vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', { vpcId: props.vpcId });

    // サブネットグループの作成
    const subnetGroup = new rds.SubnetGroup(this, 'SlurmDbSubnetGroup', {
      description: 'Subnet group for Slurm DB',
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    });

    // セキュリティグループの作成
    const securityGroup = new ec2.SecurityGroup(this, 'SlurmDbSecurityGroup', {
      vpc: vpc,
      description: 'Security group for Slurm DB',
      allowAllOutbound: true,
    });

    // VPC CIDR からのインバウンドトラフィックを許可
    securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpcCidr),
      ec2.Port.tcp(3306),
      'Allow MySQL access from VPC'
    );

    // パラメータグループの作成
    const parameterGroup = new rds.ParameterGroup(this, 'SlurmDbParameterGroup', {
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_39 }),
      description: 'Custom parameter group for Slurm DB',
      parameters: {},
    });

    // オプショングループの作成
    const optionGroup = new rds.OptionGroup(this, 'SlurmDbOptionGroup', {
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_39 }),
      description: 'Custom option group for Slurm DB',
      configurations: [],
    });

    // RDS インスタンスの作成
    const dbInstance = new rds.DatabaseInstance(this, 'SlurmDbInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_39 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO), // メモ: t4g.micro は Performance Insights 非対応のタイプ
      vpc: vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      subnetGroup: subnetGroup,
      securityGroups: [securityGroup],
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      databaseName: 'slurmdb',
      credentials: rds.Credentials.fromPassword('admin', dbPasswordSecret.secretValue),
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 注意: 本番環境では RETAIN を検討してください
      deletionProtection: false, // 注意: 本番環境では true を検討してください
      parameterGroup: parameterGroup,
      optionGroup: optionGroup,
      backupRetention: cdk.Duration.days(7),
      preferredBackupWindow: '20:00-21:00', // UTC (JST 毎日 5:00-6:00)
      preferredMaintenanceWindow: 'sun:21:00-sun:22:00', // UTC (JST 日曜日 6:00-7:00)
    });

    // アウトプット
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: dbInstance.dbInstanceEndpointAddress,
      description: 'The endpoint of the database',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: dbPasswordSecret.secretArn,
      description: 'The arn of the slurmdb password',
    });
  }
}