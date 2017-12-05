import { autoinject, bindable, View } from 'aurelia-framework';
import { Tooltip } from './tooltip';

import ExpressionEvaluator from './lib/ExpressionEvaluator';

@autoinject()
export class App {
	@bindable title: string = 'Smart Form Validator';
	@bindable tooltip: Tooltip;

	@bindable demo_message: string = '...';
	@bindable demo_expression: string = '2090.5 * 8.61';
	@bindable demo_perf: string = '';

	@bindable fieldA_eq: string = 'is(A >= 42)';
	@bindable fieldA_tt: string = 'if(A < 42, A + " is not greater or equal then 42!", "Valid field value: "+ A)';

//---------------------------------------------------------------------------------------
	public ee: ExpressionEvaluator = new ExpressionEvaluator;

	attached() {
		this.demo_expressionChanged(this.demo_expression);
	}

	demo_expressionChanged(newValue: string) {
		try {
			this.demo_message = (<any> this.ee.evaluate(newValue)).toString();
		} catch (e) {
			this.demo_message = `<pre>${e}</pre>`;
		}

		this.demo_perf = performance.getEntriesByName('ExpressionEvaluator')
				.pop().duration.toPrecision(3);
	}
}
