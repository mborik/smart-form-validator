import { Aurelia } from 'aurelia-framework';
import 'jquery';

export function configure(aurelia: Aurelia) {
	aurelia.use
		.standardConfiguration()
		.developmentLogging();

	aurelia.start().then(() => aurelia.setRoot());
}
