// obix-config-jest — state-machine-performance-reporter.js (ESM)
// Converted from CJS to ESM to align with "type": "module".
// Custom Jest reporter for collecting automaton state minimization performance metrics.
//
// Wire it up in jest.config.js:
//   reporters: ['default', 'obix-config-jest/reporter']
// Or reference the performance subdirectory config which includes it automatically.

import fs from 'node:fs';
import path from 'node:path';

/**
 * Custom Jest reporter for tracking OBIX state machine performance metrics.
 * Aggregates per-test timing data and writes a JSON report to
 * `reports/performance/state-machine-performance-<timestamp>.json`.
 */
export default class StateMachinePerformanceReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options ?? {};
    this._startTime = 0;

    this._metrics = {
      testSuites: [],
      summary: {
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        totalSkipped: 0,
        totalDuration: 0,

        // State machine specific metrics
        stateMinimizationAvgTime: 0,
        equivalenceClassComputeAvgTime: 0,
        transitionOptimizationAvgTime: 0,
        stateReductionAvgRatio: 0,

        smallMachineAvgTime: 0,    // <= 10 states
        mediumMachineAvgTime: 0,   // 11–100 states
        largeMachineAvgTime: 0,    // > 100 states
      },
    };

    this._stateMachineMetricsCount = 0;
  }

  onRunStart() {
    console.log('\nState Machine Performance Reporter initialized');
    this._startTime = Date.now();
  }

  onTestStart(_test) {
    // No action needed at test-start
  }

  onTestResult(test, testResult) {
    const { numPassingTests, numFailingTests, numPendingTests, testResults, perfStats } = testResult;
    const duration = perfStats.end - perfStats.start;

    this._metrics.summary.totalTests += testResults.length;
    this._metrics.summary.totalPassed += numPassingTests;
    this._metrics.summary.totalFailed += numFailingTests;
    this._metrics.summary.totalSkipped += numPendingTests;
    this._metrics.summary.totalDuration += duration;

    const testSuite = {
      name: test.path,
      duration,
      tests: [],
      summary: {
        passed: numPassingTests,
        failed: numFailingTests,
        skipped: numPendingTests,
        total: testResults.length,
      },
      stateMachineMetrics: [],
    };

    for (const result of testResults) {
      if (result.title.includes('state machine') || result.title.includes('automaton')) {
        const stateMetrics = this.extractStateMachineMetrics(result);

        if (stateMetrics) {
          testSuite.stateMachineMetrics.push(stateMetrics);

          if (stateMetrics.stateCount <= 10) {
            this._updateAverage('smallMachineAvgTime', stateMetrics.minimizationTime);
          } else if (stateMetrics.stateCount <= 100) {
            this._updateAverage('mediumMachineAvgTime', stateMetrics.minimizationTime);
          } else {
            this._updateAverage('largeMachineAvgTime', stateMetrics.minimizationTime);
          }

          this._updateAverage('stateMinimizationAvgTime', stateMetrics.minimizationTime);
          this._updateAverage('equivalenceClassComputeAvgTime', stateMetrics.equivalenceClassTime);
          this._updateAverage('transitionOptimizationAvgTime', stateMetrics.transitionTime);
          this._updateAverage('stateReductionAvgRatio', stateMetrics.stateReductionRatio);
        }
      }

      testSuite.tests.push({
        title: result.title,
        status: result.status,
        duration: result.duration,
      });
    }

    this._metrics.testSuites.push(testSuite);
  }

  onRunComplete(_contexts, _results) {
    const totalDuration = Date.now() - this._startTime;
    const s = this._metrics.summary;

    console.log('\nState Machine Performance Report:');
    console.log('─'.repeat(40));
    console.log(`Total test suites : ${this._metrics.testSuites.length}`);
    console.log(`Tests             : ${s.totalTests} (${s.totalPassed} passed, ${s.totalFailed} failed, ${s.totalSkipped} skipped)`);
    console.log(`Total duration    : ${totalDuration}ms`);
    console.log('\nState Machine Optimisation Metrics:');
    console.log(`  Minimisation avg time     : ${s.stateMinimizationAvgTime.toFixed(2)}ms`);
    console.log(`  Equivalence class avg time: ${s.equivalenceClassComputeAvgTime.toFixed(2)}ms`);
    console.log(`  Transition opt avg time   : ${s.transitionOptimizationAvgTime.toFixed(2)}ms`);
    console.log(`  State reduction avg ratio : ${(s.stateReductionAvgRatio * 100).toFixed(2)}%`);
    console.log('\nPerformance by machine size:');
    console.log(`  Small  (≤10 states)   : ${s.smallMachineAvgTime.toFixed(2)}ms`);
    console.log(`  Medium (11–100 states): ${s.mediumMachineAvgTime.toFixed(2)}ms`);
    console.log(`  Large  (>100 states)  : ${s.largeMachineAvgTime.toFixed(2)}ms`);

    this._writeReport();
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Extract state machine metrics from a single test result.
   * Reads from `global.__STATE_MACHINE_METRICS__` and resets it afterwards.
   *
   * @param {{ title: string }} testResult
   * @returns {object|null}
   */
  extractStateMachineMetrics(testResult) {
    if (!global.__STATE_MACHINE_METRICS__) return null;

    const metrics = global.__STATE_MACHINE_METRICS__.getReport();
    global.__STATE_MACHINE_METRICS__.reset();

    const minimizationOp = metrics.operations.find((op) => op.name === 'minimizeStateMachine');
    const equivalenceClassOp = metrics.operations.find((op) => op.name === 'computeEquivalenceClasses');
    const transitionOp = metrics.operations.find((op) => op.name === 'optimizeTransitions');

    const stateCounts = testResult.title.match(/(\d+)\s+states?/i);
    const stateCount = stateCounts ? parseInt(stateCounts[1], 10) : 0;

    const resultCounts = testResult.title.match(/reduced to (\d+)\s+states?/i);
    const resultCount = resultCounts ? parseInt(resultCounts[1], 10) : 0;

    const stateReductionRatio =
      stateCount > 0 && resultCount > 0 ? (stateCount - resultCount) / stateCount : 0;

    return {
      testTitle: testResult.title,
      stateCount,
      resultCount,
      stateReductionRatio,
      minimizationTime: minimizationOp?.duration ?? 0,
      equivalenceClassTime: equivalenceClassOp?.duration ?? 0,
      transitionTime: transitionOp?.duration ?? 0,
      totalTime: metrics.totalDuration,
    };
  }

  /**
   * Update a running average in the summary metrics.
   *
   * @param {string} metricName
   * @param {number} newValue
   */
  _updateAverage(metricName, newValue) {
    const count = this._stateMachineMetricsCount;
    const current = this._metrics.summary[metricName] ?? 0;
    this._metrics.summary[metricName] =
      count === 0 ? newValue : (current * count + newValue) / (count + 1);
    this._stateMachineMetricsCount = count + 1;
  }

  /** Write the JSON performance report to disk. */
  _writeReport() {
    const reportsDir = path.resolve(process.cwd(), 'reports', 'performance');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const reportPath = path.join(reportsDir, `state-machine-performance-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(this._metrics, null, 2));
    console.log(`\nDetailed report written to: ${reportPath}`);
  }
}
