/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingAuthorizationFilterType,
  asFiltersByRuleTypeAndConsumer,
  ensureFieldIsSafeForQuery,
  asFiltersBySpaceId,
} from './alerting_authorization_kuery';
import type { KueryNode } from '@kbn/es-query';
import { toKqlExpression } from '@kbn/es-query';

describe('asKqlFiltersByRuleTypeAndConsumer', () => {
  test('constructs KQL filter for single rule type with single authorized consumer', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      toKqlExpression(
        asFiltersByRuleTypeAndConsumer(
          authorizedRuleTypes,
          {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
            },
          },
          'space1'
        ) as KueryNode
      )
    ).toMatchInlineSnapshot(`"(path.to.rule_type_id: myAppAlertType AND consumer-field: myApp)"`);
  });

  test('constructs KQL filter for single rule type with multiple authorized consumers', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      toKqlExpression(
        asFiltersByRuleTypeAndConsumer(
          authorizedRuleTypes,
          {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
            },
          },
          'space1'
        ) as KueryNode
      )
    ).toMatchInlineSnapshot(
      `"(path.to.rule_type_id: myAppAlertType AND (consumer-field: alerts OR consumer-field: myApp OR consumer-field: myOtherApp))"`
    );
  });

  test('constructs KQL filter for multiple rule types across authorized consumer', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
      [
        'myOtherAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      toKqlExpression(
        asFiltersByRuleTypeAndConsumer(
          authorizedRuleTypes,
          {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
            },
          },
          'space1'
        ) as KueryNode
      )
    ).toMatchInlineSnapshot(
      `"((path.to.rule_type_id: myAppAlertType AND (consumer-field: alerts OR consumer-field: myApp OR consumer-field: myOtherApp OR consumer-field: myAppWithSubFeature)) OR (path.to.rule_type_id: myOtherAppAlertType AND (consumer-field: alerts OR consumer-field: myApp OR consumer-field: myOtherApp OR consumer-field: myAppWithSubFeature)))"`
    );
  });

  test('constructs KQL filter with spaceId filter when spaceIds field path exists', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
      [
        'myOtherAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      toKqlExpression(
        asFiltersByRuleTypeAndConsumer(
          authorizedRuleTypes,
          {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
              spaceIds: 'path.to.spaceIds',
            },
          },
          'space1'
        ) as KueryNode
      )
    ).toMatchInlineSnapshot(
      `"((path.to.rule_type_id: myAppAlertType AND (consumer-field: alerts OR consumer-field: myApp OR consumer-field: myOtherApp OR consumer-field: myAppWithSubFeature) AND path.to.spaceIds: space1) OR (path.to.rule_type_id: myOtherAppAlertType AND (consumer-field: alerts OR consumer-field: myApp OR consumer-field: myOtherApp OR consumer-field: myAppWithSubFeature) AND path.to.spaceIds: space1))"`
    );
  });

  test('constructs KQL filter without spaceId filter when spaceIds path is specified, but spaceId is undefined', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
      [
        'myOtherAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      toKqlExpression(
        asFiltersByRuleTypeAndConsumer(
          authorizedRuleTypes,
          {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
              spaceIds: 'path.to.spaceIds',
            },
          },
          undefined
        ) as KueryNode
      )
    ).toMatchInlineSnapshot(
      `"((path.to.rule_type_id: myAppAlertType AND (consumer-field: alerts OR consumer-field: myApp OR consumer-field: myOtherApp OR consumer-field: myAppWithSubFeature)) OR (path.to.rule_type_id: myOtherAppAlertType AND (consumer-field: alerts OR consumer-field: myApp OR consumer-field: myOtherApp OR consumer-field: myAppWithSubFeature)))"`
    );
  });

  test('constructs KQL filter for single rule type with no authorized consumer', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {},
        },
      ],
    ]);

    const result = toKqlExpression(
      asFiltersByRuleTypeAndConsumer(
        authorizedRuleTypes,
        {
          type: AlertingAuthorizationFilterType.KQL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      ) as KueryNode
    );

    expect(result).toMatchInlineSnapshot(`"path.to.rule_type_id: myAppAlertType"`);
  });
});

describe('asEsDslFiltersByRuleTypeAndConsumer', () => {
  test('constructs ES DSL filter for single rule type with single authorized consumer', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      asFiltersByRuleTypeAndConsumer(
        authorizedRuleTypes,
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'path.to.rule_type_id': 'myAppAlertType',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  match: {
                    'consumer-field': 'myApp',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  test('constructs ES DSL filter for single rule type with multiple authorized consumers', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      asFiltersByRuleTypeAndConsumer(
        authorizedRuleTypes,
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toEqual({
      bool: {
        filter: [
          {
            bool: {
              should: [{ match: { 'path.to.rule_type_id': 'myAppAlertType' } }],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  bool: {
                    should: [{ match: { 'consumer-field': 'alerts' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [{ match: { 'consumer-field': 'myApp' } }],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [{ match: { 'consumer-field': 'myOtherApp' } }],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  test('constructs ES DSL filter for multiple rule types across authorized consumer', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
      [
        'myOtherAppAlertType',
        {
          authorizedConsumers: {
            alerts: { read: true, all: true },
            myApp: { read: true, all: true },
            myOtherApp: { read: true, all: true },
            myAppWithSubFeature: { read: true, all: true },
          },
        },
      ],
    ]);

    expect(
      asFiltersByRuleTypeAndConsumer(
        authorizedRuleTypes,
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "path.to.rule_type_id": "myAppAlertType",
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "alerts",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "myApp",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "myOtherApp",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "myAppWithSubFeature",
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "path.to.rule_type_id": "myOtherAppAlertType",
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "alerts",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "myApp",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "myOtherApp",
                                },
                              },
                            ],
                          },
                        },
                        Object {
                          "bool": Object {
                            "minimum_should_match": 1,
                            "should": Array [
                              Object {
                                "match": Object {
                                  "consumer-field": "myAppWithSubFeature",
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
  });

  test('constructs KQL filter for single rule type with no authorized consumer', async () => {
    const authorizedRuleTypes = new Map([
      [
        'myAppAlertType',
        {
          authorizedConsumers: {},
        },
      ],
    ]);

    const result = asFiltersByRuleTypeAndConsumer(
      authorizedRuleTypes,
      {
        type: AlertingAuthorizationFilterType.ESDSL,
        fieldNames: {
          ruleTypeId: 'path.to.rule_type_id',
          consumer: 'consumer-field',
        },
      },
      'space1'
    );

    expect(result).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "minimum_should_match": 1,
          "should": Array [
            Object {
              "match": Object {
                "path.to.rule_type_id": "myAppAlertType",
              },
            },
          ],
        },
      }
    `);
  });
});

describe('asFiltersBySpaceId', () => {
  test('returns ES dsl filter of spaceId', () => {
    expect(
      asFiltersBySpaceId(
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
            spaceIds: 'path.to.space.id',
          },
        },
        'space1'
      )
    ).toEqual({
      bool: { minimum_should_match: 1, should: [{ match: { 'path.to.space.id': 'space1' } }] },
    });
  });

  test('returns KQL filter of spaceId', () => {
    expect(
      toKqlExpression(
        asFiltersBySpaceId(
          {
            type: AlertingAuthorizationFilterType.KQL,
            fieldNames: {
              ruleTypeId: 'path.to.rule_type_id',
              consumer: 'consumer-field',
              spaceIds: 'path.to.space.id',
            },
          },
          'space1'
        ) as KueryNode
      )
    ).toMatchInlineSnapshot(`"path.to.space.id: space1"`);
  });

  test('returns undefined if no path to spaceIds is provided', () => {
    expect(
      asFiltersBySpaceId(
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
          },
        },
        'space1'
      )
    ).toBeUndefined();
  });

  test('returns undefined if spaceId is undefined', () => {
    expect(
      asFiltersBySpaceId(
        {
          type: AlertingAuthorizationFilterType.ESDSL,
          fieldNames: {
            ruleTypeId: 'path.to.rule_type_id',
            consumer: 'consumer-field',
            spaceIds: 'path.to.space.id',
          },
        },
        undefined
      )
    ).toBeUndefined();
  });
});

describe('ensureFieldIsSafeForQuery', () => {
  test('throws if field contains character that isnt safe in a KQL query', () => {
    expect(() => ensureFieldIsSafeForQuery('id', 'alert-*')).toThrowError(
      `expected id not to include invalid character: *`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '<=""')).toThrowError(
      `expected id not to include invalid character: <=`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '>=""')).toThrowError(
      `expected id not to include invalid character: >=`
    );

    expect(() => ensureFieldIsSafeForQuery('id', '1 or alertid:123')).toThrowError(
      `expected id not to include whitespace and invalid character: :`
    );

    expect(() => ensureFieldIsSafeForQuery('id', ') or alertid:123')).toThrowError(
      `expected id not to include whitespace and invalid characters: ), :`
    );

    expect(() => ensureFieldIsSafeForQuery('id', 'some space')).toThrowError(
      `expected id not to include whitespace`
    );
  });

  test('doesnt throws if field is safe as part of a KQL query', () => {
    expect(() => ensureFieldIsSafeForQuery('id', '123-0456-678')).not.toThrow();
  });
});
