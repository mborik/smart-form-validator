/*!
 * Math Expression Evaluator
 * Copyright (c) 2011 Martin Borik <mborik@users.sourceforge.net>
 * Copyright (c) 2017 Typescriptified and modular, slightly improved version.
 * Semantics & gramatics inspired by original code Copyright (c) 2008 Roman Borik.
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
import { Big, RoundingMode } from 'big.js';
import moment from 'moment';
//---------------------------------------------------------------------------------------
const ExpEvalStackLimit = 32;
const enum ExpEvalSymbol {
	UNDEFINED = -1,
	VAR = 1,
	NUMBER,
	STRING,
	DATE,
	PLUS,
	MINUS,
	ASTERISK,
	SLASH,
	LPAR,
	RPAR,
	RELATION,
	LOGICAL_AND,
	LOGICAL_OR,
	COMMA,
	SEMICOLON,
	EOE,
	FUNCTION = 100
}
declare type ExpEvalMultiType = Big | String | Date;
declare type ExpEvalFunctionHandler = (() => ExpEvalMultiType);
//---------------------------------------------------------------------------------------
interface ExpEvalFunction {
	symbol: number;
	name: string;
	handler: ExpEvalFunctionHandler;
}
interface ExpEvalVariable {
	name: string;
	value: string;
}
interface ExpEvalStateKeeper {
	curPos: number;
	symbol: string | null;
	lastPos: number;
}
interface ExpEvalExprStackItem {
	pos: number;
	expr: string | null;
}
//---------------------------------------------------------------------------------------
export default class ExpressionEvaluator {
	[key: string]: any;

	// stack of values - intermediate data
	private valueStack: ExpEvalMultiType[] = [];
	// stack of (sub)expressions
	private exprStack: ExpEvalExprStackItem[] = [];
	// function names with their symbol codes
	private funcNames: ExpEvalFunction[] = [
		'var',
		'if',
		'logic',
		'round',
		'abs',
		'max',
		'min',
		'int',
		'length',
		'substr'
	].map((name, i) => ({
		name: name,
		symbol: ExpEvalSymbol.FUNCTION + i,
		handler: <ExpEvalFunctionHandler> this['function_' + name]
	}));

	// map of variables/subexpressions
	public variables: ExpEvalVariable[] = [];

	private currentSymbol: ExpEvalSymbol = ExpEvalSymbol.UNDEFINED;
	private currentExpr: string | null = null;
	private currentPos: number = 0;
	private lastSymbolStr: string | null = null;
	private lastPos: number = 0;

	private checkAll: boolean = true;


	getVariable(name: string | null): string | null {
		if (name != null) {
			let match = this.variables.find(variable => (variable.name === name));
			if (match != null) {
				return match.value.trim();
			}
		}
		return null;
	}

	/**
	 * Method evaluates expression. Expression can contain variables
	 * (subexpressions) that must be prepared in advance by contructor.
	 *
	 * Gramatics of the expression:
	 * EXPR -> MULT { ( + | - ) MULT }
	 * MULT -> TERM { ( * | / ) TERM }
	 * TERM -> [ "-" ] ( "(" EXPR ")" ) | VAR | FLT | STR | FUNC
	 * VAR  -> C { C | D }
	 * FLT  -> [ NUM ] [ "." ] NUM
	 * STR  -> ( ' | " ) . . . ( ' | " )
	 * FUNC -> var(STR, EXPR) | if(LEXP, EXPR, EXPR) | logic(LEXP)
	 *       | round(EXPR, [ "-" ] FLT, CONSTANT) | abs(EXPR)
	 *       | max(EXPR [{ "," EXPR }]) | min(EXPR [{ "," EXPR }])
	 *       | length(VAR | STR)
	 * LEXP -> EXPR LOP EXPR
	 * LOP  -> ( ( "=" | "<" | ">" ) [ "=" ] ) | ( "!=" | "<>" )
	 * NUM  -> D { D }
	 * C    -> "a" | . . . | "z" | "A" | . . . | "Z" | "_"
	 * D    -> "0" | . . . | "9"
	 */
	public evaluate(expr: string) {
		if (!(typeof expr === 'string' && (expr = expr.trim()).length)) {
			throw this.error('Invalid expression');
		}

		this.currentExpr = expr;
		this.currentPos = 0;

		this.exprStack.splice(0); // clear stacks
		this.valueStack.splice(0);

		performance.mark('eval-start');

		let loop: boolean;
		do {
			loop = false;
			this.getSymbol();
			this.evaluateExpr();

			if (this.currentSymbol === ExpEvalSymbol.SEMICOLON) {
				const keeper: ExpEvalStateKeeper = {
					curPos: this.currentPos,
					symbol: this.lastSymbolStr,
					lastPos: this.lastPos
				};

				this.getSymbol();

				// @ts-ignore: eval comparison warning
				if (this.currentSymbol !== ExpEvalSymbol.EOE) {
					this.currentPos = keeper.curPos;
					this.lastSymbolStr = keeper.symbol;
					this.lastPos = keeper.lastPos;
					loop = true;
				}
			}
		} while (loop);

		performance.mark('eval-end');
		performance.measure(
			'ExpressionEvaluator',
			'eval-start',
			'eval-end'
		);

		if (this.currentSymbol !== ExpEvalSymbol.EOE) {
			throw this.error('Operator expected');
		}

		return this.valueStack.pop();
	}

	/**
	 * Removes all variables.
	 */
	public clearVariables(): void {
		this.variables.splice(0);
	}

	/**
	 * Removes the variable of given name.
	 * Returns the previous value of the variable, or null if the variable not exist.
	 */
	public removeVariable(name: string): void {
		this.variables = this.variables.filter(value => !(value.name === name));
	}

	/**
	 * Adds variable to list. If variable with given name exist, old value will be
	 * replaced with new value.
	 */
	public setVariable(name: string, value: string): void {
	}

	/**
	 * Method gets one character from current expression.
	 * Return one character from current expression or EOE constant
	 * when end of expression is reached.
	 */
	private getChar(): string {
		if (this.currentExpr == null) {
			throw this.error('Expression undefined');
		}

		if (this.currentPos >= this.currentExpr.length) {
			if (this.currentPos === this.currentExpr.length) {
				this.currentPos++;
			}
			return '¶'; // end of expression
		}

		return this.currentExpr.charAt(this.currentPos++);
	}

	/**
	 * Method shifts back current position in the current expression.
	 */
	private ungetChar(): void {
		if (this.currentExpr == null ||
			this.currentPos <= 0 ||
			this.currentPos > this.currentExpr.length) {

			return; // begin || end of expression || error
		}

		this.currentPos--;
	}

	/**
	 * Method that do a Lexical analysis.
	 * Char by char moves by current expression string and if recognizes
	 * lexical symbol, it setting up class variables.
	 */
	getSymbol(): void {
		this.currentSymbol = ExpEvalSymbol.UNDEFINED;
		this.lastSymbolStr = '';

		let chr: string;
		let loop: boolean;

		do {
			loop = false;
			this.lastPos = this.currentPos;

			chr = this.getChar();
			if (/\s/.test(chr)) { // skip blanks
				loop = true;
				continue;
			}

			switch (chr) {
				case '¶' :
					this.currentSymbol = ExpEvalSymbol.EOE;
					break;
				case '+' :
					this.currentSymbol = ExpEvalSymbol.PLUS;
					break;
				case '-' :
					this.currentSymbol = ExpEvalSymbol.MINUS;
					break;
				case '*' :
					this.currentSymbol = ExpEvalSymbol.ASTERISK;
					break;
				case '/' :
					this.currentSymbol = ExpEvalSymbol.SLASH;
					break;
				case '(' :
					this.currentSymbol = ExpEvalSymbol.LPAR;
					break;
				case ')' :
					this.currentSymbol = ExpEvalSymbol.RPAR;
					break;
				case ',' :
					this.currentSymbol = ExpEvalSymbol.COMMA;
					break;
				case ';' :
					this.currentSymbol = ExpEvalSymbol.SEMICOLON;
					break;

				// strings
				case '"' :
				case "'" : {
					let openChr = chr;
					this.lastSymbolStr = '';

					do {
						chr = this.getChar();
						if (chr === '¶') {
							throw this.error('Unexpeced end of expression');
						}
						else if (chr === '\\') {
							chr = this.getChar();
							switch (chr) {
								case 'n': chr = '\n'; break;
								case 'r': chr = '\r'; break;
								case 't': chr = '\t'; break;
								default: break;
							}
						}
						else if (chr === openChr) {
							break;
						}

						this.lastSymbolStr += chr;
					} while (true);

					this.currentSymbol = ExpEvalSymbol.STRING;
					break;
				}

				// dates
				case '{' : {
					this.lastSymbolStr = '';

					do {
						chr = this.getChar();
						if (chr === '¶') {
							throw this.error('Unexpeced end of expression');
						}
						else if (chr === '}') {
							break;
						}
						else if (!/[0-9\-\.]/.test(chr)) {
							throw this.error('Invalid char in date format');
						}

						this.lastSymbolStr += chr;
					} while (true);

					this.currentSymbol = ExpEvalSymbol.DATE;
					break;
				}

				// relation
				case '=' :
				case '<' :
				case '>' :
				case '!' : {
					this.lastSymbolStr = chr;
					chr = this.getChar();
					if (chr === '=' || chr === '>') {
						this.lastSymbolStr += chr;
						this.currentSymbol = ExpEvalSymbol.RELATION;
					}
					else if ('=<>'.indexOf(this.lastSymbolStr) >= 0) {
						this.ungetChar();
						this.currentSymbol = ExpEvalSymbol.RELATION;
					}
					else {
						this.ungetChar();
						this.currentSymbol = ExpEvalSymbol.UNDEFINED;
					}
					break;
				}

				// logical
				case '|' :
				case '&' : {
					this.lastSymbolStr = chr;
					this.currentSymbol = (chr === '&' ?
							ExpEvalSymbol.LOGICAL_AND : ExpEvalSymbol.LOGICAL_OR);

					chr = this.getChar();
					if (chr === this.lastSymbolStr) {
						this.lastSymbolStr += chr;
					}
					else {
						this.ungetChar();
					}
					break;
				}

				default : {
					// numbers
					if (/[0-9\.]/.test(chr)) {
						let wasPoint = (chr === '.');
						this.lastSymbolStr = '' + chr;

						do {
							chr = this.getChar();
							if (!/[0-9\.]/.test(chr)) {
								break;
							}
							if (chr === '.') {
								if (wasPoint) { // multiple points in number?
									break;
								}
								wasPoint = true;
							}

							this.lastSymbolStr += chr;
						} while (true);

						this.ungetChar();
						this.currentSymbol = (this.lastSymbolStr !== '.') ?
								ExpEvalSymbol.NUMBER : ExpEvalSymbol.UNDEFINED;
					}
					// variables, function names or logical operator statement
					else if (/[a-z]/i.test(chr)) {
						this.lastSymbolStr = chr;
						do {
							chr = this.getChar();
							if (!/\w\[]/.test(chr)) {
								break;
							}
							this.lastSymbolStr += chr;
						} while (true);

						this.ungetChar();

						let symbol = this.lastSymbolStr.toLowerCase();
						if (symbol === 'and') {
							this.currentSymbol = ExpEvalSymbol.LOGICAL_AND;
						}
						else if (symbol === 'or') {
							this.currentSymbol = ExpEvalSymbol.LOGICAL_OR;
						}
						else if (chr === '(') {
							let fn = this.funcNames.find(fn => fn.name === symbol);
							if (fn != null) {
								this.currentSymbol = fn.symbol;
							}
							else {
								throw this.error('Undefined function');
							}
						}
						else {
							this.currentSymbol = ExpEvalSymbol.VAR;
						}

					}
					else {
						this.currentSymbol = ExpEvalSymbol.UNDEFINED;
					}

					break;
				}
			}
		} while (loop);

		if (this.currentSymbol < ExpEvalSymbol.FUNCTION &&
			this.currentSymbol > ExpEvalSymbol.DATE &&
			this.currentSymbol !== ExpEvalSymbol.RELATION) {

			this.lastSymbolStr = '' + chr;
		}
	}

	/**
	 * Method evaluates EXPR on the current position of the current expression.
	 * Gramatics of the EXPR:
	 * EXPR -> MULT { ( + | - ) MULT }
	 */
	evaluateExpr(): void {
		// maximum depth of value and expression stack
		if (this.valueStack.length > ExpEvalStackLimit ||
			this.exprStack.length > ExpEvalStackLimit) {

			throw this.error('Stack overflow (unwanted recursion?)');
		}

		this.evaluateMult();
		while (this.currentSymbol === ExpEvalSymbol.PLUS ||
				this.currentSymbol === ExpEvalSymbol.MINUS) {

			let sym = this.currentSymbol;
			this.getSymbol();
			this.evaluateMult();

			let o2 = this.valueStack.pop();
			let o1 = this.valueStack.pop();

			let r: ExpEvalMultiType | undefined;

			try {
				if (sym === ExpEvalSymbol.PLUS) {
					if (o1 instanceof Big && o2 instanceof Big) {
						r = o1.plus(o2);
					}
					else if (o1 instanceof Date && o2 instanceof Big) {
						let shift = o2.round(0, RoundingMode.RoundHalfUp).toString();
						r = moment(o1).add(shift, 'days').toDate();
					}
					else if (o1 instanceof Big && o2 instanceof String) {
						r = new String(o1.toString() + o2);
					}
					else if (o1 instanceof String && o2 instanceof Big) {
						r = new String(o1 + o2.toString());
					}
					else if (o1 instanceof String && o2 instanceof String) {
						r = new String(o1 + '' + o2);
					}
					else if (o1 instanceof String && o2 instanceof Date) {
						let dateString = moment(o2).format('L');
						r = new String(o1 + dateString);
					}
					else {
						throw this.error('Invalid value type');
					}
				}
				else {
					if (o1 instanceof Big && o2 instanceof Big) {
						r = o1.minus(o2);
					}
					else if (o1 instanceof Date && o2 instanceof Big) {
						let shift = o2.round(0, RoundingMode.RoundHalfUp).toString();
						r = moment(o1).subtract(shift, 'days').toDate();
					}
					else {
						throw this.error('Invalid value type');
					}
				}
			}
			catch (e) {
				if (this.checkAll) {
					throw e;
				}
				else {
					r = o1;
				}
			}

			if (r) {
				this.valueStack.push(r);
			}
		}

		if (this.currentSymbol === ExpEvalSymbol.UNDEFINED && this.checkAll) {
			throw this.error('Unknown symbol');
		}
	}

	/**
	 * Method evaluates MULT on the current position of the current expression.
	 * Gramatics of the MULT:
	 * MULT -> TERM { ( * | / ) TERM }
	 */
	private evaluateMult() {
		this.evaluateTerm();
		while (this.currentSymbol === ExpEvalSymbol.ASTERISK ||
				this.currentSymbol === ExpEvalSymbol.SLASH) {

			let sym = this.currentSymbol;
			this.getSymbol();
			this.evaluateTerm();

			let o2 = this.valueStack.pop();
			let o1 = this.valueStack.pop();

			let r: ExpEvalMultiType | undefined;

			try {
				if (o1 instanceof Big && o2 instanceof Big) {
					if (sym === ExpEvalSymbol.ASTERISK) {
						r = o1.times(o2); // multiply
					}
					else {
						r = o1.div(o2); // divide
					}
				}
				else {
					throw this.error('Invalid value type');
				}
			}
			catch (e) {
				if (this.checkAll) {
					throw e;
				}
				else {
					r = o1;
				}
			}

			if (r) {
				this.valueStack.push(r);
			}
		}
	}

	/**
	 * Method evaluates TERM on the current position of the current expression.
	 * Gramatics of the TERM:
	 * TERM -> [ "-" ] ( "(" EXPR ")" ) | VAR | FLT | FUNC
	 * VAR  -> C { C | D }
	 * FLT  -> [ NUM ] [ "." ] NUM
	 * STR  -> ( ' | " ) . . . ( ' | " )
	 * FUNC -> var(STR, EXPR) | if(LEXP, EXPR, EXPR) | logic(LEXP)
	 *       | round(EXPR, [ "-" ] FLT, CONSTANT) | abs(EXPR)
	 *       | max(EXPR [{ "," EXPR }]) | min(EXPR [{ "," EXPR }])
	 *       | length(VAR | STR)
	 * LEXP -> EXPR LOP EXPR
	 * LOP  -> ( ( "=" | "<" | ">" ) [ "=" ] ) | ( "!=" | "<>" )
	 * NUM  -> D { D }
	 * C    -> "a" | . . . | "z" | "A" | . . . | "Z" | "_"
	 * D    -> "0" | . . . | "9"
	 */
	evaluateTerm() {
		let neg = false;

		if (this.currentSymbol === ExpEvalSymbol.MINUS) {
			neg = true;
			this.getSymbol();
		}

		if (this.lastSymbolStr == null) {
			throw this.error('Invalid symbol');
		}

		switch (this.currentSymbol) {
			case ExpEvalSymbol.LPAR : {
				this.getSymbol();
				this.evaluateExpr();

				// @ts-ignore: eval comparison warning
				if (this.currentSymbol !== ExpEvalSymbol.RPAR) {
					throw this.error('Right parenthesis expected');
				}
				break;
			}

			case ExpEvalSymbol.VAR : {
				let str = this.getVariable(this.lastSymbolStr);
				if (!str) {
					throw this.error('Variable not found');
				}

				this.exprStack.push({
					expr: this.currentExpr,
					pos: this.currentPos
				});

				this.currentExpr = str;
				this.currentPos = 0;
				this.getSymbol();
				this.evaluateExpr();

				let pop = this.exprStack.pop();
				if (!pop) {
					throw this.error('Stack lost');
				}

				this.currentExpr = pop.expr;
				this.currentPos  = pop.pos;
				break;
			}

			case ExpEvalSymbol.NUMBER :
				this.valueStack.push(new Big(this.lastSymbolStr));
				break;

			case ExpEvalSymbol.STRING :
				this.valueStack.push(new String(this.lastSymbolStr));
				break;

			case ExpEvalSymbol.DATE : {
				let r: Date | undefined;

				try {
					r = moment(this.lastSymbolStr.trim(), [
						'x', 'YYYY-MM-DD', 'DD.MM.YYYY'
					]).add(12, 'hours').toDate();
				}
				catch {
					if (this.checkAll) {
						throw this.error('Invalid date format');
					}
					else {
						r = new Date();
					}
				}

				if (r) {
					this.valueStack.push(r);
				}
				break;
			}

			case ExpEvalSymbol.EOE : {
				this.lastPos--;
				throw this.error('Unexpeced end of expression');
			}

			default : {
				if (this.currentSymbol >= ExpEvalSymbol.FUNCTION) {
					let fn = this.funcNames.find(fn => fn.symbol === this.currentSymbol);
					if (fn != null) {
						let r = fn.handler();
						this.valueStack.push(r);
						break;
					}
				}

				throw this.error('Unexpeced symbol');
			}
		}

		if (neg) {
			let value = this.valueStack.pop();
			if (value instanceof Big) {
				(<any> value).s *= -1; // negate
				this.valueStack.push(value);
			}
			else {
				throw this.error('Unable to negate this value type');
			}
		}

		this.getSymbol();
	}

	/**
	 * Returns formated error report.
	 */
	private error(msg: string) {
		let output = `ExpressionEvaluator: ${msg}`;

		if (this.currentExpr != null) {
			let symbolLen = ((this.lastSymbolStr && this.lastSymbolStr.length) || 1);

			output += '\n' + this.currentExpr.replace(/\s+/g, ' ').trim() + '\n';
			output += ' '.repeat(this.lastPos) + '^'.repeat(symbolLen);
		}

		return output;
	}
}
