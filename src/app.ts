import { autoinject, bindable, TaskQueue } from 'aurelia-framework';
import { SmartFormElement } from './element';
import { Tooltip } from './tooltip';

import ExpressionEvaluator from './lib/ExpressionEvaluator';

@autoinject
export class App {
	@bindable title: string = 'Smart Form Validator';
	@bindable tooltip: Tooltip;

	@bindable demo_message: string = '...';
	@bindable demo_expression: string = '2090.5 * 8.61';
	@bindable demo_perf: string = '';

	@bindable fieldA: any; // SmartFormElement
	@bindable fieldA_log: string = 'is(A >= 0)';
	@bindable fieldA_sug: string = '';
	@bindable fieldA_tool: string = 'if(A < 0, "Value couldn\'t be negative", "A = " + A)';
	@bindable fieldA_hint: string = 'Positive number greater or equal then 0';

	@bindable fieldB: any; // SmartFormElement
	@bindable fieldB_log: string = 'is(A = 0 or B >= round((0.2 * A), 2, MATH) and B < A)';
	@bindable fieldB_sug: string = 'if(A >= 0, round((0.2 * A), 2, MATH), 0)';
	@bindable fieldB_tool: string = '"20 % of A rounded to 2 digits"';
	@bindable fieldB_hint: string = 'Positive number greater or equal then 0';

	@bindable fieldC: any; // SmartFormElement
	@bindable fieldC_log: string = 'var("Around", round(A, 2, MATH)); var("AsubB", round(A - B, 2, MATH)); if(A > 100, is(C = AsubB), is(C = Around))';
	@bindable fieldC_sug: string = 'if(A > 100, AsubB, Around)';
	@bindable fieldC_tool: string = '"Value of A rounded to 2 digits, but if A > 100 then value of A will be discounted by B"';
	@bindable fieldC_hint: string = 'Positive number greater or equal then 0';

//---------------------------------------------------------------------------------------
	public ee: ExpressionEvaluator = new ExpressionEvaluator;

	constructor(private $q: TaskQueue) {}

	attached() {
		this.$q.queueMicroTask(() => this.demo_expressionChanged(this.demo_expression));
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
