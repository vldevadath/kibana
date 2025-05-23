/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { InfraFeatureId } from '../../../common/constants';
import { createRuleDataClient } from './rule_data_client';
import type {
  RuleRegistrationContext,
  RulesServiceSetup,
  RulesServiceSetupDeps,
  RulesServiceStart,
  RulesServiceStartDeps,
} from './types';

export class RulesService {
  constructor(
    public readonly ownerFeatureId: InfraFeatureId,
    public readonly registrationContext: RuleRegistrationContext,
    private readonly logger: Logger
  ) {}

  public setup(
    core: CoreSetup<RulesServiceStartDeps>,
    setupDeps: RulesServiceSetupDeps
  ): RulesServiceSetup {
    const ruleDataClient = createRuleDataClient({
      getStartServices: core.getStartServices,
      logger: this.logger,
      ownerFeatureId: this.ownerFeatureId,
      registrationContext: this.registrationContext,
      ruleDataService: setupDeps.ruleRegistry.ruleDataService,
    });

    return { ruleDataClient };
  }

  public start(_startDeps: RulesServiceStartDeps): RulesServiceStart {
    return {};
  }
}
