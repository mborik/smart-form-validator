import { autoinject, bindable } from 'aurelia-framework';
import { Tooltip } from './tooltip';

import ExpressionEvaluator from './lib/ExpressionEvaluator';

@autoinject()
export class App {
	@bindable title: string = 'Smart Form Validator';
	@bindable tooltip: Tooltip;

	@bindable demo_message: string = '...';
	@bindable demo_expression: string = '2090.5 * 8.61';
	@bindable demo_perf: string = '';

	@bindable fieldA_log: string = 'is(A >= 0)';
	@bindable fieldA_sug: string = '';
	@bindable fieldA_tool: string = 'if(A < 0, "Value couldn\'t be negative", "A = " + A)';
	@bindable fieldA_hint: string = 'Positive number greater then 0';

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

		this.demo_perf = (performance.getEntriesByName('ExpressionEvaluator')
				.pop().duration * 1000).toFixed();
	}

	expandEquation(e: MouseEvent) {
		$(e.currentTarget).toggleClass('active')
			.next().toggleClass('active');
	}
}
