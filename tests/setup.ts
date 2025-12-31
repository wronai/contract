/**
 * Jest Global Setup
 */

// Extend Jest matchers
expect.extend({
  toBeValidAST(received) {
    const pass = received && 
                 received.type === 'Program' && 
                 Array.isArray(received.statements);
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid AST`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid AST with type 'Program' and statements array`,
        pass: false
      };
    }
  },
  
  toHaveValidationError(received, errorCode) {
    const hasError = received.errors?.some((e: any) => e.code === errorCode);
    
    if (hasError) {
      return {
        message: () => `expected validation result not to have error ${errorCode}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected validation result to have error ${errorCode}, but got: ${JSON.stringify(received.errors)}`,
        pass: false
      };
    }
  }
});

// Global test timeout
jest.setTimeout(30000);

// Suppress console during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidAST(): R;
      toHaveValidationError(errorCode: string): R;
    }
  }
}

export {};
