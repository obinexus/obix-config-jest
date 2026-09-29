// obix-config-jest — jest.setup.js
// Custom Jest matchers and global utilities for OBIX state machine testing.
// Loaded via setupFilesAfterFramework in jest.config.js.
//
// Provides:
//   - toBeMinimizedStateMachine(expected?)  — checks state machine minimization
//   - toBeEquivalentState(other)            — checks state equivalence
//   - global.__STATE_MACHINE_METRICS__      — performance timing API
//   - global.createTestStateMachine(n, t)   — factory for mock state machines

// ─── Custom matchers ──────────────────────────────────────────────────────────

expect.extend({
  /**
   * Custom matcher: checks if a state machine has been properly minimized.
   *
   * @param {object} received - The state machine instance to check
   * @param {{ stateCount?: number, transitionCount?: number, equivalenceClassCount?: number }} [expected]
   */
  toBeMinimizedStateMachine(received, expected) {
    if (!expected) {
      const isMinimized = received.isMinimized === true;
      return {
        message: () =>
          `expected ${this.utils.printReceived(received)} ${
            isMinimized ? 'not ' : ''
          }to be a minimized state machine`,
        pass: isMinimized,
      };
    }

    const { stateCount, transitionCount, equivalenceClassCount } = expected;
    const actualStateCount = received.states ? received.states.size : 0;
    const actualTransitionCount = Array.from(received.states || []).reduce(
      (count, state) => count + (state.transitions?.size || 0),
      0,
    );
    const actualEquivalenceClassCount = received.equivalenceClasses?.size || 0;

    const statesMatch = stateCount === undefined || actualStateCount === stateCount;
    const transitionsMatch = transitionCount === undefined || actualTransitionCount === transitionCount;
    const classesMatch =
      equivalenceClassCount === undefined ||
      actualEquivalenceClassCount === equivalenceClassCount;

    const pass = statesMatch && transitionsMatch && classesMatch;

    return {
      message: () => {
        let result = `expected ${this.utils.printReceived(received)} to be a minimized state machine with:\n`;
        if (stateCount !== undefined)
          result += `  ${statesMatch ? '✓' : '✗'} ${stateCount} states (got ${actualStateCount})\n`;
        if (transitionCount !== undefined)
          result += `  ${transitionsMatch ? '✓' : '✗'} ${transitionCount} transitions (got ${actualTransitionCount})\n`;
        if (equivalenceClassCount !== undefined)
          result += `  ${classesMatch ? '✓' : '✗'} ${equivalenceClassCount} equivalence classes (got ${actualEquivalenceClassCount})\n`;
        return result;
      },
      pass,
    };
  },

  /**
   * Custom matcher: checks if two states are equivalent (same equivalence class
   * or same transition alphabet).
   *
   * @param {object} received - First state
   * @param {object} other    - Second state to compare with
   */
  toBeEquivalentState(received, other) {
    const sameClass =
      received.equivalenceClass !== null &&
      other.equivalenceClass !== null &&
      received.equivalenceClass === other.equivalenceClass;

    if (sameClass) {
      return {
        message: () =>
          `expected ${this.utils.printReceived(received)} ${
            sameClass ? 'not ' : ''
          }to be equivalent to ${this.utils.printExpected(other)}`,
        pass: sameClass,
      };
    }

    const sameTransitions = this.equals(
      Array.from(received.transitions || []).map(([symbol]) => symbol),
      Array.from(other.transitions || []).map(([symbol]) => symbol),
    );

    return {
      message: () =>
        `expected ${this.utils.printReceived(received)} ${
          sameTransitions ? 'not ' : ''
        }to be equivalent to ${this.utils.printExpected(other)}`,
      pass: sameTransitions,
    };
  },
});

// ─── Global performance metrics ───────────────────────────────────────────────

/**
 * Global state machine performance metrics tracker.
 * Tests use this to record timing; StateMachinePerformanceReporter reads it.
 *
 * @example
 * global.__STATE_MACHINE_METRICS__.startOperation('minimizeStateMachine');
 * minimizeStateMachine(sm);
 * global.__STATE_MACHINE_METRICS__.endOperation();
 */
global.__STATE_MACHINE_METRICS__ = {
  startTime: null,
  endTime: null,
  operations: [],

  startOperation(name) {
    this.operations.push({
      name,
      startTime: performance.now(),
      endTime: null,
      duration: null,
    });
  },

  endOperation() {
    const currentOp = this.operations[this.operations.length - 1];
    if (currentOp) {
      currentOp.endTime = performance.now();
      currentOp.duration = currentOp.endTime - currentOp.startTime;
    }
  },

  getReport() {
    return {
      operations: this.operations,
      totalDuration: this.operations.reduce((sum, op) => sum + (op.duration || 0), 0),
    };
  },

  reset() {
    this.startTime = null;
    this.endTime = null;
    this.operations = [];
  },
};

// ─── Global test utilities ────────────────────────────────────────────────────

/**
 * Factory for creating mock OBIX state machines in tests.
 *
 * @param {number} stateCount          - Number of states to create
 * @param {number} [transitionsPerState=2] - Transitions per state
 * @returns {{ states: Map, initialState: string, equivalenceClasses: Map, isMinimized: boolean }}
 */
global.createTestStateMachine = (stateCount, transitionsPerState = 2) => {
  return {
    states: new Map(
      [...Array(stateCount).keys()].map((i) => [
        `state${i}`,
        {
          id: `state${i}`,
          transitions: new Map(
            [...Array(transitionsPerState).keys()].map((j) => [
              `transition${j}`,
              `state${(i + j + 1) % stateCount}`,
            ]),
          ),
          value: { data: `Value for state ${i}` },
          equivalenceClass: null,
        },
      ]),
    ),
    initialState: 'state0',
    equivalenceClasses: new Map(),
    isMinimized: false,
  };
};

// ─── DOM mock ─────────────────────────────────────────────────────────────────

if (typeof document === 'undefined') {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.attributes = {};
      this.style = {};
      this.textContent = '';
      this.innerHTML = '';
    }

    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name]; }
    appendChild(child) { this.children.push(child); return child; }
  }

  global.document = {
    createElement: (tag) => new MockElement(tag),
    createTextNode: (text) => ({ textContent: text }),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

// ─── Console silencing ────────────────────────────────────────────────────────

if (!process.env.VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// ESM module marker
export {};
