/*!
 * Unit-tests for Math Expression Evaluator
 * Copyright (c) 2017 Martin Borik <mborik@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------
import { Big } from 'big.js';
import ExpressionEvaluator from '../../src/lib/ExpressionEvaluator';
//---------------------------------------------------------------------------------------
describe('ExpressionEvaluator', () => {
	const ee = new ExpressionEvaluator();
	const _e = ee as any;

	it('was properly initiliazed', () => {
		expect(_e.valueStack).toBeDefined();
		expect(_e.valueStack.length).toBe(0);

		expect(_e.exprStack).toBeDefined();
		expect(_e.exprStack.length).toBe(0);

		expect(_e.variables).toBeDefined();
		expect(_e.variables.length).toBe(0);

		expect(_e.currentSymbol).toBe(-1);
		expect(_e.currentExpr).toBeNull();
		expect(_e.currentPos).toBe(0);
		expect(_e.lastSymbolStr).toBeNull();
		expect(_e.lastPos).toBe(0);

		expect(_e.checkAll).toBeTruthy();
	});

	describe('setVariable()', () => {
		it('should store the variable properly', () => {
			expect(() => ee.setVariable('foo', '128')).not.toThrow();
			expect(_e.variables.length).toBe(1);

			let item = _e.variables[0];
			expect(item.name).toEqual('foo');
			expect(item.value).toEqual('128');
		});

		it('should trim a heading and trailing spaces of variable name', () => {
			expect(() => ee.setVariable('\t bar\n  ', '2090.5')).not.toThrow();
			expect(_e.variables.length).toBe(2);

			let item = _e.variables[1];
			expect(item.name).toEqual('bar');
			expect(item.value).toEqual('2090.5');
		});

		it('should fail when variable name containing invalid chars', () => {
			expect(() => ee.setVariable('!#@', '1'))
				.toThrow('ExpressionEvaluator: Invalid variable name');

			expect(() => ee.setVariable('půp\n', '2'))
				.toThrow('ExpressionEvaluator: Invalid variable name');
		});

		it('should silently doing nothing with checkAll mode disabled', () => {
			_e.checkAll = false;
			expect(() => ee.setVariable('\n\t', '0')).not.toThrow();
			_e.checkAll = true;
		});

		it('should replace trimmed value of already stored variable', () => {
			expect(() => ee.setVariable('foo', '\n8.61  ')).not.toThrow();
			expect(_e.variables.length).toBe(2);

			let item = _e.variables[0];
			expect(item.name).toEqual('foo');
			expect(item.value).toEqual('8.61');
		});
	});

	describe('getVariable()', () => {
		it('should get value of stored variable', () => {
			let value: string = '';
			expect(() => {
				let v = ee.getVariable('foo');
				if (v != null) {
					value = v;
				}
			}).not.toThrow();

			expect(value).toBe('8.61');
		});

		it('should trim a heading and trailing spaces of variable name', () => {
			let value: string = '';
			expect(() => {
				let v = ee.getVariable('\t bar\n  ');
				if (v != null) {
					value = v;
				}
			}).not.toThrow();

			expect(value).toBe('2090.5');
		});

		it('should return null when variable not found OR variable name is empty with checkAll mode disabled', () => {
			expect(ee.getVariable('OMG')).toBeNull();

			_e.checkAll = false;
			expect(ee.getVariable('\n\t')).toBeNull();
			_e.checkAll = true;
		});

		it('should fail when variable name containing invalid chars', () => {
			expect(() => ee.getVariable('!#@'))
				.toThrow('ExpressionEvaluator: Invalid variable name');

			expect(() => ee.getVariable('půp\n'))
				.toThrow('ExpressionEvaluator: Invalid variable name');
		});
	});

	describe('removeVariable()', () => {
		beforeAll(() => {
			// add two vars to remove...
			ee.setVariable('djb', '"test"');
			ee.setVariable('mbr', '128');
		});

		it('should remove the stored variable', () => {
			expect(_e.variables.length).toBe(4);

			expect(() => ee.removeVariable('djb')).not.toThrow();
			expect(_e.variables.length).toBe(3);

			let item = _e.variables[2];
			expect(item.name).toEqual('mbr');
			expect(item.value).toEqual('128');
		});

		it('should trim a heading and trailing spaces of variable name', () => {
			expect(() => ee.removeVariable('\t mbr\n  ')).not.toThrow();
			expect(_e.variables.length).toBe(2);
		});

		it('should return null when variable not found OR variable name is empty with checkAll mode disabled', () => {
			expect(() => ee.removeVariable('OMG')).not.toThrow();

			_e.checkAll = false;
			expect(() => ee.removeVariable('\n\t')).not.toThrow();
			_e.checkAll = true;
		});

		it('should fail when variable name containing invalid chars', () => {
			expect(() => ee.removeVariable('!#@'))
				.toThrow('ExpressionEvaluator: Invalid variable name');

			expect(() => ee.removeVariable('půp\n'))
				.toThrow('ExpressionEvaluator: Invalid variable name');
		});
	});

	describe('clearVariables()', () => {
		it('should clear all variables', () => {
			expect(ee.clearVariables).toBeDefined();
			expect(_e.variables.length).toBe(2);

			ee.clearVariables();

			expect(_e.variables.length).toBe(0);
		});
	});

	describe('evaluate()', () => {
		beforeAll(() => {
			// add two vars to work with...
			ee.setVariable('foo', '2090.5');
			ee.setVariable('bar', '8.61');

			jasmine.addCustomEqualityTester(
				// @ts-ignore
				(haystack: any, needle: any): boolean => {
					if (haystack instanceof Big) {
						if (typeof needle === 'string') {
							return haystack.toString() === needle;
						}
						else if (typeof needle === 'number') {
							return haystack.eq(new Big(needle));
						}
					}
					else if (haystack instanceof Date && typeof needle === 'string') {
						return (haystack.toISOString().substr(0, 10) === needle);
					}
				}
			);
		});

		it('should throw an exception on empty expressions or non-string values', () => {
			expect(() => ee.evaluate('\n\t'))
				.toThrow('ExpressionEvaluator: Invalid expression');

			expect(() => _e.evaluate())
				.toThrow('ExpressionEvaluator: Invalid expression');

			expect(() => _e.evaluate(2090.5 * 8.61))
				.toThrow('ExpressionEvaluator: Invalid expression');
		});

		it('should properly parse integer', () => {
			expect(ee.evaluate('128')).toEqual(128 as any);
		});

		it('should properly parse integer with scientific E-notation', () => {
			expect(ee.evaluate('128e16')).toEqual('1280000000000000000');
		});

		it('should properly parse negative integer', () => {
			expect(ee.evaluate('-42')).toEqual(-42 as any);
		});

		it('should properly parse negative integer with negative scientific E-notation', () => {
			expect(ee.evaluate('-128e-8')).toEqual('-0.00000128');
		});

		it('should properly parse floating-point number', () => {
			expect(ee.evaluate('8.61')).toEqual(8.61 as any);
		});

		it('should properly parse negative floating-point number', () => {
			expect(ee.evaluate('-.020905')).toEqual(-2090.5e-5 as any);
		});

		it('should fail on invalid number format', () => {
			const operatorExpected = jasmine.stringMatching(': Operator expected');

			expect(() => ee.evaluate('.12.8')).toThrow(operatorExpected);
			expect(() => ee.evaluate('12E8e16')).toThrow(operatorExpected);

			const invalidNumberEx = jasmine.stringMatching(': Invalid number');

			expect(() => ee.evaluate('12e8.16')).toThrow(invalidNumberEx);
			expect(() => ee.evaluate('.12e-~8')).toThrow(invalidNumberEx);
		});

		it('should properly parse simple string in double or single quotes', () => {
			expect(ee.evaluate('"foo"')).toEqual('foo');
			expect(ee.evaluate("'bar'")).toEqual('bar');
		});

		it('should properly parse string containing control chars and unicode', () => {
			expect(ee.evaluate('"\\t- foo\\n\\t- bar\\r🦄"')).toEqual('\t- foo\n\t- bar\r🦄');
		});

		it('should properly parse string containing inner quotes', () => {
			expect(ee.evaluate('"\'foo\\""')).toEqual("'foo\"");
			expect(ee.evaluate("'\"bar\\''")).toEqual('"bar\'');
		});

		it('should fail on unexpected end of string', () => {
			expect(() => ee.evaluate('"foo'))
				.toThrow(jasmine.stringMatching(': Unexpeced end of expression'));
		});

		it('should fail on attempt of negation of string value', () => {
			expect(() => ee.evaluate('-"bar"'))
				.toThrow(jasmine.stringMatching(': Unable to negate this value type'));
		});

		it('should properly parse date string in ISO and EU formats', () => {
			expect(ee.evaluate('{2014-10-11}')).toEqual('2014-10-11');
			expect(ee.evaluate('{7.2.1983}')).toEqual('1983-02-07');
		});

		it('should fail if date expression containing invalid chars', () => {
			expect(() => ee.evaluate('{14:08}'))
				.toThrow(jasmine.stringMatching(': Invalid char in date format'));

			expect(() => ee.evaluate('{Last Christmas}'))
				.toThrow(jasmine.stringMatching(': Invalid char in date format'));
		});

		it('should fail on unexpected end of date expression', () => {
			expect(() => ee.evaluate('{2011'))
				.toThrow(jasmine.stringMatching(': Unexpeced end of expression'));
		});

		it('should fail on attempt of negation of date expression', () => {
			expect(() => ee.evaluate('-{17.11.1989}'))
				.toThrow(jasmine.stringMatching(': Unable to negate this value type'));
		});

		it('should properly parse variable name and returns its value', () => {
			expect(ee.evaluate('foo')).toEqual(2090.5 as any);
		});

		it('should properly negate a numeric value of given variable', () => {
			expect(ee.evaluate('-bar')).toEqual(-8.61 as any);
		});

		it('should fail when variable is not found', () => {
			expect(() => ee.evaluate('OMG'))
				.toThrow(jasmine.stringMatching(': Variable not found'));
		});

		it('should fail when reserved keywords are used as variable', () => {
			expect(() => ee.evaluate('and'))
				.toThrow(jasmine.stringMatching(': Unexpected symbol'));
			expect(() => ee.evaluate('or'))
				.toThrow(jasmine.stringMatching(': Unexpected symbol'));
		});

		it('should fail on unexpected symbol', () => {
			expect(() => ee.evaluate('~'))
				.toThrow(jasmine.stringMatching(': Unexpected symbol'));
		});

		it('should prevent itself from unwanted recursion', () => {
			ee.setVariable('foo', 'foo + foo');
			expect(() => ee.evaluate('foo'))
				.toThrow(jasmine.stringMatching(': Stack overflow'));
		});

		afterAll(() => ee.clearVariables());
	});
});
