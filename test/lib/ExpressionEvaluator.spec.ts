import ExpressionEvaluator from '../../src/lib/ExpressionEvaluator';

describe('ExpressionEvaluator', () => {
	// any used to test also private members...
	let ee: any = new ExpressionEvaluator();

	it('was properly initiliazed', () => {
		expect(ee.valueStack).toBeDefined();
		expect(ee.valueStack.length).toBe(0);

		expect(ee.exprStack).toBeDefined();
		expect(ee.exprStack.length).toBe(0);

		expect(ee.variables).toBeDefined();
		expect(ee.variables.length).toBe(0);

		expect(ee.currentSymbol).toBe(-1);
		expect(ee.currentExpr).toBeNull();
		expect(ee.currentPos).toBe(0);
		expect(ee.lastSymbolStr).toBeNull();
		expect(ee.lastPos).toBe(0);

		expect(ee.checkAll).toBeTruthy();
	});
});
