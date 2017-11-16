import { autoinject, bindable, View } from 'aurelia-framework';
import ExpressionEvaluator from './lib/ExpressionEvaluator';

@autoinject()
export class App {
	@bindable title: string = 'Smart Form Validator';
	@bindable message: string = '...';
	@bindable expression: string = '2090.5 * 8.61';
	@bindable perf: string = '';

	private $exp: ExpressionEvaluator = new ExpressionEvaluator;

	created() {
		this.expressionChanged();
	}

	expressionChanged() {
		try {
			this.message = (<any> this.$exp.evaluate(this.expression)).toString();
		} catch (e) {
			this.message = `<pre>${e}</pre>`;
		}

		this.perf = performance.getEntriesByName('ExpressionEvaluator')
				.pop().duration.toPrecision(3);
	}
}
