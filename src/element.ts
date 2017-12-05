import { bindable, autoinject, customAttribute } from 'aurelia-framework';
import { App } from './app';
import { Big } from 'big.js';

@autoinject
export class SmartFormElement {
	@bindable id: string;
	@bindable label: string;
	@bindable value: string = '';

	@bindable eqValid: string;
	@bindable eqTooltip: string;

	private syntaxValidator = /^\-?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;

	constructor(private $el: Element, private $app: App) {}

	valueChanged(newValue: string) {
		this.updateTooltip(newValue);
	}

	updateTooltip(value: string) {
		const ee = this.$app.ee;
		const tt = this.$app.tooltip;

		if (value === '') {
			value = '0';
		}

		const validSyntax = this.syntaxValidator.test(value);

		ee.setVariable(this.id, validSyntax ? value : '0');

		let result: boolean = false;
		let message: string = (ee.evaluate(this.eqTooltip) || '').toString();

		if (validSyntax) {
			let resval = ee.evaluate(this.eqValid);
			result = (resval instanceof Big && resval.gt(0));
		}

		tt.type = result && validSyntax ? 'positive' : 'negative';
		tt.icon = validSyntax ? (result ? '' : 'warning') : 'remove';
		tt.title = validSyntax ? (result ? '' : 'Validation error!') : 'Syntax error!';
		tt.message = message;
	}
}
