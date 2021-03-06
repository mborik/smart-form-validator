import { Aurelia } from 'aurelia-framework';

import 'jquery';
import 'semantic-ui';

export function configure(aurelia: Aurelia) {
	aurelia.use
		.standardConfiguration()
		.developmentLogging();

	aurelia.start().then(() => aurelia.setRoot());
}
