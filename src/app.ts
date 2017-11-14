import { autoinject, View } from 'aurelia-framework';
import ExpressionEvaluator from './lib/ExpressionEvaluator';

@autoinject()
export class App {
	public title: string = 'Smart Form Validator';
	public message: string = '';

	private $exp: ExpressionEvaluator = new ExpressionEvaluator;

	created(owningView: View, myView: View) {
		this.message = (<any> this.$exp.evaluate('2090.5 * 8.61')).toString();

		console.log("evaluation time: ",
			performance.getEntriesByName("ExpressionEvaluator")[0].duration);
	}
}
