import { load } from '../frameworks/load.js';
import { save } from '../frameworks/save.js';
import { space } from '../frameworks/space.js';
import { updateReadme } from '../frameworks/updateReadme.js';

/**
 * @description Samaid helps you generate Mermaid diagrams
 * from AWS SAM templates.
 */
export class Samaid {
  private readonly resources;
  private readonly parameters;

  constructor(templatePath: string) {
    const template = load(templatePath);

    this.resources = template.Resources;
    this.parameters = template.Parameters;
  }

  /**
   * @description Generate a Mermaid diagram.
   * Providing the optional `outputPath` will save
   * the results to disk.
   */
  public generate(outputPath?: string, shouldUpdateReadme = false) {
    const resources = this.resources;
    const parameters = this.parameters;

    const dynamoConnections: string[] = [];
    const eventbridgeConnections: string[] = [];

    let diagram = 'graph TD\n';

    const httpApis = this.filterResource('httpapi', resources);
    if (httpApis.length > 0) diagram = this.handleHttpApi(diagram, httpApis);

    const dynamoDb = this.filterResource('dynamodb', resources);
    if (dynamoDb.length > 0)
      diagram = this.handleDynamoDb(diagram, dynamoDb, resources, parameters);

    const s3 = this.filterResource('s3', resources);
    if (s3.length > 0) diagram = this.handleS3(diagram, s3, parameters);

    const functions = this.filterResource('function', resources);
    if (functions.length > 0)
      diagram = this.handleLambda(
        diagram,
        functions,
        parameters,
        resources,
        eventbridgeConnections,
        dynamoConnections,
      );

    if (dynamoConnections.length > 0)
      diagram = this.handleDynamoDbConnections(diagram, dynamoConnections);

    if (eventbridgeConnections.length > 0)
      diagram = this.handleEventBridgeConnections(
        diagram,
        eventbridgeConnections,
      );

    if (outputPath) save(diagram, outputPath);
    if (shouldUpdateReadme)
      updateReadme(
        process.env.NODE_ENV === 'test' ? '__test_readme__.md' : 'README.md',
        diagram,
      );

    return diagram;
  }

  /**
   * @description Create diagram content for HTTP APIs (API Gateway v2).
   */
  private handleHttpApi(diagram: string, httpApis: Record<string, any>) {
    diagram += `${space()}subgraph API\n`;

    httpApis.forEach(
      ([resourceName]: string) => (diagram += `${space(4)}${resourceName}\n`),
    );
    diagram += `${space()}end\n`;

    return diagram;
  }

  /**
   * @description Create diagram content for Lambda functions.
   */
  private handleLambda(
    diagram: string,
    functions: Record<string, any>,
    parameters: Record<string, any>,
    resources: Record<string, any>,
    eventbridgeConnections: string[],
    dynamoConnections: string[],
  ) {
    diagram += `${space()}subgraph Functions\n`;

    functions.forEach(([functionName, functionData]: Record<string, any>[]) => {
      const fixedFunctionName = functionName.endsWith('Function')
        ? functionName.split('Function')[0]
        : functionName;

      const policyStatements =
        functionData?.Properties?.Policies?.[0]?.Statement;
      if (!policyStatements) return;

      const events: Record<string, any>[] = functionData?.Properties?.Events;
      if (!events) return;

      Object.values(events).forEach((event) => {
        const canEmitEvents = this.hasPolicyAction(
          'events:PutEvents',
          policyStatements,
        );

        if (canEmitEvents) {
          const eventBusRefs = policyStatements
            .filter((statement: Record<string, any>) =>
              statement.Action.includes('events:PutEvents'),
            )
            .map((resource: Record<string, any>) =>
              this.getParameterDefaultValue(resource.Resource.Ref, parameters),
            );

          eventBusRefs.forEach((eventBus: string) => {
            eventbridgeConnections.push(
              `${space(4)}${fixedFunctionName} --> |Emits| ${eventBus}\n`,
            );
          });
        }

        const canOperateDynamoDb = this.hasPolicyAction(
          'dynamodb:',
          policyStatements,
        );

        if (canOperateDynamoDb) {
          const policy = this.getPolicyAction('dynamodb:', policyStatements)[0];

          const actions = policy.Action.map(
            (action: string) => action.split('dynamodb:')[1],
          );

          const resources = Array.isArray(policy.Resource)
            ? policy.Resource
            : [policy.Resource];

          resources.forEach((resource: Record<string, any>) => {
            const tableParameterName = resource['Fn::Sub']
              .split(':table/')[1]
              .replace('$', '')
              .replace('{', '')
              .replace('}', '');

            const tableName = this.getParameterDefaultValue(
              tableParameterName,
              parameters,
            );

            actions.forEach(
              (action: string) =>
                (diagram += `${space(4)}${fixedFunctionName} --> |${action}| ${tableName}\n`),
            );
          });
        }

        const canOperateS3 = this.hasPolicyAction('s3:', policyStatements);
        if (canOperateS3) {
          const policies = this.getPolicyAction('s3:', policyStatements);

          const interactions: Record<string, any> = {};

          policies.map((policy: Record<string, any>) => {
            const bucketResourceName =
              policy.Resource['Fn::Sub'].match(/\${(\w+)\.Arn}/)[1];

            const bucketNameParameter =
              resources[bucketResourceName].Properties.BucketName.Ref;

            const bucketName = this.getParameterDefaultValue(
              bucketNameParameter,
              parameters,
            );

            interactions[bucketName] = interactions[bucketName] || [];
            const actions = policy.Action.map(
              (action: string) => action.split('s3:')[1],
            );

            interactions[bucketName].push(...actions);
          });

          Object.entries(interactions).forEach(([bucketName, actions]) =>
            actions.forEach(
              (action: string) =>
                (diagram += `${space(4)}${fixedFunctionName} --> |${action}| ${bucketName}\n`),
            ),
          );
        }

        if (event.Type === 'HttpApi') {
          const apiId = event.Properties.ApiId.Ref;
          const method = event.Properties.Method;

          diagram += `${space(4)}${apiId} --> |${method}| ${fixedFunctionName}\n`;
        }

        if (event.Type === 'EventBridgeRule') {
          const detailTypes = event.Properties.Pattern['detail-type'];

          diagram += `${space(4)}${fixedFunctionName}\n`;

          detailTypes.forEach((detailType: string) =>
            eventbridgeConnections.push(
              `${space(4)}${detailType} --> |Triggers| ${fixedFunctionName}\n`,
            ),
          );
        }

        if (event.Type === 'DynamoDB') {
          const resourceName = `${event.Properties.Stream['Fn::GetAtt'].split('.StreamArn')[0]}`;

          const tableName = this.getParameterDefaultValue(
            resources[resourceName].Properties.TableName.Ref,
            parameters,
          );

          diagram += `${space(4)}${fixedFunctionName}\n`;

          dynamoConnections.push(
            `${space(4)}${tableName} --> |Stream| ${fixedFunctionName}\n`,
          );
        }
      });
    });

    diagram += `${space()}end\n`;

    return diagram;
  }

  /**
   * @description Create diagram content for S3 buckets.
   */
  private handleS3(
    diagram: string,
    s3: Record<string, any>,
    parameters: Record<string, any>,
  ) {
    diagram += `${space()}subgraph S3\n`;

    s3.forEach(([_, resource]: Record<string, any>[]) => {
      const bucketNameParameter = resource.Properties.BucketName.Ref;

      const bucketName = this.getParameterDefaultValue(
        bucketNameParameter,
        parameters,
      );
      diagram += `${space(4)}${bucketName}\n`;
    });

    diagram += `${space()}end\n`;

    return diagram;
  }

  /**
   * @description Create diagram content for DynamoDB tables.
   */
  private handleDynamoDb(
    diagram: string,
    dynamoDb: Record<string, any>,
    resources: Record<string, any>,
    parameters: Record<string, any>,
  ) {
    diagram += `${space()}subgraph DynamoDB\n`;

    dynamoDb.forEach(([resourceName]: string) => {
      const tableName = this.getParameterDefaultValue(
        resources[resourceName].Properties.TableName.Ref,
        parameters,
      );

      diagram += `${space(4)}${tableName}\n`;
    });

    diagram += `${space()}end\n`;

    return diagram;
  }

  /**
   * @description Create diagram connections for EventBridge events.
   */
  private handleEventBridgeConnections(
    diagram: string,
    eventbridgeConnections: string[],
  ) {
    diagram += `${space()}subgraph EventBridge\n`;
    eventbridgeConnections.forEach((connection) => (diagram += connection));
    diagram += `${space()}end\n`;

    return diagram;
  }

  /**
   * @description Create diagram connections for DynamoDB events.
   */
  private handleDynamoDbConnections(
    diagram: string,
    dynamoConnections: string[],
  ) {
    diagram += `${space()}subgraph DynamoDB\n`;
    dynamoConnections.forEach((connection) => (diagram += connection));
    diagram += `${space()}end\n`;

    return diagram;
  }

  /**
   * @description Get the default value of a parameter.
   */
  private getParameterDefaultValue(
    value: string,
    parameters: Record<string, any>,
  ) {
    const match = parameters[value];
    return match?.Default || null;
  }

  /**
   * @description Does the policy have a policy matching
   * or starting with the provided string?
   */
  private hasPolicyAction(
    action: string,
    policyStatements: Record<string, any>[],
  ) {
    return policyStatements.some((statement) =>
      statement.Action.some(
        (a: string) => a === action || a.startsWith(action),
      ),
    );
  }

  /**
   * @description Get the policy actions for an action
   * matching or starting with the provided string.
   */
  private getPolicyAction(
    action: string,
    policyStatements: Record<string, any>[],
  ) {
    return policyStatements.filter((statement) =>
      statement.Action.some(
        (a: string) => a === action || a.startsWith(action),
      ),
    );
  }

  /**
   * @description Filter out the resources of the provided type.
   */
  private filterResource(
    resourceType: ResourceType,
    resources: Record<string, any>,
  ) {
    const type = (() => {
      if (resourceType === 'dynamodb') return 'AWS::DynamoDB::Table';
      if (resourceType === 'function') return 'AWS::Serverless::Function';
      if (resourceType === 'httpapi') return 'AWS::Serverless::HttpApi';
      if (resourceType === 's3') return 'AWS::S3::Bucket';
    })();

    return Object.entries(resources).filter(([_, data]) => data.Type === type);
  }
}

type ResourceType = 'dynamodb' | 'function' | 'httpapi' | 's3';
