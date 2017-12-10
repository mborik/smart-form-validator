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
	symbol?: ExpEvalSymbol;
	lastPos?: number;
	lastSymbol?: string | null;
}
//---------------------------------------------------------------------------------------
export default class ExpressionEvaluator {
	[key: string]: any;

	// stack of values - intermediate data
	private valueStack: ExpEvalMultiType[] = [];
	// stack of (sub)expressions
	private exprStack: ExpEvalExprStackItem[] = [];
	// function names with their symbol codes
	private funcNames: ExpEvalFunction[] = Object.keys(this.__proto__)
		.filter(key => key.indexOf('function_') === 0)
		.map((name, i) => ({
			name: name.substr(9),
			symbol: ExpEvalSymbol.FUNCTION + i,
			handler: <ExpEvalFunctionHandler> this[name].bind(this)
		}), this);

	// map of variables/subexpressions
	private variables: ExpEvalVariable[] = [];

	private currentSymbol: ExpEvalSymbol = ExpEvalSymbol.UNDEFINED;
	private currentExpr: string | null = null;
	private currentPos: number = 0;
	private lastSymbolStr: string | null = null;
	private lastPos: number = 0;

	private checkAll: boolean = true;


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

			if (this.currentSymbol === +ExpEvalSymbol.SEMICOLON) {
				const keeper: ExpEvalStateKeeper = {
					curPos: this.currentPos,
					symbol: this.lastSymbolStr,
					lastPos: this.lastPos
				};

				this.getSymbol();

				if (this.currentSymbol !== +ExpEvalSymbol.EOE) {
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

//---------------------------------------------------------------------------------------
	/**
	 * Returning the string representation of variable.
	 * @param name variable name
	 */
	public getVariable(name: string): string | null {
		if (name != null) {
			let match = this.variables.find(variable => (variable.name === name));
			if (match != null) {
				return match.value.trim();
			}
		}
		return null;
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
		name = name.trim();
		if (!name.length && this.checkAll) {
			throw this.error('Invalid variable name');
		}

		let match = this.variables.find(variable => (variable.name === name));
		if (match != null) {
			match.value = value.trim();
		}
		else {
			this.variables.push({ name: name, value: value.trim() });
		}
	}

//---------------------------------------------------------------------------------------
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
	private getSymbol(): void {
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
					if (/[\d\.]/.test(chr)) {
						let wasPoint = (chr === '.');
						let wasExponent = false;
						this.lastSymbolStr = '' + chr;

						do {
							chr = this.getChar();
							if (!/[\d\.e]/i.test(chr)) {
								break;
							}
							if (chr === '.') {
								if (wasPoint) { // multiple points in number?
									break;
								}
								wasPoint = true;
							}
							else if (chr.toLowerCase() === 'e') {
								if (wasExponent) {
									break;
								}
								wasExponent = true;

								this.lastSymbolStr += chr;
								chr = this.getChar();
								if (!/[\d\+-]/.test(chr)) {
									break;
								}
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
							if (/[\W[\]]/.test(chr)) {
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

//---------------------------------------------------------------------------------------
	/**
	 * Method evaluates EXPR on the current position of the current expression.
	 * Gramatics of the EXPR:
	 * EXPR -> MULT { ( + | - ) MULT }
	 */
	private evaluateExpr(): void {
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
	private evaluateTerm() {
		let neg = false;

		if (this.currentSymbol === +ExpEvalSymbol.MINUS) {
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

				if (this.currentSymbol !== +ExpEvalSymbol.RPAR) {
					throw this.error('Right parenthesis expected');
				}
				break;
			}

			case ExpEvalSymbol.VAR : {
				let varName: string | null = null;
				if (this.lastSymbolStr != null) {
					varName = this.getVariable(this.lastSymbolStr);
				}
				if (!varName) {
					throw this.error('Variable not found');
				}

				this.exprStack.push({
					expr: this.currentExpr,
					pos: this.currentPos
				});

				this.currentExpr = varName;
				this.currentPos = 0;
				this.getSymbol();
				this.evaluateExpr();

				let lastExprObj = this.exprStack.pop();
				if (!lastExprObj) {
					throw this.error('Stack lost');
				}

				this.currentExpr = lastExprObj.expr;
				this.currentPos  = lastExprObj.pos;
				break;
			}

			case ExpEvalSymbol.NUMBER : {
				try {
					this.valueStack.push(new Big(this.lastSymbolStr));
				} catch {
					throw this.error('Invalid number');
				}
				break;
			}

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
	 * Method evaluates LEXP on the current position of the current expression.
	 * Gramatics of the LEXP:
	 * LEXP -> EXPR LOP EXPR
	 * LOP  -> ( ( "=" | "<" | ">" ) [ "=" ] ) | ( "!=" | "<>" )
	 */
	private evaluateLexp() {
		let loop = false;
		let pars = false;

		let exprs: boolean[] = [];
		let logops: ExpEvalSymbol[] = [];

		do {
			loop = false;

			if (this.currentSymbol === ExpEvalSymbol.LPAR) {
				pars = true;
				this.getSymbol();
			}

			this.evaluateExpr();
			if (this.currentSymbol === ExpEvalSymbol.RELATION && this.lastSymbolStr) {
				const sym = this.lastSymbolStr.trim();

				this.getSymbol();
				this.evaluateExpr();

				let o2 = this.valueStack.pop();
				let o1 = this.valueStack.pop();

				let arg1: any;
				let arg2: any = 0;

				try {
					if (o1 instanceof Big && o2 instanceof Big) {
						arg1 = +o1.cmp(o2);
					}
					else if (o1 instanceof String && o2 instanceof String) {
						arg1 = o1.toString();
						arg2 = o2.toString();
					}
					else if (o1 instanceof String && o2 instanceof Big) {
						try {
							arg1 = new Big(o1.toString()).cmp(o2);
						} catch {
							arg1 = NaN;
						}
					}
					else if (o1 instanceof Big && o2 instanceof String) {
						try {
							arg1 = o1.cmp(new Big(o2.toString()));
						} catch {
							arg1 = NaN;
						}
					}
/*
					else if (o1 instanceof Date || o2 instanceof Date) {
						// TODO
						arg1 = moment(o1).isSame(o2); ???
					}
*/
					else {
						throw this.error('Invalid value type');
					}

					exprs.push(this.compareArgs(sym, arg1, arg2));

				} catch (EX) {
					if (this.checkAll) {
						throw EX;
					}
					else {
						exprs.push(false);
					}
				}
			}
			else {
				throw this.error('Logical operator expected');
			}

			if (pars) {
				if (this.currentSymbol === +ExpEvalSymbol.RPAR) {
					this.getSymbol();
					pars = false;
				}
				else {
					throw this.error('Right parenthesis expected');
				}
			}

			if (this.currentSymbol === +ExpEvalSymbol.LOGICAL_AND ||
				this.currentSymbol === +ExpEvalSymbol.LOGICAL_OR) {

				logops.push(this.currentSymbol);
				this.getSymbol();
				loop = true;
			}
		} while (loop);

		let result = exprs.shift() || false;
		logops.findIndex(operator => {
			if ((operator === ExpEvalSymbol.LOGICAL_AND && result) ||
				(operator === ExpEvalSymbol.LOGICAL_OR && !result)) {

				result = exprs.shift() || false;
				return false;
			}

			return true;
		});

		this.valueStack.push(new Big(+result));
	}

	/**
	 * Do the equality comparison of the arguments by the given symbol:
	 * @param symbol "=" | "<" | ">" | ">=" | "<=" | "==" | "!=" | "<>"
	 */
	private compareArgs(symbol: string, arg1: any, arg2: any): boolean {
		// tslint:disable-next-line:triple-equals
		const isEqual = (arg1 == arg2);

		switch (symbol) {
			case '=':
			case '==':
				return isEqual;

			case '!=':
			case '<>':
				return !isEqual;

			case '>=':
				if (isEqual) {
					return isEqual;
				}
			case '>':
				return (arg1 > arg2);

			case '<=':
				if (isEqual) {
					return isEqual;
				}
			case '<':
				return (arg1 < arg2);

			default:
				return false;
		}
	}

//---------------------------------------------------------------------------------------
	/**
	 * Stored function :: var(string, expression)
	 * Assigning expression to variable, creating new if variable not exists.
	 */
	private function_var() {
		this.getSymbol();

		if (this.currentSymbol !== +ExpEvalSymbol.LPAR) {
			throw this.error('Left parenthesis expected');
		}

		this.getSymbol();
		this.evaluateExpr();

		let o1 = this.valueStack.pop();

		let name: string;
		if (o1 instanceof String) {
			name = o1.trim();
			if (!(/^[a-zA-Z]\w*$/.test(name))) {
				throw this.error('Invalid chars in variable');
			}
		}
		else {
			throw this.error('Invalid value type');
		}

		if (this.currentSymbol !== +ExpEvalSymbol.COMMA) {
			throw this.error('Comma expected');
		}

		this.getSymbol();
		this.evaluateExpr();

		let o2 = this.valueStack.pop();

		if (o2 instanceof Big) {
			this.setVariable(name, o2.toString());
		}
		else if (o2 instanceof Date) {
			let dateString = moment(o2).format('L');
			this.setVariable(name, `{${dateString}}`);
		}
		else if (o2 instanceof String) {
			let subExpr = o2.toString();

			this.setVariable(name, subExpr);
			this.exprStack.push({
				symbol: this.currentSymbol,
				expr: this.currentExpr,
				pos: this.currentPos,
				lastPos: this.lastPos,
				lastSymbol: this.lastSymbolStr
			});

			this.currentExpr = subExpr;
			this.currentPos = 0;
			this.getSymbol();
			this.evaluateExpr();

			let lastExprObj = this.exprStack.pop();
			if (!lastExprObj) {
				throw this.error('Stack lost');
			}

			this.currentSymbol = lastExprObj.symbol || ExpEvalSymbol.UNDEFINED;
			this.currentExpr   = lastExprObj.expr;
			this.currentPos    = lastExprObj.pos;
			this.lastPos       = lastExprObj.lastPos || 0;
			this.lastSymbolStr = lastExprObj.lastSymbol || null;

			o2 = this.valueStack.pop();
		}
		else {
			throw this.error('Invalid value type');
		}

		if (this.currentSymbol !== +ExpEvalSymbol.RPAR) {
			throw this.error('Right parenthesis expected');
		}

		return o2;
	}

	/**
	 * Stored function :: is(logical_expression)
	 * Calculate the truth of the logical expression and returns 1 or 0.
	 */
	private function_is() {
		this.getSymbol();

		if (this.currentSymbol !== +ExpEvalSymbol.LPAR) {
			throw this.error('Left parenthesis expected');
		}

		this.getSymbol();
		this.evaluateLexp();

		if (this.currentSymbol !== +ExpEvalSymbol.RPAR) {
			throw this.error('Right parenthesis expected');
		}

		return this.valueStack.pop();
	}

	/**
	 * Stored function :: if(logical_expression, expression, expression)
	 * Calculate the truth of the logical expression and returns first expression
	 * in case of true, second expression if false.
	 */
	private function_if() {
		this.getSymbol();

		if (this.currentSymbol !== +ExpEvalSymbol.LPAR) {
			throw this.error('Left parenthesis expected');
		}

		this.getSymbol();
		this.evaluateLexp();

		if (this.currentSymbol !== +ExpEvalSymbol.COMMA) {
			throw this.error('Comma expected');
		}

		let cp = this.valueStack.pop();
		if (!(cp instanceof Big)) {
			throw this.error('Invalid value of logical expression result');
		}

		let result: boolean = false;
		try {
			result = cp.gt(0);
		}
		catch {
			if (this.checkAll) {
				throw this.error('Logical result expected');
			}
		}

		let backCheck = this.checkAll;

		this.getSymbol();
		this.checkAll = result && backCheck;
		this.evaluateExpr();

		if (this.currentSymbol !== +ExpEvalSymbol.COMMA) {
			throw this.error('Comma expected');
		}

		this.getSymbol();
		this.checkAll = !cp && backCheck;
		this.evaluateExpr();

		this.checkAll = backCheck;

		if (this.currentSymbol !== +ExpEvalSymbol.RPAR) {
			throw this.error('Right parenthesis expected');
		}

		let o2 = this.valueStack.pop();
		let o1 = this.valueStack.pop();

		return result ? o1 : o2;
	}

	/**
	 * Stored function :: round(expression, places, mode)
	 * Rounds the value of expression.
	 * @param mode is positive integer or constant UP, MATH or DOWN.
	 */
	function_round() {
		this.getSymbol();

		if (this.currentSymbol !== +ExpEvalSymbol.LPAR) {
			throw this.error('Left parenthesis expected');
		}

		this.getSymbol();
		this.evaluateExpr();

		let o = this.valueStack.pop();
		if (!(o instanceof Big)) {
			throw this.error('Invalid value type');
		}

		if (this.currentSymbol !== +ExpEvalSymbol.COMMA) {
			throw this.error('Comma expected');
		}

		this.getSymbol();
		if (this.currentSymbol !== +ExpEvalSymbol.NUMBER || this.lastSymbolStr == null) {
			throw this.error('Positive integer expected');
		}

		let dp = parseInt(this.lastSymbolStr);
		if (isNaN(dp)) {
			throw this.error('Positive integer expected');
		}

		this.getSymbol();
		if (this.currentSymbol !== +ExpEvalSymbol.COMMA) {
			throw this.error('Comma expected');
		}

		this.getSymbol();
		if (this.lastSymbolStr == null) {
			throw this.error('Symbol expected');
		}

		let rm: RoundingMode = -1;
		if (this.currentSymbol === ExpEvalSymbol.VAR) {
			switch (this.lastSymbolStr.trim()) {
				case 'UP':
					rm = RoundingMode.RoundUp;
					break;
				case 'MATH':
					rm = RoundingMode.RoundHalfUp;
					break;
				case 'DOWN':
					rm = RoundingMode.RoundDown;
					break;
				default:
					throw this.error('Undefined rounding mode constant');
			}
		}
		else if (this.currentSymbol === ExpEvalSymbol.NUMBER) {
			rm = parseInt(this.lastSymbolStr);
			if (rm < 0 || rm > 3) {
				throw this.error('Invalid rounding mode');
			}
		}
		else {
			throw this.error('Positive integer or predefined constant expected');
		}

		this.getSymbol();
		if (this.currentSymbol !== +ExpEvalSymbol.RPAR) {
			throw this.error('Right parenthesis expected');
		}

		let result: Big = o;
		try {
			result = o.round(dp, rm);
		} catch (e) {
			if (this.checkAll) {
				throw e;
			}
		}

		return result;
	}

	/**
	 * Stored function :: abs(expression)
	 * Calculate absolute value of expression.
	 */
	function_abs() {
		this.getSymbol();

		if (this.currentSymbol !== +ExpEvalSymbol.LPAR) {
			throw this.error('Left parenthesis expected');
		}

		this.getSymbol();
		this.evaluateExpr();

		if (this.currentSymbol !== +ExpEvalSymbol.RPAR) {
			throw this.error('Right parenthesis expected');
		}

		let o = this.valueStack.pop();
		if (!(o instanceof Big)) {
			throw this.error('Invalid value type');
		}

		let result: Big = o;
		try {
			result = o.abs();
		} catch (e) {
			if (this.checkAll) {
				throw e;
			}
		}

		return result;
	}

//---------------------------------------------------------------------------------------
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
