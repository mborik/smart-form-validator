import { bindable, autoinject, customAttribute } from 'aurelia-framework';
import { App } from './app';
import { Big } from 'big.js';

@autoinject
export class SmartFormElement {
	@bindable id: string;
	@bindable label: string;
	@bindable value: string = '';

	@bindable eqLogic: string;
	@bindable eqSuggest: string;
	@bindable eqTooltip: string;
	@bindable eqHint: string;
	@bindable eqDeps: SmartFormElement[] = [];

	private syntaxValidator = /^\-?[0-9]*[\.,]?([0-9]+|([0-9]+[eE][-+]?[0-9]+))?$/;

	constructor(private $el: Element, private $app: App) {}
	private attached() { this.update(); }


	public update(updateTooltip?: boolean) {
		this.updateField(this.value, updateTooltip);
	}

	private valueChanged(newValue: string) {
		this.updateField(newValue, true);
		this.eqDeps.forEach(sfel => sfel.update());
	}

	private updateVariable(value: string): boolean {
		if (value === '') {
			value = '0';
		}

		const valid = this.syntaxValidator.test(value);
		this.$app.ee.setVariable(this.id, valid ? value : '0');

		return valid;
	}

	private updateField(value: string, updateTooltip?: boolean) {
		let validSyntax = this.updateVariable(value);
		let validLogic: boolean = false;

		if (validSyntax) {
			let resval = this.$app.ee.evaluate(this.eqLogic);
			validLogic = (resval instanceof Big && resval.gt(0));
		}

		$(this.$el).toggleClass('error', !validSyntax)
			.children('input')
			.toggleClass('invalid', validSyntax && !validLogic);

		if (updateTooltip) {
			this.updateTooltip(validSyntax, validLogic);
		}
	}

	private updateTooltip(validSyntax: boolean, validLogic: boolean) {
		const ee = this.$app.ee;
		const tt = this.$app.tooltip;

		let message: string = '';
		let suggest: string = '';

		try {
			let result = (this.eqTooltip && ee.evaluate(this.eqTooltip)) || '';
			message = result.toString();
		} catch {}

		try {
			let result = (this.eqSuggest && ee.evaluate(this.eqSuggest)) || '';
			suggest = result.toString();
		} catch {}

		tt.type = validLogic && validSyntax ? 'positive' : 'negative';
		tt.icon = validSyntax ? (validLogic ? '' : 'warning') : 'remove';
		tt.title = validSyntax ? (validLogic ? '' : 'Validation error') : 'Syntax error!';
		tt.equation = validSyntax ? suggest : '';
		tt.message = validSyntax ? message : '';
		tt.hint = validSyntax ? this.eqHint : '';
	}
}
